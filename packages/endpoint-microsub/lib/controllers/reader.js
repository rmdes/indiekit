/**
 * Reader UI controller
 * @module controllers/reader
 */

import {
  getChannels,
  getChannel,
  createChannel,
  updateChannelSettings,
} from "../storage/channels.js";
import { getTimelineItems, getItemById } from "../storage/items.js";
import {
  validateChannelName,
  validateExcludeTypes,
  validateExcludeRegex,
} from "../utils/validation.js";

/**
 * Reader index - redirect to channels
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function index(request, response) {
  response.redirect(`${request.baseUrl}/channels`);
}

/**
 * List channels
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function channels(request, response) {
  const { application } = request.app.locals;
  const userId = request.session?.userId;

  const channelList = await getChannels(application, userId);

  response.render("reader", {
    title: request.__("microsub.reader.title"),
    channels: channelList,
    baseUrl: request.baseUrl,
  });
}

/**
 * New channel form
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function newChannel(request, response) {
  response.render("channel-new", {
    title: request.__("microsub.channels.new"),
    baseUrl: request.baseUrl,
  });
}

/**
 * Create channel
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function createChannelAction(request, response) {
  const { application } = request.app.locals;
  const userId = request.session?.userId;
  const { name } = request.body;

  validateChannelName(name);

  await createChannel(application, { name, userId });

  response.redirect(`${request.baseUrl}/channels`);
}

/**
 * View channel timeline
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function channel(request, response) {
  const { application } = request.app.locals;
  const userId = request.session?.userId;
  const { uid } = request.params;
  const { before, after } = request.query;

  const channelDocument = await getChannel(application, uid, userId);
  if (!channelDocument) {
    return response.status(404).render("404");
  }

  const timeline = await getTimelineItems(application, channelDocument._id, {
    before,
    after,
    userId,
  });

  response.render("channel", {
    title: channelDocument.name,
    channel: channelDocument,
    items: timeline.items,
    paging: timeline.paging,
    baseUrl: request.baseUrl,
  });
}

/**
 * Channel settings form
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function settings(request, response) {
  const { application } = request.app.locals;
  const userId = request.session?.userId;
  const { uid } = request.params;

  const channelDocument = await getChannel(application, uid, userId);
  if (!channelDocument) {
    return response.status(404).render("404");
  }

  response.render("settings", {
    title: request.__("microsub.settings.title", {
      channel: channelDocument.name,
    }),
    channel: channelDocument,
    baseUrl: request.baseUrl,
  });
}

/**
 * Update channel settings
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function updateSettings(request, response) {
  const { application } = request.app.locals;
  const userId = request.session?.userId;
  const { uid } = request.params;
  const { excludeTypes, excludeRegex } = request.body;

  const channelDocument = await getChannel(application, uid, userId);
  if (!channelDocument) {
    return response.status(404).render("404");
  }

  const validatedTypes = validateExcludeTypes(
    Array.isArray(excludeTypes) ? excludeTypes : [excludeTypes].filter(Boolean),
  );
  const validatedRegex = validateExcludeRegex(excludeRegex);

  await updateChannelSettings(
    application,
    uid,
    {
      excludeTypes: validatedTypes,
      excludeRegex: validatedRegex,
    },
    userId,
  );

  response.redirect(`${request.baseUrl}/channels/${uid}`);
}

/**
 * View single item
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function item(request, response) {
  const { application } = request.app.locals;
  const userId = request.session?.userId;
  const { id } = request.params;

  const itemDocument = await getItemById(application, id, userId);
  if (!itemDocument) {
    return response.status(404).render("404");
  }

  response.render("item", {
    title: itemDocument.name || "Item",
    item: itemDocument,
    baseUrl: request.baseUrl,
  });
}

/**
 * Compose response form
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function compose(request, response) {
  const { replyTo, likeOf, repostOf } = request.query;

  response.render("compose", {
    title: request.__("microsub.compose.title"),
    replyTo,
    likeOf,
    repostOf,
    baseUrl: request.baseUrl,
  });
}

/**
 * Submit composed response
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
export async function submitCompose(request, response) {
  // TODO: Submit via Micropub
  response.redirect(`${request.baseUrl}/channels`);
}

export const readerController = {
  index,
  channels,
  newChannel,
  createChannel: createChannelAction,
  channel,
  settings,
  updateSettings,
  item,
  compose,
  submitCompose,
};
