import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  createChannelResponse,
  createFeedResponse,
  createJf2Card,
  createJf2Content,
  createJf2Feed,
  createJf2Item,
  detectInteractionType,
  generateChannelUid,
  generateItemUid,
  stripHtml,
} from "../../lib/utils/jf2.js";

describe("endpoint-microsub/lib/utils/jf2", () => {
  describe("generateItemUid", () => {
    it("Generates consistent UID for same inputs", () => {
      const uid1 = generateItemUid("https://example.com/feed", "item-123");
      const uid2 = generateItemUid("https://example.com/feed", "item-123");
      assert.equal(uid1, uid2);
    });

    it("Generates different UIDs for different inputs", () => {
      const uid1 = generateItemUid("https://example.com/feed", "item-123");
      const uid2 = generateItemUid("https://example.com/feed", "item-456");
      assert.notEqual(uid1, uid2);
    });

    it("Returns 24-character string", () => {
      const uid = generateItemUid("https://example.com/feed", "item-123");
      assert.equal(uid.length, 24);
    });

    it("Returns hex characters only", () => {
      const uid = generateItemUid("https://example.com/feed", "item-123");
      assert.ok(/^[a-f0-9]+$/.test(uid));
    });
  });

  describe("generateChannelUid", () => {
    it("Returns 24-character string", () => {
      const uid = generateChannelUid();
      assert.equal(uid.length, 24);
    });

    it("Returns alphanumeric characters", () => {
      const uid = generateChannelUid();
      assert.ok(/^[a-z0-9]+$/.test(uid));
    });

    it("Generates unique UIDs", () => {
      const uid1 = generateChannelUid();
      const uid2 = generateChannelUid();
      assert.notEqual(uid1, uid2);
    });
  });

  describe("createJf2Item", () => {
    it("Creates basic item with required fields", () => {
      const data = {
        uid: "abc123",
        url: "https://example.com/post",
        published: new Date("2024-01-15"),
      };
      const source = { url: "https://example.com/feed" };
      const item = createJf2Item(data, source);

      assert.equal(item.type, "entry");
      assert.equal(item.uid, "abc123");
      assert.equal(item.url, "https://example.com/post");
      assert.deepEqual(item._source, source);
    });

    it("Includes optional fields when present", () => {
      const data = {
        uid: "abc123",
        url: "https://example.com/post",
        published: new Date("2024-01-15"),
        name: "Post Title",
        summary: "A summary",
        content: { text: "Content", html: "<p>Content</p>" },
        author: { name: "Author" },
        category: ["tech", "news"],
      };
      const item = createJf2Item(data, {});

      assert.equal(item.name, "Post Title");
      assert.equal(item.summary, "A summary");
      assert.deepEqual(item.content, {
        text: "Content",
        html: "<p>Content</p>",
      });
      assert.deepEqual(item.author, { name: "Author" });
      assert.deepEqual(item.category, ["tech", "news"]);
    });

    it("Sets default empty arrays for media", () => {
      const data = {
        uid: "abc123",
        url: "https://example.com/post",
        published: new Date(),
      };
      const item = createJf2Item(data, {});

      assert.deepEqual(item.photo, []);
      assert.deepEqual(item.video, []);
      assert.deepEqual(item.audio, []);
    });

    it("Includes interaction properties", () => {
      const data = {
        uid: "abc123",
        url: "https://example.com/post",
        published: new Date(),
        likeOf: ["https://example.com/liked-post"],
        inReplyTo: ["https://example.com/replied-to"],
      };
      const item = createJf2Item(data, {});

      assert.deepEqual(item["like-of"], ["https://example.com/liked-post"]);
      assert.deepEqual(item["in-reply-to"], ["https://example.com/replied-to"]);
    });

    it("Sets _is_read default to false", () => {
      const data = {
        uid: "abc123",
        url: "https://example.com/post",
        published: new Date(),
      };
      const item = createJf2Item(data, {});

      assert.equal(item._is_read, false);
    });
  });

  describe("createJf2Card", () => {
    it("Creates card with all fields", () => {
      const data = {
        name: "John Doe",
        url: "https://johndoe.com",
        photo: "https://johndoe.com/avatar.jpg",
      };
      const card = createJf2Card(data);

      assert.equal(card.type, "card");
      assert.equal(card.name, "John Doe");
      assert.equal(card.url, "https://johndoe.com");
      assert.equal(card.photo, "https://johndoe.com/avatar.jpg");
    });

    it("Returns undefined for null data", () => {
      // eslint-disable-next-line unicorn/no-null -- Testing null input handling
      const card = createJf2Card(null);
      assert.equal(card, undefined);
    });

    it("Returns undefined for undefined data", () => {
      const card = createJf2Card();
      assert.equal(card, undefined);
    });

    it("Handles partial data", () => {
      const card = createJf2Card({ name: "John" });
      assert.equal(card.name, "John");
      assert.equal(card.url, undefined);
      assert.equal(card.photo, undefined);
    });
  });

  describe("createJf2Content", () => {
    it("Creates content with text and html", () => {
      const content = createJf2Content("Hello world", "<p>Hello world</p>");

      assert.equal(content.text, "Hello world");
      assert.equal(content.html, "<p>Hello world</p>");
    });

    it("Strips HTML to create text when only HTML provided", () => {
      /* eslint-disable unicorn/no-null -- Testing null text with valid HTML */
      const content = createJf2Content(
        null,
        "<p>Hello <strong>world</strong></p>",
      );
      /* eslint-enable unicorn/no-null */

      assert.equal(content.text, "Hello world");
      assert.equal(content.html, "<p>Hello <strong>world</strong></p>");
    });

    it("Returns undefined when both are empty", () => {
      /* eslint-disable unicorn/no-null -- Testing null input handling */
      const content = createJf2Content(null, null);
      /* eslint-enable unicorn/no-null */
      assert.equal(content, undefined);
    });

    it("Returns undefined for empty strings", () => {
      const content = createJf2Content("", "");
      assert.equal(content, undefined);
    });
  });

  describe("stripHtml", () => {
    it("Removes HTML tags", () => {
      const result = stripHtml("<p>Hello <strong>world</strong></p>");
      assert.equal(result, "Hello world");
    });

    it("Returns empty string for null", () => {
      // eslint-disable-next-line unicorn/no-null -- Testing null input handling
      const result = stripHtml(null);
      assert.equal(result, "");
    });

    it("Returns empty string for undefined", () => {
      const result = stripHtml();
      assert.equal(result, "");
    });

    it("Trims whitespace", () => {
      const result = stripHtml("  <p>Hello</p>  ");
      assert.equal(result, "Hello");
    });

    it("Handles nested tags", () => {
      const result = stripHtml("<div><p><span>Nested</span></p></div>");
      assert.equal(result, "Nested");
    });
  });

  describe("createJf2Feed", () => {
    it("Creates feed with items", () => {
      const items = [{ uid: "1" }, { uid: "2" }];
      const feed = createJf2Feed({ items });

      assert.deepEqual(feed.items, items);
    });

    it("Includes paging when provided", () => {
      const paging = { before: "cursor1", after: "cursor2" };
      const feed = createJf2Feed({ items: [], paging });

      assert.deepEqual(feed.paging, { before: "cursor1", after: "cursor2" });
    });

    it("Omits paging when not provided", () => {
      const feed = createJf2Feed({ items: [] });

      assert.ok(!feed.paging);
    });

    it("Handles partial paging", () => {
      const feed = createJf2Feed({ items: [], paging: { after: "cursor" } });

      assert.equal(feed.paging.after, "cursor");
      assert.ok(!feed.paging.before);
    });

    it("Defaults items to empty array", () => {
      const feed = createJf2Feed({});

      assert.deepEqual(feed.items, []);
    });
  });

  describe("createChannelResponse", () => {
    it("Creates channel response with unread count", () => {
      const channel = { uid: "ch1", name: "News" };
      const response = createChannelResponse(channel, 5);

      assert.equal(response.uid, "ch1");
      assert.equal(response.name, "News");
      assert.equal(response.unread, 5);
    });

    it("Sets unread to false when count is 0", () => {
      const channel = { uid: "ch1", name: "News" };
      const response = createChannelResponse(channel, 0);

      assert.equal(response.unread, false);
    });

    it("Defaults unread count to false", () => {
      const channel = { uid: "ch1", name: "News" };
      const response = createChannelResponse(channel);

      assert.equal(response.unread, false);
    });
  });

  describe("createFeedResponse", () => {
    it("Creates feed response with all fields", () => {
      const feed = {
        url: "https://example.com/feed",
        title: "Example Feed",
        photo: "https://example.com/icon.png",
      };
      const response = createFeedResponse(feed);

      assert.equal(response.type, "feed");
      assert.equal(response.url, "https://example.com/feed");
      assert.equal(response.name, "Example Feed");
      assert.equal(response.photo, "https://example.com/icon.png");
    });

    it("Handles missing optional fields", () => {
      const feed = { url: "https://example.com/feed" };
      const response = createFeedResponse(feed);

      assert.equal(response.type, "feed");
      assert.equal(response.url, "https://example.com/feed");
      assert.equal(response.name, undefined);
      assert.equal(response.photo, undefined);
    });
  });

  describe("detectInteractionType", () => {
    it("Detects like interaction", () => {
      assert.equal(detectInteractionType({ "like-of": ["url"] }), "like");
      assert.equal(detectInteractionType({ likeOf: ["url"] }), "like");
    });

    it("Detects repost interaction", () => {
      assert.equal(detectInteractionType({ "repost-of": ["url"] }), "repost");
      assert.equal(detectInteractionType({ repostOf: ["url"] }), "repost");
    });

    it("Detects bookmark interaction", () => {
      assert.equal(
        detectInteractionType({ "bookmark-of": ["url"] }),
        "bookmark",
      );
      assert.equal(detectInteractionType({ bookmarkOf: ["url"] }), "bookmark");
    });

    it("Detects reply interaction", () => {
      assert.equal(detectInteractionType({ "in-reply-to": ["url"] }), "reply");
      assert.equal(detectInteractionType({ inReplyTo: ["url"] }), "reply");
    });

    it("Detects checkin interaction", () => {
      assert.equal(detectInteractionType({ checkin: {} }), "checkin");
    });

    it("Returns undefined for regular post", () => {
      assert.equal(detectInteractionType({ content: "Hello" }), undefined);
    });

    it("Returns undefined for empty arrays", () => {
      assert.equal(detectInteractionType({ "like-of": [] }), undefined);
    });
  });
});
