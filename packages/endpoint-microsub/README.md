# @indiekit/endpoint-microsub

Microsub endpoint for Indiekit. Enables subscribing to feeds and reading content using the [Microsub protocol](https://indieweb.org/Microsub).

## Features

- **Full Microsub API** - Channels, timeline, follow/unfollow, search, preview, mute, block
- **Multiple feed formats** - RSS 1.0/2.0, Atom, JSON Feed, h-feed (Microformats)
- **External client support** - Works with Monocle, Together, IndiePass
- **Built-in reader UI** - Social reading experience in Indiekit admin
- **Real-time updates** - Server-Sent Events (SSE) and WebSub integration
- **Adaptive polling** - Tier-based feed fetching inspired by Ekster
- **Direct webmention receiving** - Notifications channel for mentions

## Installation

`npm install @indiekit/endpoint-microsub`

## Usage

Add `@indiekit/endpoint-microsub` to the list of plugins in your configuration:

```js
export default {
  plugins: ["@indiekit/endpoint-microsub"],
};
```

## Options

| Option       | Type     | Description                                                      |
| :----------- | :------- | :--------------------------------------------------------------- |
| `mountPath`  | `string` | Path to mount Microsub API. _Optional_, defaults to `/microsub`. |
| `readerPath` | `string` | Path to mount reader UI. _Optional_, defaults to `/reader`.      |

## Endpoints

### Microsub API

The main Microsub endpoint is mounted at `/microsub` (configurable).

**Discovery**: Add this to your site's `<head>`:

```html
<link rel="microsub" href="https://yoursite.com/microsub" />
```

### Supported actions

| Action     | GET | POST | Description                                    |
| :--------- | :-- | :--- | :--------------------------------------------- |
| `channels` | ✓   | ✓    | List, create, update, delete, reorder channels |
| `timeline` | ✓   | ✓    | Get timeline, mark read/unread, remove items   |
| `follow`   | ✓   | ✓    | List followed feeds, subscribe to new feeds    |
| `unfollow` | -   | ✓    | Unsubscribe from feeds                         |
| `search`   | ✓   | ✓    | Feed discovery and full-text search            |
| `preview`  | ✓   | ✓    | Preview feed before subscribing                |
| `mute`     | ✓   | ✓    | List muted URLs, mute/unmute                   |
| `block`    | ✓   | ✓    | List blocked URLs, block/unblock               |
| `events`   | ✓   | -    | Server-Sent Events stream                      |

### Reader UI

The built-in reader is mounted at `/reader` (configurable) and provides:

- Channel list with unread counts
- Timeline view with items
- Mark as read on scroll/click
- Like/reply/repost via Micropub
- Channel settings (filters)
- Compose modal

### WebSub callbacks

WebSub hub callbacks are handled at `/microsub/websub/:id`.

### Webmention receiving

Direct webmentions can be sent to `/microsub/webmention`.

## MongoDB Collections

This plugin creates the following collections:

- `microsub_channels` - User's feed channels
- `microsub_feeds` - Subscribed feeds
- `microsub_items` - Timeline entries
- `microsub_notifications` - Webmention notifications
- `microsub_muted` - Muted URLs
- `microsub_blocked` - Blocked URLs

## Dependencies

- **feedparser** - RSS/Atom parsing
- **microformats-parser** - h-feed parsing
- **ioredis** - Redis client (optional, for caching/pub-sub)
- **sanitize-html** - XSS prevention

## External Clients

This endpoint is compatible with:

- [Monocle](https://monocle.p3k.io/) - Web-based reader
- [Together](https://together.tpxl.io/) - Web-based reader
- [IndiePass](https://indiepass.app/) - Mobile/desktop app (archived)

## References

- [Microsub Specification](https://indieweb.org/Microsub-spec)
- [Ekster](https://github.com/pstuifzand/ekster) - Reference implementation in Go
- [Aperture](https://github.com/aaronpk/Aperture) - Popular Microsub server in PHP
