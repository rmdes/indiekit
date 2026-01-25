/**
 * Preview controller
 * @module controllers/preview
 */

import { validateUrl } from "../utils/validation.js";

/**
 * Preview a feed URL (GET)
 * GET ?action=preview&url=<feed>
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function get(request, response) {
  const { url } = request.query;

  validateUrl(url);

  // TODO: Implement feed preview
  // - Fetch URL
  // - Parse feed
  // - Return sample items without storing

  response.json({ items: [] });
}

/**
 * Preview a feed URL (POST)
 * POST ?action=preview
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function preview(request, response) {
  const { url } = request.body;

  validateUrl(url);

  // TODO: Implement feed preview
  // - Fetch URL
  // - Parse feed
  // - Return sample items without storing

  response.json({ items: [] });
}

export const previewController = { get, preview };
