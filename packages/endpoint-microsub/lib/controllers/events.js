/**
 * Server-Sent Events controller
 * @module controllers/events
 */

/**
 * SSE stream endpoint
 * GET ?action=events
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function stream(request, response) {
  // Set SSE headers
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  // Send initial event
  sendEvent(response, "started", { version: "1.0.0" });

  // Set up ping interval
  const pingInterval = setInterval(() => {
    sendEvent(response, "ping", { timestamp: new Date().toISOString() });
  }, 10_000);

  // TODO: Subscribe to Redis pub/sub for real-time events
  // const broker = getBroker(application);
  // broker.addClient(response, request.session?.userId);

  // Handle client disconnect
  request.on("close", () => {
    clearInterval(pingInterval);
    // broker.removeClient(response);
  });
}

/**
 * Send an SSE event
 * @param {object} response - Express response
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
function sendEvent(response, event, data) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

export const eventsController = { stream };
