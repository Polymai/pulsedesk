// Hash router: landing, auth, dashboard, form editor, public share form,
// and account. Protected routes require a session plus the app-local profile.

import { getState, setState } from "./state.js";
import { ensureProfile } from "./auth.js";
import * as landing from "./views/landing.js";
import * as dashboard from "./views/dashboard.js";
import * as formEditor from "./views/formEditor.js";
import * as shareForm from "./views/shareForm.js";
import * as account from "./views/account.js";
import { noticeHtml } from "./ui.js";

let routing = false;
let queued = false;

function appEl() {
  return document.getElementById("app");
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  return raw.split("?")[0].split("/").filter(Boolean);
}

// Session exists but the app profile bootstrap failed: recoverable gate.
function renderProfileGate(container, retry) {
  container.innerHTML = `
    <div class="public-page">
      <header class="public-page__topbar">
        <a class="brand-wordmark brand-wordmark--sm" href="#/">Pulse<span>Desk</span></a>
      </header>
      <div class="public-card">
        ${noticeHtml("error", "We could not finish setting up your PulseDesk account.")}
        <button type="button" class="btn btn--primary" id="retry-profile">Try again</button>
      </div>
    </div>`;
  container.querySelector("#retry-profile").addEventListener("click", retry);
}

async function requireAccount(container) {
  const state = getState();
  if (!state.session) {
    location.hash = "#/auth";
    return false;
  }
  if (!state.profile) {
    try {
      const profile = await ensureProfile(state.user);
      setState({ profile });
    } catch {
      renderProfileGate(container, () => route());
      return false;
    }
  }
  return true;
}

export async function route() {
  if (routing) { queued = true; return; }
  routing = true;
  try {
    const container = appEl();
    if (!container) return;
    const parts = parseHash();
    const [head, second, third] = parts;

    setState({ route: { name: head || "landing", params: { second, third } } });

    if (!head) {
      landing.render(container);
    } else if (head === "auth") {
      landing.renderAuth(container);
    } else if (head === "f" && second) {
      await shareForm.render(container, { slug: second });
    } else if (head === "dashboard") {
      if (await requireAccount(container)) await dashboard.render(container, {});
    } else if (head === "forms" && second === "new") {
      if (await requireAccount(container)) await formEditor.render(container, {});
    } else if (head === "forms" && second && third === "edit") {
      if (await requireAccount(container)) await formEditor.render(container, { formId: second });
    } else if (head === "forms" && second) {
      if (await requireAccount(container)) await dashboard.render(container, { formId: second });
    } else if (head === "account") {
      if (await requireAccount(container)) await account.render(container);
    } else {
      landing.render(container);
    }
    window.scrollTo(0, 0);
  } finally {
    routing = false;
    if (queued) {
      queued = false;
      route();
    }
  }
}

export function startRouter() {
  window.addEventListener("hashchange", () => route());
  return route();
}
