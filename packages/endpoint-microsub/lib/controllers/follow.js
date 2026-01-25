/**
 * Follow/unfollow controller
 * @module controllers/follow
 */

import { IndiekitError } from "@indiekit/error";

import { refreshFeedNow } from "../polling/scheduler.js";
import { getChannel } from "../storage/channels.js";
import {
  createFeed,
  deleteFeed,
  getFeedsForChannel,
} from "../storage/feeds.js";
import { createFeedResponse } from "../utils/jf2.js";
import { validateChannel, validateUrl } from "../utils/validation.js";

/**
 * List followed feeds for a channel
 * GET ?action=follow&channel=<uid>
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function list(request, response) {
  const { application } = request.app.locals;
  const userId = request.session?.userId;
  const { channel } = request.query;

  validateChannel(channel);

  const channelDocument = await getChannel(application, channel, userId);
  if (!channelDocument) {
    throw new IndiekitError("Channel not found", { status: 404 });
  }

  const feeds = await getFeedsForChannel(application, channelDocument._id);
  const items = feeds.map((feed) => createFeedResponse(feed));

  response.json({ items });
}

/**
 * Follow a feed URL
 * POST ?action=follow
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function follow(request, response) {
  const { application } = request.app.locals;
  const userId = request.session?.userId;
  const { channel, url } = request.body;

  validateChannel(channel);
  validateUrl(url);

  const channelDocument = await getChannel(application, channel, userId);
  if (!channelDocument) {
    throw new IndiekitError("Channel not found", { status: 404 });
  }

  // Create feed subscription
  const feed = await createFeed(application, {
    channelId: channelDocument._id,
    url,
    title: undefined, // Will be populated on first fetch
    photo: undefined,
  });

  // Trigger immediate fetch in background (don't await)
  refreshFeedNow(application, feed._id).catch((error) => {
    console.error(`[Microsub] Error fetching new feed ${url}:`, error.message);
  });

  // TODO: Attempt WebSub subscription

  response.status(201).json(createFeedResponse(feed));
}

/**
 * Unfollow a feed URL
 * POST ?action=unfollow
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function unfollow(request, response) {
  const { application } = request.app.locals;
  const userId = request.session?.userId;
  const { channel, url } = request.body;

  validateChannel(channel);
  validateUrl(url);

  const channelDocument = await getChannel(application, channel, userId);
  if (!channelDocument) {
    throw new IndiekitError("Channel not found", { status: 404 });
  }

  const deleted = await deleteFeed(application, channelDocument._id, url);
  if (!deleted) {
    throw new IndiekitError("Feed not found", { status: 404 });
  }

  // TODO: Cancel WebSub subscription if active

  response.json({ result: "ok" });
}

export const followController = { list, follow, unfollow };
