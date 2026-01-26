import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  validateAction,
  validateChannel,
  validateUrl,
  validateEntries,
  validateChannelName,
  validateExcludeTypes,
  validateExcludeRegex,
  parseArrayParameter,
} from "../../lib/utils/validation.js";

describe("endpoint-microsub/lib/utils/validation", () => {
  describe("validateAction", () => {
    it("Accepts valid actions", () => {
      assert.doesNotThrow(() => validateAction("channels"));
      assert.doesNotThrow(() => validateAction("timeline"));
      assert.doesNotThrow(() => validateAction("follow"));
      assert.doesNotThrow(() => validateAction("search"));
    });

    it("Rejects missing action", () => {
      assert.throws(() => validateAction(), {
        message: /Missing required parameter: action/,
      });
      // eslint-disable-next-line unicorn/no-null -- Testing null input handling
      assert.throws(() => validateAction(null), {
        message: /Missing required parameter: action/,
      });
    });

    it("Rejects invalid action", () => {
      assert.throws(() => validateAction("invalid"), {
        message: /Invalid action/,
      });
    });
  });

  describe("validateChannel", () => {
    it("Accepts valid channel", () => {
      assert.doesNotThrow(() => validateChannel("test-channel"));
    });

    it("Rejects missing channel when required", () => {
      assert.throws(() => validateChannel(), {
        message: /Missing required parameter: channel/,
      });
    });

    it("Allows missing channel when not required", () => {
      assert.doesNotThrow(() => validateChannel(undefined, false));
    });
  });

  describe("validateUrl", () => {
    it("Accepts valid URL", () => {
      assert.doesNotThrow(() => validateUrl("https://example.com"));
      assert.doesNotThrow(() => validateUrl("http://example.com/feed.xml"));
    });

    it("Rejects missing URL", () => {
      assert.throws(() => validateUrl(), {
        message: /Missing required parameter/,
      });
    });

    it("Rejects invalid URL", () => {
      assert.throws(() => validateUrl("not-a-url"), { message: /Invalid URL/ });
    });
  });

  describe("validateEntries", () => {
    it("Returns array for single entry", () => {
      const result = validateEntries("entry-1");
      assert.deepEqual(result, ["entry-1"]);
    });

    it("Returns array for array of entries", () => {
      const result = validateEntries(["entry-1", "entry-2"]);
      assert.deepEqual(result, ["entry-1", "entry-2"]);
    });

    it("Rejects missing entries", () => {
      assert.throws(() => validateEntries(), {
        message: /Missing required parameter: entry/,
      });
    });
  });

  describe("validateChannelName", () => {
    it("Accepts valid name", () => {
      assert.doesNotThrow(() => validateChannelName("My Channel"));
    });

    it("Rejects empty name", () => {
      assert.throws(() => validateChannelName(""), {
        message: /Missing required parameter: name/,
      });
    });

    it("Rejects name over 100 characters", () => {
      const longName = "a".repeat(101);
      assert.throws(() => validateChannelName(longName), {
        message: /100 characters or less/,
      });
    });
  });

  describe("validateExcludeTypes", () => {
    it("Returns valid types", () => {
      const result = validateExcludeTypes(["like", "repost", "invalid"]);
      assert.deepEqual(result, ["like", "repost"]);
    });

    it("Returns empty array for invalid input", () => {
      // eslint-disable-next-line unicorn/no-null -- Testing null input handling
      assert.deepEqual(validateExcludeTypes(null), []);
      assert.deepEqual(validateExcludeTypes(), []);
    });
  });

  describe("validateExcludeRegex", () => {
    it("Returns valid regex pattern", () => {
      const result = validateExcludeRegex("^test.*$");
      assert.equal(result, "^test.*$");
    });

    it("Returns undefined for invalid regex", () => {
      const result = validateExcludeRegex("[invalid");
      assert.equal(result, undefined);
    });

    it("Returns undefined for non-string input", () => {
      // eslint-disable-next-line unicorn/no-null -- Testing null input handling
      assert.equal(validateExcludeRegex(null), undefined);
      assert.equal(validateExcludeRegex(123), undefined);
    });
  });

  describe("parseArrayParameter", () => {
    it("Handles direct array", () => {
      const result = parseArrayParameter({ items: ["a", "b"] }, "items");
      assert.deepEqual(result, ["a", "b"]);
    });

    it("Handles single value", () => {
      const result = parseArrayParameter({ item: "single" }, "item");
      assert.deepEqual(result, ["single"]);
    });

    it("Handles indexed values", () => {
      const body = { "item[0]": "first", "item[1]": "second" };
      const result = parseArrayParameter(body, "item");
      assert.deepEqual(result, ["first", "second"]);
    });

    it("Returns empty array for missing parameter", () => {
      const result = parseArrayParameter({}, "missing");
      assert.deepEqual(result, []);
    });
  });
});
