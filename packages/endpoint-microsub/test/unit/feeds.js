import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parseJsonFeed } from "../../lib/feeds/jsonfeed.js";
import { parseRss } from "../../lib/feeds/rss.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, "../fixtures/feeds");

describe("endpoint-microsub/lib/feeds", () => {
  describe("parseRss", () => {
    it("Parses RSS feed with items", async () => {
      const content = await readFile(
        path.join(fixturesPath, "rss.xml"),
        "utf8",
      );
      const feed = await parseRss(content, "https://example.com/feed.xml");

      assert.equal(feed.type, "feed");
      // URL comes from normalized metadata (link from feed)
      assert.ok(feed.url);
      assert.ok(feed.name); // Normalized uses 'name' not 'title'
      assert.ok(Array.isArray(feed.items));
      assert.ok(feed.items.length > 0);
    });

    it("Extracts feed metadata", async () => {
      const content = await readFile(
        path.join(fixturesPath, "rss.xml"),
        "utf8",
      );
      const feed = await parseRss(content, "https://example.com/feed.xml");

      assert.equal(feed.name, "Example Blog"); // Uses 'name' not 'title'
      assert.ok(feed.summary); // Uses 'summary' not 'description'
    });

    it("Normalizes item properties", async () => {
      const content = await readFile(
        path.join(fixturesPath, "rss.xml"),
        "utf8",
      );
      const feed = await parseRss(content, "https://example.com/feed.xml");

      const item = feed.items[0];
      assert.ok(item.uid);
      assert.ok(item.url);
      assert.ok(item.published);
      assert.equal(item.name, "First Post");
    });

    it("Handles items with categories", async () => {
      const content = await readFile(
        path.join(fixturesPath, "rss.xml"),
        "utf8",
      );
      const feed = await parseRss(content, "https://example.com/feed.xml");

      const item = feed.items[0];
      assert.ok(Array.isArray(item.category));
      assert.ok(item.category.length > 0);
    });

    it("Rejects invalid RSS", async () => {
      await assert.rejects(
        () => parseRss("not valid xml", "https://example.com/feed.xml"),
        /RSS parse error/,
      );
    });

    it("Rejects empty content", async () => {
      await assert.rejects(
        () => parseRss("", "https://example.com/feed.xml"),
        /RSS parse error/,
      );
    });
  });

  describe("parseJsonFeed", () => {
    it("Parses JSON Feed with items", async () => {
      const content = await readFile(
        path.join(fixturesPath, "jsonfeed.json"),
        "utf8",
      );
      const feed = await parseJsonFeed(
        content,
        "https://example.com/feed.json",
      );

      assert.equal(feed.type, "feed");
      // URL comes from home_page_url in JSON Feed
      assert.ok(feed.url);
      assert.ok(feed.name); // Normalized uses 'name' not 'title'
      assert.ok(Array.isArray(feed.items));
      assert.equal(feed.items.length, 3);
    });

    it("Extracts feed metadata", async () => {
      const content = await readFile(
        path.join(fixturesPath, "jsonfeed.json"),
        "utf8",
      );
      const feed = await parseJsonFeed(
        content,
        "https://example.com/feed.json",
      );

      assert.equal(feed.name, "Example JSON Feed"); // Uses 'name' not 'title'
      assert.ok(feed.summary); // Uses 'summary' not 'description'
      assert.ok(feed.photo); // Uses 'photo' not 'icon'
    });

    it("Normalizes item properties", async () => {
      const content = await readFile(
        path.join(fixturesPath, "jsonfeed.json"),
        "utf8",
      );
      const feed = await parseJsonFeed(
        content,
        "https://example.com/feed.json",
      );

      const item = feed.items[0];
      assert.ok(item.uid);
      assert.equal(item.url, "https://example.com/json/first");
      assert.ok(item.published);
      assert.equal(item.name, "JSON Feed Post One");
    });

    it("Handles items with tags", async () => {
      const content = await readFile(
        path.join(fixturesPath, "jsonfeed.json"),
        "utf8",
      );
      const feed = await parseJsonFeed(
        content,
        "https://example.com/feed.json",
      );

      const item = feed.items[0];
      assert.ok(Array.isArray(item.category));
      assert.ok(item.category.includes("json"));
    });

    it("Handles items with both HTML and text content", async () => {
      const content = await readFile(
        path.join(fixturesPath, "jsonfeed.json"),
        "utf8",
      );
      const feed = await parseJsonFeed(
        content,
        "https://example.com/feed.json",
      );

      const item = feed.items[0];
      assert.ok(item.content);
      assert.ok(item.content.text);
      assert.ok(item.content.html);
    });

    it("Parses parsed JSON object directly", async () => {
      const content = await readFile(
        path.join(fixturesPath, "jsonfeed.json"),
        "utf8",
      );
      const parsed = JSON.parse(content);
      const feed = await parseJsonFeed(parsed, "https://example.com/feed.json");

      assert.equal(feed.type, "feed");
      assert.ok(feed.items.length > 0);
    });

    it("Rejects invalid JSON", async () => {
      await assert.rejects(
        () => parseJsonFeed("not json", "https://example.com/feed.json"),
        /JSON Feed parse error/,
      );
    });

    it("Rejects JSON without version", async () => {
      await assert.rejects(
        () => parseJsonFeed('{"items": []}', "https://example.com/feed.json"),
        /Invalid JSON Feed: missing or invalid version/,
      );
    });

    it("Rejects JSON with invalid version", async () => {
      const invalid = JSON.stringify({
        version: "1.0",
        items: [],
      });
      await assert.rejects(
        () => parseJsonFeed(invalid, "https://example.com/feed.json"),
        /Invalid JSON Feed: missing or invalid version/,
      );
    });

    it("Rejects JSON without items array", async () => {
      const invalid = JSON.stringify({
        version: "https://jsonfeed.org/version/1.1",
        items: "not an array",
      });
      await assert.rejects(
        () => parseJsonFeed(invalid, "https://example.com/feed.json"),
        /Invalid JSON Feed: items must be an array/,
      );
    });
  });
});
