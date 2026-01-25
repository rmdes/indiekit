/**
 * WebSub callback handler
 * @module websub/handler
 */

import { getFeedBySubscriptionId } from "../storage/feeds.js";

/**
 * Verify WebSub subscription
 * GET /microsub/websub/:id
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function verify(request, response) {
  const { id } = request.params;
  const { "hub.topic": topic, "hub.challenge": challenge } = request.query;
  // hub.mode and hub.lease_seconds are part of the WebSub protocol but not used here

  if (!challenge) {
    return response.status(400).send("Missing hub.challenge");
  }

  const { application } = request.app.locals;
  const feed = await getFeedBySubscriptionId(application, id);

  if (!feed) {
    return response.status(404).send("Subscription not found");
  }

  // Verify topic matches
  if (topic !== feed.url) {
    return response.status(400).send("Topic mismatch");
  }

  // TODO: Update lease seconds if provided
  // if (leaseSeconds) {
  //   await updateFeedWebsub(application, id, { leaseSeconds: Number.parseInt(leaseSeconds, 10) });
  // }

  // Return challenge to verify subscription
  response.type("text/plain").send(challenge);
}

/**
 * Receive WebSub notification
 * POST /microsub/websub/:id
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function receive(request, response) {
  const { id } = request.params;
  const { application } = request.app.locals;

  const feed = await getFeedBySubscriptionId(application, id);
  if (!feed) {
    return response.status(404).send("Subscription not found");
  }

  // TODO: Verify X-Hub-Signature
  // const signature = request.headers["x-hub-signature"];
  // if (!verifySignature(signature, request.body, feed.websub.secret)) {
  //   return response.status(400).send("Invalid signature");
  // }

  // TODO: Process pushed content
  // await processContent(application, feed, request.headers["content-type"], request.body);

  response.status(200).send("OK");
}

export const websubHandler = { verify, receive };
