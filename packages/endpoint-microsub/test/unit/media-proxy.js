import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  hashUrl,
  getProxiedUrl,
  proxyItemImages,
} from "../../lib/media/proxy.js";

describe("endpoint-microsub/lib/media/proxy", () => {
  describe("hashUrl", () => {
    it("Generates consistent hash for same URL", () => {
      const url = "https://example.com/image.jpg";
      const hash1 = hashUrl(url);
      const hash2 = hashUrl(url);
      assert.equal(hash1, hash2);
    });

    it("Generates different hashes for different URLs", () => {
      const hash1 = hashUrl("https://example.com/image1.jpg");
      const hash2 = hashUrl("https://example.com/image2.jpg");
      assert.notEqual(hash1, hash2);
    });

    it("Returns 16 character hex string", () => {
      const hash = hashUrl("https://example.com/image.jpg");
      assert.equal(hash.length, 16);
      assert.match(hash, /^[0-9a-f]+$/);
    });
  });

  describe("getProxiedUrl", () => {
    it("Returns proxied URL for external images", () => {
      const baseUrl = "https://indiekit.example.com";
      const imageUrl = "https://external.com/photo.jpg";
      const result = getProxiedUrl(baseUrl, imageUrl);

      assert.ok(
        result.startsWith("https://indiekit.example.com/microsub/media/"),
      );
      assert.ok(result.includes("url="));
      assert.ok(result.includes(encodeURIComponent(imageUrl)));
    });

    it("Returns original URL for data URLs", () => {
      const dataUrl = "data:image/png;base64,abc123";
      const result = getProxiedUrl("https://example.com", dataUrl);
      assert.equal(result, dataUrl);
    });

    it("Returns original URL when no baseUrl", () => {
      const imageUrl = "https://external.com/photo.jpg";
      const result = getProxiedUrl(undefined, imageUrl);
      assert.equal(result, imageUrl);
    });

    it("Does not double-proxy already proxied URLs", () => {
      const alreadyProxied =
        "https://example.com/microsub/media/abc123?url=test";
      const result = getProxiedUrl("https://example.com", alreadyProxied);
      assert.equal(result, alreadyProxied);
    });
  });

  describe("proxyItemImages", () => {
    it("Proxies string photo URLs", () => {
      const item = { photo: "https://external.com/photo.jpg" };
      const result = proxyItemImages(item, "https://indiekit.example.com");

      assert.ok(result.photo.includes("/microsub/media/"));
    });

    it("Proxies array of photo URLs", () => {
      const item = {
        photo: ["https://external.com/1.jpg", "https://external.com/2.jpg"],
      };
      const result = proxyItemImages(item, "https://indiekit.example.com");

      assert.ok(Array.isArray(result.photo));
      assert.ok(result.photo[0].includes("/microsub/media/"));
      assert.ok(result.photo[1].includes("/microsub/media/"));
    });

    it("Proxies author photo", () => {
      const item = {
        author: {
          name: "Test Author",
          photo: "https://external.com/avatar.jpg",
        },
      };
      const result = proxyItemImages(item, "https://indiekit.example.com");

      assert.ok(result.author.photo.includes("/microsub/media/"));
      assert.equal(result.author.name, "Test Author");
    });

    it("Returns item unchanged when no baseUrl", () => {
      const item = { photo: "https://external.com/photo.jpg" };
      const result = proxyItemImages(item);

      assert.equal(result.photo, item.photo);
    });
  });
});
