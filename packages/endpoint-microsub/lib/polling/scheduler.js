/**
 * Feed polling scheduler
 * @module polling/scheduler
 */

import { getFeedsToFetch, updateFeedAfterFetch } from "../storage/feeds.js";

let schedulerInterval;
let indiekitInstance;

/**
 * Start the feed polling scheduler
 * @param {object} Indiekit - Indiekit instance
 */
export function startScheduler(Indiekit) {
  if (schedulerInterval) {
    return; // Already running
  }

  indiekitInstance = Indiekit;

  // Run every minute
  schedulerInterval = setInterval(async () => {
    await refreshFeeds();
  }, 60 * 1000);

  // Run immediately on start
  refreshFeeds();
}

/**
 * Stop the feed polling scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = undefined;
  }
  indiekitInstance = undefined;
}

/**
 * Refresh all feeds that are due for fetching
 */
async function refreshFeeds() {
  if (!indiekitInstance) {
    return;
  }

  try {
    const application = indiekitInstance;
    const feeds = await getFeedsToFetch(application);

    for (const feed of feeds) {
      try {
        await refreshFeed(application, feed);
      } catch (error) {
        console.error(`Error refreshing feed ${feed.url}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Error in feed scheduler:", error.message);
  }
}

/**
 * Refresh a single feed
 * @param {object} application - Indiekit application
 * @param {object} feed - Feed to refresh
 */
async function refreshFeed(application, feed) {
  // TODO: Implement full feed fetching and processing
  // 1. Fetch feed URL with caching
  // 2. Parse feed (RSS, Atom, JSON Feed, h-feed)
  // 3. Normalize to jf2 items
  // 4. Apply channel filters
  // 5. Store new items
  // 6. Update feed tier based on changes
  // 7. Broadcast SSE events for new items

  // For now, just mark as fetched with no changes
  await updateFeedAfterFetch(application, feed._id, false);
}
