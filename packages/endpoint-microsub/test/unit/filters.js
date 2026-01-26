import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  detectInteractionType,
  passesRegexFilter,
  passesTypeFilter,
} from "../../lib/storage/filters.js";

describe("endpoint-microsub/lib/storage/filters", () => {
  describe("detectInteractionType", () => {
    it("Detects like interaction", () => {
      const item = { "like-of": ["https://example.com/post"] };
      assert.equal(detectInteractionType(item), "like");
    });

    it("Detects repost interaction", () => {
      const item = { "repost-of": ["https://example.com/post"] };
      assert.equal(detectInteractionType(item), "repost");
    });

    it("Detects bookmark interaction", () => {
      const item = { "bookmark-of": ["https://example.com/post"] };
      assert.equal(detectInteractionType(item), "bookmark");
    });

    it("Detects reply interaction", () => {
      const item = { "in-reply-to": ["https://example.com/post"] };
      assert.equal(detectInteractionType(item), "reply");
    });

    it("Detects rsvp interaction", () => {
      const item = { rsvp: "yes" };
      assert.equal(detectInteractionType(item), "rsvp");
    });

    it("Detects checkin interaction", () => {
      const item = { checkin: { name: "Coffee Shop" } };
      assert.equal(detectInteractionType(item), "checkin");
    });

    it("Returns post for regular content", () => {
      const item = { content: { text: "Hello world" } };
      assert.equal(detectInteractionType(item), "post");
    });

    it("Returns post for empty interaction arrays", () => {
      const item = { "like-of": [], "repost-of": [] };
      assert.equal(detectInteractionType(item), "post");
    });
  });

  describe("passesTypeFilter", () => {
    it("Passes when no excludeTypes configured", () => {
      const item = { "like-of": ["url"] };
      const settings = {};
      assert.equal(passesTypeFilter(item, settings), true);
    });

    it("Passes when excludeTypes is empty array", () => {
      const item = { "like-of": ["url"] };
      const settings = { excludeTypes: [] };
      assert.equal(passesTypeFilter(item, settings), true);
    });

    it("Filters out excluded type", () => {
      const item = { "like-of": ["url"] };
      const settings = { excludeTypes: ["like"] };
      assert.equal(passesTypeFilter(item, settings), false);
    });

    it("Passes non-excluded type", () => {
      const item = { "repost-of": ["url"] };
      const settings = { excludeTypes: ["like"] };
      assert.equal(passesTypeFilter(item, settings), true);
    });

    it("Filters multiple excluded types", () => {
      const like = { "like-of": ["url"] };
      const repost = { "repost-of": ["url"] };
      const reply = { "in-reply-to": ["url"] };
      const settings = { excludeTypes: ["like", "repost"] };

      assert.equal(passesTypeFilter(like, settings), false);
      assert.equal(passesTypeFilter(repost, settings), false);
      assert.equal(passesTypeFilter(reply, settings), true);
    });

    it("Passes regular posts when excluding interactions", () => {
      const post = { content: { text: "Hello" } };
      const settings = { excludeTypes: ["like", "repost", "bookmark"] };
      assert.equal(passesTypeFilter(post, settings), true);
    });
  });

  describe("passesRegexFilter", () => {
    it("Passes when no excludeRegex configured", () => {
      const item = { content: { text: "crypto to the moon" } };
      const settings = {};
      assert.equal(passesRegexFilter(item, settings), true);
    });

    it("Filters matching content in text", () => {
      const item = { content: { text: "Buy crypto now!" } };
      const settings = { excludeRegex: "crypto" };
      assert.equal(passesRegexFilter(item, settings), false);
    });

    it("Filters matching content in name", () => {
      const item = { name: "NFT Collection Drop" };
      const settings = { excludeRegex: "nft" };
      assert.equal(passesRegexFilter(item, settings), false);
    });

    it("Filters matching content in summary", () => {
      const item = { summary: "Amazing NFT art" };
      const settings = { excludeRegex: "nft" };
      assert.equal(passesRegexFilter(item, settings), false);
    });

    it("Filters matching content in HTML", () => {
      const item = { content: { html: "<p>Get rich with crypto</p>" } };
      const settings = { excludeRegex: "crypto" };
      assert.equal(passesRegexFilter(item, settings), false);
    });

    it("Is case insensitive", () => {
      const item = { content: { text: "CRYPTO TRADING" } };
      const settings = { excludeRegex: "crypto" };
      assert.equal(passesRegexFilter(item, settings), false);
    });

    it("Supports regex patterns", () => {
      const item1 = { content: { text: "crypto trading tips" } };
      const item2 = { content: { text: "nft marketplace" } };
      const item3 = { content: { text: "web development" } };
      const settings = { excludeRegex: "crypto|nft" };

      assert.equal(passesRegexFilter(item1, settings), false);
      assert.equal(passesRegexFilter(item2, settings), false);
      assert.equal(passesRegexFilter(item3, settings), true);
    });

    it("Passes on invalid regex", () => {
      const item = { content: { text: "any content" } };
      const settings = { excludeRegex: "[invalid(" };
      assert.equal(passesRegexFilter(item, settings), true);
    });

    it("Passes non-matching content", () => {
      const item = { content: { text: "Just a normal post about coding" } };
      const settings = { excludeRegex: "crypto|nft|blockchain" };
      assert.equal(passesRegexFilter(item, settings), true);
    });

    it("Handles item with no content fields", () => {
      const item = { url: "https://example.com" };
      const settings = { excludeRegex: "crypto" };
      assert.equal(passesRegexFilter(item, settings), true);
    });
  });
});
