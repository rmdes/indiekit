/**
 * Search controller
 * @module controllers/search
 */

import { IndiekitError } from "@indiekit/error";

import { getChannel } from "../storage/channels.js";
import { searchItems } from "../storage/items.js";
import { validateChannel } from "../utils/validation.js";

/**
 * Discover feeds from a URL
 * GET ?action=search&query=<url>
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function discover(request, response) {
  const { query } = request.query;

  if (!query) {
    throw new IndiekitError("Missing required parameter: query", {
      status: 400,
    });
  }

  // TODO: Implement feed discovery
  // - Fetch URL
  // - Look for rel=alternate links
  // - Parse for h-feed
  // - Return array of discovered feeds

  response.json({ results: [] });
}

/**
 * Search feeds or items
 * POST ?action=search
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function search(request, response) {
  const { application } = request.app.locals;
  const userId = request.session?.userId;
  const { query, channel } = request.body;

  if (!query) {
    throw new IndiekitError("Missing required parameter: query", {
      status: 400,
    });
  }

  // If channel is provided, search within channel items
  if (channel) {
    validateChannel(channel);

    const channelDocument = await getChannel(application, channel, userId);
    if (!channelDocument) {
      throw new IndiekitError("Channel not found", { status: 404 });
    }

    const items = await searchItems(application, channelDocument._id, query);
    return response.json({ items });
  }

  // Otherwise, treat as feed discovery
  // TODO: Implement feed discovery
  response.json({ results: [] });
}

export const searchController = { discover, search };
