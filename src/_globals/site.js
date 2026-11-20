// Jackson Talent Strategies (j2wtalent.com). Everything the head, robots.txt, llms.txt and JSON-LD need.
export default {
  name: "Jackson Talent Strategies",
  url: "https://j2wtalent.com",
  description: "Willie Jackson, talent strategist and facilitator, works with executives and HR leaders on the human side of high-stakes change, leadership and AI.",
  lang: "en-US", locale: "en_US",
  // The same Person williejackson.com describes (its central @id), so the two sites name one entity.
  // alternateName + sameAs mirror williejackson.com's Person (Will approved 2026-11-20).
  author: { name: "Willie Jackson", alternateName: "Willie L. Jackson II", url: "https://williejackson.com", id: "https://williejackson.com/#person",
            sameAs: ["https://williejackson.com/", "https://www.linkedin.com/in/willieljackson/",
                     "https://abernathymagazine.com/author/williejackson/", "https://www.wikidata.org/wiki/Q142087430"] },
  publisher: "organization",
  org: { name: "Jackson Talent Strategies", logo: "/icons/icon-512.png" },
  linkedin: "https://www.linkedin.com/in/willieljackson/",
  themeColor: "#f4f7fb",                // the page background, oklch(0.975 0.006 250)
  colorScheme: "light",
  ogImage: "/img/og/default.jpg",
  ogImageAlt: "Willie Jackson smiling as he facilitates a session for a room of seated participants",
  feed: null,
  privacy: { controller: "Willie Jackson", contact: "security@jackson2w.com", updated: "2026-11-19" },
  launched: true,
  // Contact form (unchanged from the live site, 2026-11-19): Turnstile widget, honeypot `website`, POST /contact.
  turnstileSitekey: "0x4AAAAAAGI_7aWaw1JTf3Vp",
  fonts: [
    { family: "Newsreader", file: "Newsreader-Var.ttf", weight: "200 800", style: "normal", fallback: "georgia", preload: true },
    { family: "Newsreader", file: "Newsreader-Italic-Var.ttf", weight: "200 800", style: "italic", fallback: "georgia", preload: false },
  ],
  fontExtraText: "“”‘’…·",
  analyticsToken: null,
  // The j2wtalent.com zone injects Cloudflare Web Analytics itself (automatic setup, seen live 2026-11-19), so the
  // privacy page must disclose it even though the site sets no token.
  analyticsZoneInjected: true,
  ai: { search: "yes", aiInput: "yes", aiTrain: "no" },
  nav: [
    { label: "Services", url: "/services/" },
    { label: "Workshops", url: "/workshops/" },
    { label: "Work", url: "/work/" },
    { label: "About", url: "/about/" },
    { label: "Contact", url: "/contact/" },
  ],
};
