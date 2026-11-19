// Jackson Talent Strategies (j2wtalent.com). Eleventy 3, from Will's starter kit (website-building-preferences/starter).
// Global data lives in src/_globals/: src/_data/ is a frozen copy the mockups repo reads by path (see its README).
import rss from "@11ty/eleventy-plugin-rss";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ public: "/" });          // _redirects, favicons, icons/ (_headers is generated)
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/fonts");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/img/og");                // share images stay plain JPGs at a fixed URL
  eleventyConfig.ignores.add("src/_data/**");
  // Every <img> becomes AVIF -> WebP -> JPEG <picture> at several widths, sized, lazy by default.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["avif", "webp", "jpeg"],
    widths: [320, 640, 960, 1600],
    outputDir: "./_site/img/built/", urlPath: "/img/built/",
    htmlOptions: { imgAttributes: { loading: "lazy", decoding: "async", sizes: "(min-width: 60rem) 60rem, 100vw" } },
  });
  // "/css/style.css" | fp -> "?v=<content hash>"
  eleventyConfig.addFilter("fp", (url) => url + "?v=" + createHash("sha256").update(readFileSync("src" + url)).digest("hex").slice(0, 10));
  eleventyConfig.addFilter("readablePrivacyDate", (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }));
  eleventyConfig.addFilter("stripTags", (s) => String(s).replace(/<[^>]+>/g, ""));
  eleventyConfig.addPlugin(rss);
  return { dir: { input: "src", includes: "_includes", data: "_globals", output: "_site" } };
}
