// The project's production pages.dev address 301s to the custom domain (Will, 2026-11-20): Google indexed
// j2wstrategies-com.pages.dev and ranked it for Will's name, and noindex (since 2026-11-03) passes no credit across.
// Only that exact host: branch and hash previews (<x>.j2wstrategies-com.pages.dev) and j2wtalent.com pass through.
// public/_routes.json keeps static files out of Functions, so only page and /contact requests run this.
const PAGES_DEV = "j2wstrategies-com.pages.dev";
const CANONICAL = "j2wtalent.com";

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === PAGES_DEV) {
    url.protocol = "https:"; url.hostname = CANONICAL; url.port = "";
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
