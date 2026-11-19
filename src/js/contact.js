// Contact form (j2wtalent.com): posts JSON to the /contact Pages Function, exactly the fields the live form sent
// (name, org, email, message, website = honeypot, token = Turnstile). The Function checks Origin + Turnstile.
(() => {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const say = (msg, kind) => { status.textContent = msg; status.dataset.kind = kind || ""; };

  document.getElementById("send-another")?.addEventListener("click", () => {
    document.getElementById("form-sent").hidden = true; form.hidden = false; form.elements.name.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const tokenEl = form.elements["cf-turnstile-response"];
    const token = tokenEl ? tokenEl.value : "";
    if (!token) { say("One moment: the spam check is still loading. Try again in a few seconds.", "error"); return; }
    const data = Object.fromEntries(["name", "org", "email", "message", "website"].map((k) => [k, form.elements[k].value]));
    data.token = token;
    button.disabled = true; say("Sending…");
    try {
      const res = await fetch("/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(String(res.status));
      // Success replaces the form with a large confirmation panel (Will 2026-11-19: the one-line note was too quiet).
      form.reset(); say("");
      const sent = document.getElementById("form-sent");
      form.hidden = true; sent.hidden = false;
      sent.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      sent.focus({ preventScroll: true });
    } catch (err) {
      say("That didn’t go through. Please try again in a moment.", "error");
    } finally {
      button.disabled = false;
      if (window.turnstile) window.turnstile.reset();
    }
  });
})();
