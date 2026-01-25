/**
 * Feed subscription storage operations
 * @module storage/feeds
 */

import { ObjectId } from "mongodb";

/**
 * Get feeds collection from application
 * @param {object} application - Indiekit application
 * @returns {object} MongoDB collection
 */
function getCollection(application) {
  return application.collections.get("microsub_feeds");
}

/**
 * Create a new feed subscription
 * @param {object} application - Indiekit application
 * @param {object} data - Feed data
 * @param {ObjectId} data.channelId - Channel ObjectId
 * @param {string} data.url - Feed URL
 * @param {string} [data.title] - Feed title
 * @param {string} [data.photo] - Feed icon URL
 * @returns {Promise<object>} Created feed
 */
export async function createFeed(
  application,
  { channelId, url, title, photo },
) {
  const collection = getCollection(application);

  // Check if feed already exists in channel
  const existing = await collection.findOne({ channelId, url });
  if (existing) {
    return existing;
  }

  const feed = {
    channelId,
    url,
    title: title || undefined,
    photo: photo || undefined,
    tier: 1, // Start at tier 1 (2 minutes)
    unmodified: 0,
    nextFetchAt: new Date(), // Fetch immediately
    lastFetchedAt: undefined,
    websub: undefined, // Will be populated if hub is discovered
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(feed);
  return feed;
}

/**
 * Get all feeds for a channel
 * @param {object} application - Indiekit application
 * @param {ObjectId|string} channelId - Channel ObjectId
 * @returns {Promise<Array>} Array of feeds
 */
export async function getFeedsForChannel(application, channelId) {
  const collection = getCollection(application);
  const objectId =
    typeof channelId === "string" ? new ObjectId(channelId) : channelId;

  return collection.find({ channelId: objectId }).toArray();
}

/**
 * Get a feed by URL and channel
 * @param {object} application - Indiekit application
 * @param {ObjectId|string} channelId - Channel ObjectId
 * @param {string} url - Feed URL
 * @returns {Promise<object|null>} Feed or null
 */
export async function getFeedByUrl(application, channelId, url) {
  const collection = getCollection(application);
  const objectId =
    typeof channelId === "string" ? new ObjectId(channelId) : channelId;

  return collection.findOne({ channelId: objectId, url });
}

/**
 * Get a feed by ID
 * @param {object} application - Indiekit application
 * @param {ObjectId|string} id - Feed ObjectId
 * @returns {Promise<object|null>} Feed or null
 */
export async function getFeedById(application, id) {
  const collection = getCollection(application);
  const objectId = typeof id === "string" ? new ObjectId(id) : id;

  return collection.findOne({ _id: objectId });
}

/**
 * Update a feed
 * @param {object} application - Indiekit application
 * @param {ObjectId|string} id - Feed ObjectId
 * @param {object} updates - Fields to update
 * @returns {Promise<object|null>} Updated feed
 */
export async function updateFeed(application, id, updates) {
  const collection = getCollection(application);
  const objectId = typeof id === "string" ? new ObjectId(id) : id;

  const result = await collection.findOneAndUpdate(
    { _id: objectId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return result;
}

/**
 * Delete a feed subscription
 * @param {object} application - Indiekit application
 * @param {ObjectId|string} channelId - Channel ObjectId
 * @param {string} url - Feed URL
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteFeed(application, channelId, url) {
  const collection = getCollection(application);
  const objectId =
    typeof channelId === "string" ? new ObjectId(channelId) : channelId;

  const result = await collection.deleteOne({ channelId: objectId, url });
  return result.deletedCount > 0;
}

/**
 * Delete all feeds for a channel
 * @param {object} application - Indiekit application
 * @param {ObjectId|string} channelId - Channel ObjectId
 * @returns {Promise<number>} Number of deleted feeds
 */
export async function deleteFeedsForChannel(application, channelId) {
  const collection = getCollection(application);
  const objectId =
    typeof channelId === "string" ? new ObjectId(channelId) : channelId;

  const result = await collection.deleteMany({ channelId: objectId });
  return result.deletedCount;
}

/**
 * Get feeds ready for polling
 * @param {object} application - Indiekit application
 * @returns {Promise<Array>} Array of feeds to fetch
 */
export async function getFeedsToFetch(application) {
  const collection = getCollection(application);
  const now = new Date();

  return collection
    .find({
      $or: [{ nextFetchAt: undefined }, { nextFetchAt: { $lte: now } }],
    })
    .toArray();
}

/**
 * Update feed after fetch
 * @param {object} application - Indiekit application
 * @param {ObjectId|string} id - Feed ObjectId
 * @param {boolean} changed - Whether content changed
 * @returns {Promise<object|null>} Updated feed
 */
export async function updateFeedAfterFetch(application, id, changed) {
  const collection = getCollection(application);
  const objectId = typeof id === "string" ? new ObjectId(id) : id;

  // Get current feed state
  const feed = await collection.findOne({ _id: objectId });
  if (!feed) return;

  let tier = feed.tier;
  let unmodified = feed.unmodified;

  if (changed) {
    // Content changed - decrease tier (more frequent polling)
    tier = Math.max(0, tier - 1);
    unmodified = 0;
  } else {
    // No change - increment unmodified counter
    unmodified++;
    if (unmodified >= 2) {
      // Two consecutive unchanged fetches - increase tier (less frequent)
      tier = Math.min(10, tier + 1);
      unmodified = 0;
    }
  }

  // Calculate next fetch time: 2^tier minutes
  const minutes = Math.ceil(Math.pow(2, tier));
  const nextFetchAt = new Date(Date.now() + minutes * 60 * 1000);

  return collection.findOneAndUpdate(
    { _id: objectId },
    {
      $set: {
        tier,
        unmodified,
        nextFetchAt,
        lastFetchedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
}

/**
 * Update feed WebSub subscription
 * @param {object} application - Indiekit application
 * @param {ObjectId|string} id - Feed ObjectId
 * @param {object} websub - WebSub data
 * @param {string} websub.hub - Hub URL
 * @param {string} websub.secret - Subscription secret
 * @param {number} websub.leaseSeconds - Lease duration
 * @returns {Promise<object|null>} Updated feed
 */
export async function updateFeedWebsub(application, id, websub) {
  const collection = getCollection(application);
  const objectId = typeof id === "string" ? new ObjectId(id) : id;

  const expiresAt = new Date(Date.now() + websub.leaseSeconds * 1000);

  return collection.findOneAndUpdate(
    { _id: objectId },
    {
      $set: {
        websub: {
          hub: websub.hub,
          secret: websub.secret,
          leaseSeconds: websub.leaseSeconds,
          expiresAt,
        },
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
}

/**
 * Get feed by WebSub subscription ID
 * Used for WebSub callback handling
 * @param {object} application - Indiekit application
 * @param {string} subscriptionId - Subscription ID (feed ObjectId as string)
 * @returns {Promise<object|null>} Feed or null
 */
export async function getFeedBySubscriptionId(application, subscriptionId) {
  return getFeedById(application, subscriptionId);
}
