import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  calculateNewTier,
  getInitialTier,
  getIntervalForTier,
  getNextFetchTime,
  getTierDescription,
  isDueForFetch,
  MAX_TIER,
  MIN_TIER,
} from "../../lib/polling/tier.js";

describe("endpoint-microsub/lib/polling/tier", () => {
  describe("getIntervalForTier", () => {
    it("Returns 1 minute for tier 0", () => {
      const interval = getIntervalForTier(0);
      assert.equal(interval, 60 * 1000);
    });

    it("Returns 2 minutes for tier 1", () => {
      const interval = getIntervalForTier(1);
      assert.equal(interval, 2 * 60 * 1000);
    });

    it("Returns 4 minutes for tier 2", () => {
      const interval = getIntervalForTier(2);
      assert.equal(interval, 4 * 60 * 1000);
    });

    it("Returns ~17 hours for tier 10", () => {
      const interval = getIntervalForTier(10);
      assert.equal(interval, 1024 * 60 * 1000);
    });

    it("Clamps to MIN_TIER for negative values", () => {
      const interval = getIntervalForTier(-5);
      assert.equal(interval, getIntervalForTier(MIN_TIER));
    });

    it("Clamps to MAX_TIER for values above max", () => {
      const interval = getIntervalForTier(15);
      assert.equal(interval, getIntervalForTier(MAX_TIER));
    });
  });

  describe("getNextFetchTime", () => {
    it("Returns a Date in the future", () => {
      const now = Date.now();
      const next = getNextFetchTime(1);
      assert.ok(next instanceof Date);
      assert.ok(next.getTime() > now);
    });

    it("Returns correct interval from now", () => {
      const now = Date.now();
      const next = getNextFetchTime(0);
      const diff = next.getTime() - now;
      // Allow 100ms tolerance for test execution time
      assert.ok(diff >= 60 * 1000 - 100);
      assert.ok(diff <= 60 * 1000 + 100);
    });
  });

  describe("calculateNewTier", () => {
    it("Decreases tier when new items found", () => {
      const result = calculateNewTier({
        currentTier: 5,
        hasNewItems: true,
        consecutiveUnchanged: 3,
      });
      assert.equal(result.tier, 4);
      assert.equal(result.consecutiveUnchanged, 0);
    });

    it("Does not decrease below MIN_TIER", () => {
      const result = calculateNewTier({
        currentTier: 0,
        hasNewItems: true,
        consecutiveUnchanged: 0,
      });
      assert.equal(result.tier, MIN_TIER);
    });

    it("Increments unchanged counter when no new items", () => {
      const result = calculateNewTier({
        currentTier: 3,
        hasNewItems: false,
        consecutiveUnchanged: 1,
      });
      assert.equal(result.consecutiveUnchanged, 2);
    });

    it("Increases tier after threshold unchanged fetches", () => {
      const result = calculateNewTier({
        currentTier: 3,
        hasNewItems: false,
        consecutiveUnchanged: 3, // threshold for tier 3 is max(2, 3) = 3
      });
      assert.equal(result.tier, 4);
      assert.equal(result.consecutiveUnchanged, 0);
    });

    it("Does not increase above MAX_TIER", () => {
      const result = calculateNewTier({
        currentTier: MAX_TIER,
        hasNewItems: false,
        consecutiveUnchanged: 15,
      });
      assert.equal(result.tier, MAX_TIER);
    });

    it("Uses default values when options missing", () => {
      const result = calculateNewTier({ hasNewItems: true });
      assert.equal(result.tier, 0); // Default tier 1 - 1 = 0
    });

    it("Returns nextFetchAt date", () => {
      const result = calculateNewTier({
        currentTier: 2,
        hasNewItems: false,
        consecutiveUnchanged: 0,
      });
      assert.ok(result.nextFetchAt instanceof Date);
    });
  });

  describe("getInitialTier", () => {
    it("Returns tier 0 for new feeds", () => {
      const initial = getInitialTier();
      assert.equal(initial.tier, MIN_TIER);
    });

    it("Returns zero consecutive unchanged", () => {
      const initial = getInitialTier();
      assert.equal(initial.consecutiveUnchanged, 0);
    });

    it("Returns immediate fetch time", () => {
      const now = Date.now();
      const initial = getInitialTier();
      assert.ok(initial.nextFetchAt.getTime() <= now + 100);
    });
  });

  describe("isDueForFetch", () => {
    it("Returns true when nextFetchAt is in the past", () => {
      const feed = {
        nextFetchAt: new Date(Date.now() - 1000),
      };
      assert.equal(isDueForFetch(feed), true);
    });

    it("Returns false when nextFetchAt is in the future", () => {
      const feed = {
        nextFetchAt: new Date(Date.now() + 60_000),
      };
      assert.equal(isDueForFetch(feed), false);
    });

    it("Returns true when nextFetchAt is undefined", () => {
      const feed = {};
      assert.equal(isDueForFetch(feed), true);
    });

    it("Returns true when nextFetchAt is null", () => {
      // eslint-disable-next-line unicorn/no-null -- Testing null input handling
      const feed = { nextFetchAt: null };
      assert.equal(isDueForFetch(feed), true);
    });
  });

  describe("getTierDescription", () => {
    it("Returns minute description for low tiers", () => {
      assert.equal(getTierDescription(0), "every 1 minute");
      assert.equal(getTierDescription(1), "every 2 minutes");
      assert.equal(getTierDescription(2), "every 4 minutes");
    });

    it("Returns hour description for mid tiers", () => {
      const desc = getTierDescription(6);
      assert.ok(desc.includes("hour"));
    });

    it("Returns day description for high tiers", () => {
      const desc = getTierDescription(11); // Would be 2048 minutes if not clamped
      assert.ok(desc.includes("hour") || desc.includes("day"));
    });
  });
});
