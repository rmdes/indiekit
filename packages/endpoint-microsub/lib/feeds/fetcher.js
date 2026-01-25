/**
 * Feed fetcher with HTTP caching
 * @module feeds/fetcher
 */

import { getCache, setCache } from "../cache/redis.js";

const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const DEFAULT_USER_AGENT = "Indiekit Microsub/1.0 (+https://getindiekit.com)";

/**
 * Fetch feed content with caching
 * @param {string} url - Feed URL
 * @param {object} options - Fetch options
 * @param {string} [options.etag] - Previous ETag for conditional request
 * @param {string} [options.lastModified] - Previous Last-Modified for conditional request
 * @param {number} [options.timeout] - Request timeout in ms
 * @param {object} [options.redis] - Redis client for caching
 * @returns {Promise<object>} Fetch result with content and headers
 */
export async function fetchFeed(url, options = {}) {
  const { etag, lastModified, timeout = DEFAULT_TIMEOUT, redis } = options;

  // Check cache first
  if (redis) {
    const cached = await getCache(redis, `feed:${url}`);
    if (cached) {
      return {
        content: cached.content,
        contentType: cached.contentType,
        etag: cached.etag,
        lastModified: cached.lastModified,
        fromCache: true,
        status: 200,
      };
    }
  }

  const headers = {
    Accept:
      "application/atom+xml, application/rss+xml, application/json, application/feed+json, text/xml, text/html;q=0.9, */*;q=0.8",
    "User-Agent": DEFAULT_USER_AGENT,
  };

  // Add conditional request headers
  if (etag) {
    headers["If-None-Match"] = etag;
  }
  if (lastModified) {
    headers["If-Modified-Since"] = lastModified;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    // Not modified - use cached version
    if (response.status === 304) {
      return {
        content: undefined,
        contentType: undefined,
        etag,
        lastModified,
        notModified: true,
        status: 304,
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();
    const responseEtag = response.headers.get("ETag");
    const responseLastModified = response.headers.get("Last-Modified");
    const contentType = response.headers.get("Content-Type") || "";

    const result = {
      content,
      contentType,
      etag: responseEtag,
      lastModified: responseLastModified,
      fromCache: false,
      status: response.status,
    };

    // Extract hub URL from Link header for WebSub
    const linkHeader = response.headers.get("Link");
    if (linkHeader) {
      result.hub = extractHubFromLinkHeader(linkHeader);
      result.self = extractSelfFromLinkHeader(linkHeader);
    }

    // Cache the result
    if (redis) {
      const cacheData = {
        content,
        contentType,
        etag: responseEtag,
        lastModified: responseLastModified,
      };
      // Cache for 5 minutes by default
      await setCache(redis, `feed:${url}`, cacheData, 300);
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms`);
    }

    throw error;
  }
}

/**
 * Extract hub URL from Link header
 * @param {string} linkHeader - Link header value
 * @returns {string|undefined} Hub URL
 */
function extractHubFromLinkHeader(linkHeader) {
  const hubMatch = linkHeader.match(/<([^>]+)>;\s*rel=["']?hub["']?/i);
  return hubMatch ? hubMatch[1] : undefined;
}

/**
 * Extract self URL from Link header
 * @param {string} linkHeader - Link header value
 * @returns {string|undefined} Self URL
 */
function extractSelfFromLinkHeader(linkHeader) {
  const selfMatch = linkHeader.match(/<([^>]+)>;\s*rel=["']?self["']?/i);
  return selfMatch ? selfMatch[1] : undefined;
}

/**
 * Fetch feed and parse it
 * @param {string} url - Feed URL
 * @param {object} options - Options
 * @returns {Promise<object>} Parsed feed
 */
export async function fetchAndParseFeed(url, options = {}) {
  const { parseFeed } = await import("./parser.js");

  const result = await fetchFeed(url, options);

  if (result.notModified) {
    return {
      ...result,
      items: [],
    };
  }

  const parsed = await parseFeed(result.content, url, {
    contentType: result.contentType,
  });

  return {
    ...result,
    ...parsed,
    hub: result.hub || parsed._hub,
  };
}

/**
 * Discover feeds from a URL
 * @param {string} url - Page URL
 * @param {object} options - Options
 * @returns {Promise<Array>} Array of discovered feeds
 */
export async function discoverFeedsFromUrl(url, options = {}) {
  const result = await fetchFeed(url, options);
  const { discoverFeeds } = await import("./hfeed.js");

  // If it's already a feed, return it
  const contentType = result.contentType?.toLowerCase() || "";
  if (
    contentType.includes("xml") ||
    contentType.includes("rss") ||
    contentType.includes("atom") ||
    contentType.includes("json")
  ) {
    return [
      {
        url,
        type: contentType.includes("json") ? "jsonfeed" : "xml",
        rel: "self",
      },
    ];
  }

  // Otherwise, discover feeds from HTML
  const feeds = await discoverFeeds(result.content, url);
  return feeds;
}
