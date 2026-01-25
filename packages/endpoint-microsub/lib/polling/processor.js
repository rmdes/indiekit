/**
 * Feed processing pipeline
 * @module polling/processor
 */

import { getRedisClient, publishEvent } from "../cache/redis.js";
import { fetchAndParseFeed } from "../feeds/fetcher.js";
import { getChannel } from "../storage/channels.js";
import { updateFeedAfterFetch, updateFeedWebsub } from "../storage/feeds.js";
import { addItem } from "../storage/items.js";

import { calculateNewTier } from "./tier.js";

/**
 * Process a single feed
 * @param {object} application - Indiekit application
 * @param {object} feed - Feed document from database
 * @returns {Promise<object>} Processing result
 */
export async function processFeed(application, feed) {
  const startTime = Date.now();
  const result = {
    feedId: feed._id,
    url: feed.url,
    success: false,
    itemsAdded: 0,
    error: undefined,
  };

  try {
    // Get Redis client for caching
    const redis = getRedisClient(application);

    // Fetch and parse the feed
    const parsed = await fetchAndParseFeed(feed.url, {
      etag: feed.etag,
      lastModified: feed.lastModified,
      redis,
    });

    // Handle 304 Not Modified
    if (parsed.notModified) {
      const tierResult = calculateNewTier({
        currentTier: feed.tier,
        hasNewItems: false,
        consecutiveUnchanged: feed.unmodified || 0,
      });

      await updateFeedAfterFetch(application, feed._id, false, {
        tier: tierResult.tier,
        unmodified: tierResult.consecutiveUnchanged,
        nextFetchAt: tierResult.nextFetchAt,
      });

      result.success = true;
      result.notModified = true;
      return result;
    }

    // Get channel for filtering
    const channel = await getChannel(application, feed.channelId);

    // Process items
    let newItemCount = 0;
    for (const item of parsed.items) {
      // Apply channel filters
      if (channel?.settings && !passesFilters(item, channel.settings)) {
        continue;
      }

      // Store the item
      const stored = await addItem(application, {
        channelId: feed.channelId,
        feedId: feed._id,
        uid: item.uid,
        item,
      });
      if (stored) {
        newItemCount++;

        // Publish real-time event
        if (redis) {
          await publishEvent(redis, `microsub:${feed.channelId}`, {
            type: "new-item",
            channelId: feed.channelId.toString(),
            item: stored,
          });
        }
      }
    }

    result.itemsAdded = newItemCount;

    // Update tier based on whether we found new items
    const tierResult = calculateNewTier({
      currentTier: feed.tier,
      hasNewItems: newItemCount > 0,
      consecutiveUnchanged: newItemCount > 0 ? 0 : feed.unmodified || 0,
    });

    // Update feed metadata
    const updateData = {
      tier: tierResult.tier,
      unmodified: tierResult.consecutiveUnchanged,
      nextFetchAt: tierResult.nextFetchAt,
      etag: parsed.etag,
      lastModified: parsed.lastModified,
    };

    // Update feed title/photo if discovered
    if (parsed.name && !feed.title) {
      updateData.title = parsed.name;
    }
    if (parsed.photo && !feed.photo) {
      updateData.photo = parsed.photo;
    }

    await updateFeedAfterFetch(
      application,
      feed._id,
      newItemCount > 0,
      updateData,
    );

    // Handle WebSub hub discovery
    if (parsed.hub && (!feed.websub || feed.websub.hub !== parsed.hub)) {
      await updateFeedWebsub(application, feed._id, {
        hub: parsed.hub,
        topic: parsed.self || feed.url,
      });
      // TODO: Subscribe to hub
    }

    result.success = true;
    result.tier = tierResult.tier;
  } catch (error) {
    result.error = error.message;

    // Still update the feed to prevent retry storms
    try {
      const tierResult = calculateNewTier({
        currentTier: feed.tier,
        hasNewItems: false,
        consecutiveUnchanged: (feed.unmodified || 0) + 1,
      });

      await updateFeedAfterFetch(application, feed._id, false, {
        tier: Math.min(tierResult.tier + 1, 10), // Increase tier on error
        unmodified: tierResult.consecutiveUnchanged,
        nextFetchAt: tierResult.nextFetchAt,
        lastError: error.message,
        lastErrorAt: new Date(),
      });
    } catch {
      // Ignore update errors
    }
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Check if an item passes channel filters
 * @param {object} item - Feed item
 * @param {object} settings - Channel settings
 * @returns {boolean} Whether the item passes filters
 */
function passesFilters(item, settings) {
  // Exclude by interaction type
  if (settings.excludeTypes && settings.excludeTypes.length > 0) {
    const itemType = detectInteractionType(item);
    if (settings.excludeTypes.includes(itemType)) {
      return false;
    }
  }

  // Exclude by regex pattern
  if (settings.excludeRegex) {
    try {
      const regex = new RegExp(settings.excludeRegex, "i");
      const searchText = [
        item.name,
        item.summary,
        item.content?.text,
        item.content?.html,
      ]
        .filter(Boolean)
        .join(" ");

      if (regex.test(searchText)) {
        return false;
      }
    } catch {
      // Invalid regex, skip filter
    }
  }

  return true;
}

/**
 * Detect the interaction type of an item
 * @param {object} item - Feed item
 * @returns {string} Interaction type
 */
function detectInteractionType(item) {
  if (item["like-of"] && item["like-of"].length > 0) {
    return "like";
  }
  if (item["repost-of"] && item["repost-of"].length > 0) {
    return "repost";
  }
  if (item["bookmark-of"] && item["bookmark-of"].length > 0) {
    return "bookmark";
  }
  if (item["in-reply-to"] && item["in-reply-to"].length > 0) {
    return "reply";
  }
  if (item.rsvp) {
    return "rsvp";
  }
  if (item.checkin) {
    return "checkin";
  }

  return "post";
}

/**
 * Process multiple feeds in batch
 * @param {object} application - Indiekit application
 * @param {Array} feeds - Array of feed documents
 * @param {object} options - Processing options
 * @returns {Promise<object>} Batch processing result
 */
export async function processFeedBatch(application, feeds, options = {}) {
  const { concurrency = 5 } = options;
  const results = [];

  // Process in batches with limited concurrency
  for (let index = 0; index < feeds.length; index += concurrency) {
    const batch = feeds.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map((feed) => processFeed(application, feed)),
    );
    results.push(...batchResults);
  }

  return {
    total: feeds.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    itemsAdded: results.reduce((sum, r) => sum + r.itemsAdded, 0),
    results,
  };
}
