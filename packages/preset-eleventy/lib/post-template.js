import camelcaseKeys from "camelcase-keys";
import YAML from "yaml";

/**
 * Get content
 * @access private
 * @param {object} properties - JF2 properties
 * @returns {string} Content
 */
const getContent = (properties) => {
  if (properties.content) {
    const content =
      properties.content.text || properties.content.html || properties.content;
    return `\n${content}\n`;
  } else {
    return "";
  }
};

/**
 * Get front matter
 * @access private
 * @param {object} properties - JF2 properties
 * @returns {string} Front matter in chosen format
 */
const getFrontMatter = (properties) => {
  /**
   * Eleventy uses camelCase for YAML property keys, i.e. `fileSlug`
   * @see {@link https://www.11ty.dev/docs/data-eleventy-supplied/}
   */
  properties = camelcaseKeys(properties, { deep: true });

  /**
   * Replace Microformat properties with Eleventy equivalents
   * @see {@link https://www.11ty.dev/docs/data-frontmatter/}
   * @see {@link https://www.11ty.dev/docs/dates/}
   */
  properties = {
    date: properties.published,
    ...(properties.name && { title: properties.name }),
    ...properties,
  };

  /**
   * Draft posts
   * @see {@link https://www.11ty.dev/docs/quicktips/draft-posts/}
   */
  if (properties.postStatus === "draft") {
    properties.draft = true;
  }

  delete properties.content; // Shown below front matter
  delete properties.name; // Use `title`
  delete properties.postStatus; // Use `draft`
  delete properties.published; // Use `date`
  delete properties.slug; // use `page.fileSlug`
  delete properties.type; // Not required

  // Convert url to Eleventy permalink so generated URL matches Indiekit's stored URL
  // Add trailing slash to generate /path/index.html instead of /path.html
  // Extract path from full URL since Eleventy expects a path, not a full URL
  if (properties.url) {
    let url = properties.url;
    // If it's a full URL, extract just the pathname
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        const parsed = new URL(url);
        url = parsed.pathname;
      } catch {
        // If URL parsing fails, use as-is
      }
    }
    properties.permalink = url.endsWith("/") ? url : `${url}/`;
  }
  delete properties.url;

  const frontMatter = YAML.stringify(properties, { lineWidth: 0 });
  return `---\n${frontMatter}---\n`;
};

/**
 * Get post template
 * @param {object} properties - JF2 properties
 * @returns {string} Rendered template
 */
export const getPostTemplate = (properties) => {
  const content = getContent(properties);
  const frontMatter = getFrontMatter(properties);

  return frontMatter + content;
};
