/**
 * Webmention receiver
 * @module webmention/receiver
 */

import { ensureNotificationsChannel } from "../storage/channels.js";

/**
 * Receive a webmention
 * POST /microsub/webmention
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function receive(request, response) {
  const { source, target } = request.body;

  if (!source || !target) {
    return response.status(400).json({
      error: "invalid_request",
      error_description: "Missing source or target parameter",
    });
  }

  // Validate URLs
  try {
    new URL(source);
    new URL(target);
  } catch {
    return response.status(400).json({
      error: "invalid_request",
      error_description: "Invalid source or target URL",
    });
  }

  // TODO: Queue for async verification
  // For now, accept and queue
  const { application } = request.app.locals;

  // Ensure notifications channel exists
  await ensureNotificationsChannel(application);

  // TODO: Verify webmention asynchronously
  // - Fetch source URL
  // - Check for link to target
  // - Parse author, content, type
  // - Add to notifications channel

  // Return 202 Accepted (processing asynchronously)
  response.status(202).json({
    status: "accepted",
    message: "Webmention queued for processing",
  });
}

export const webmentionReceiver = { receive };
