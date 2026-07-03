// Shared UI helpers: escaping, toasts, app-level loader, busy buttons,
// confirm dialog, notices, and the signed-in app shell with mobile drawer.

import { getState } from "./state.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
export function toast(message, type = "info") {
  const host = document.getElementById("toast-host");
  if (!host) return;
  const item = document.createElement("div");
  item.className = `toast toast--${type}`;
  item.setAttribute("role", type === "error" ? "alert" : "status");
  item.textContent = message;
  host.appendChild(item);
  requestAnimationFrame(() => item.classList.add("toast--visible"));
  setTimeout(() => {
    item.classList.remove("toast--visible");
    setTimeout(() => item.remove(), 300);
  }, 4200);
}

// ---------------------------------------------------------------------------
// App-level loader (used for checkout/portal redirects and AI runs)
// ---------------------------------------------------------------------------
export function showAppLoader(text) {
  const loader = document.getElementById("app-loader");
  if (!loader) return;
  loader.querySelector(".app-loader__text").textContent = text || "Working…";
  loader.hidden = false;
  loader.setAttribute("aria-busy", "true");
}

export function hideAppLoader() {
  const loader = document.getElementById("app-loader");
  if (!loader) return;
  loader.hidden = true;
  loader.setAttribute("aria-busy", "false");
}

// ---------------------------------------------------------------------------
// Busy buttons
// ---------------------------------------------------------------------------
export function setBusy(button, busy, busyLabel) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.disabled = true;
    button.classList.add("is-busy");
    if (busyLabel) button.textContent = busyLabel;
  } else {
    button.disabled = false;
    button.classList.remove("is-busy");
    if (button.dataset.label) button.textContent = button.dataset.label;
    delete button.dataset.label;
  }
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------
export function confirmDialog({ title, body, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 id="modal-title" class="modal__title">${escapeHtml(title)}</h3>
        <p class="modal__body">${escapeHtml(body)}</p>
        <div class="modal__actions">
          <button type="button" class="btn btn--ghost" data-act="cancel">Cancel</button>
          <button type="button" class="btn ${danger ? "btn--danger" : "btn--primary"}" data-act="ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;
    const close = (result) => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    const onKey = (event) => { if (event.key === "Escape") close(false); };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(false);
      const act = event.target.closest("[data-act]")?.dataset.act;
      if (act === "cancel") close(false);
      if (act === "ok") close(true);
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-act="ok"]').focus();
  });
}

// ---------------------------------------------------------------------------
// Notices / empty states
// ---------------------------------------------------------------------------
export function noticeHtml(kind, text) {
  return `<div class="notice notice--${kind}">${escapeHtml(text)}</div>`;
}

export function emptyStateHtml({ title, body, actionHref, actionLabel }) {
  return `
    <div class="empty-state">
      <div class="empty-state__pulse" aria-hidden="true"></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
      ${actionHref ? `<a class="btn btn--primary" href="${escapeHtml(actionHref)}">${escapeHtml(actionLabel)}</a>` : ""}
    </div>`;
}

export function loadingHtml(text) {
  return `
    <div class="section-loading" role="status" aria-busy="true">
      <span class="spinner" aria-hidden="true"></span>
      <span>${escapeHtml(text || "Loading…")}</span>
    </div>`;
}

// ---------------------------------------------------------------------------
// Signed-in app shell with accessible mobile drawer navigation
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { href: "#/dashboard", label: "Dashboard", match: /^#\/(dashboard|forms\/(?!new$))/ },
  { href: "#/forms/new", label: "New form", match: /^#\/forms\/new$/ },
  { href: "#/account", label: "Account", match: /^#\/account/ },
];

export function renderAppShell(container, { onSignOut }) {
  const state = getState();
  const hash = location.hash || "#/dashboard";
  const planName = state.profile?.plan === "pro" ? "Pro" : "Free";
  const displayName = state.profile?.display_name || state.profile?.email || "";

  const navLinks = (extraClass) => NAV_ITEMS.map((item) => {
    const active = item.match.test(hash);
    return `<a class="${extraClass} ${active ? "is-active" : ""}" href="${item.href}" ${active ? 'aria-current="page"' : ""}>${item.label}</a>`;
  }).join("");

  container.innerHTML = `
    <div class="shell">
      <header class="shell__topbar">
        <a class="brand-wordmark" href="#/dashboard">Pulse<span>Desk</span></a>
        <nav class="shell__nav" aria-label="Main">${navLinks("shell__navlink")}</nav>
        <div class="shell__topbar-actions">
          <span class="plan-chip plan-chip--${planName.toLowerCase()}">${planName}</span>
          <button type="button" class="btn btn--ghost shell__signout" data-shell="signout">Sign out</button>
          <button type="button" class="shell__menu-btn" data-shell="menu"
            aria-expanded="false" aria-controls="mobile-drawer" aria-label="Open menu">
            <span class="shell__menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>
          </button>
        </div>
      </header>
      <div class="drawer-backdrop" data-shell="backdrop" hidden></div>
      <aside class="drawer" id="mobile-drawer" aria-label="Mobile menu" hidden>
        <div class="drawer__identity">
          <span class="drawer__name">${escapeHtml(displayName)}</span>
          <span class="plan-chip plan-chip--${planName.toLowerCase()}">${planName} plan</span>
        </div>
        <nav class="drawer__nav" aria-label="Mobile">${navLinks("drawer__link")}</nav>
        <button type="button" class="btn btn--ghost drawer__signout" data-shell="signout">Sign out</button>
      </aside>
      <main class="shell__main" id="shell-main"></main>
    </div>`;

  const menuBtn = container.querySelector('[data-shell="menu"]');
  const drawer = container.querySelector("#mobile-drawer");
  const backdrop = container.querySelector('[data-shell="backdrop"]');
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setDrawer = (open) => {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) {
      drawer.hidden = false;
      backdrop.hidden = false;
      requestAnimationFrame(() => {
        drawer.classList.add("is-open");
        backdrop.classList.add("is-open");
      });
    } else {
      drawer.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      const delay = reduceMotion ? 0 : 200;
      setTimeout(() => { drawer.hidden = true; backdrop.hidden = true; }, delay);
    }
  };

  menuBtn.addEventListener("click", () => setDrawer(menuBtn.getAttribute("aria-expanded") !== "true"));
  backdrop.addEventListener("click", () => setDrawer(false));
  drawer.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setDrawer(false)));
  document.addEventListener("keydown", function onKey(event) {
    if (event.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") setDrawer(false);
    if (!document.body.contains(drawer)) document.removeEventListener("keydown", onKey);
  });
  const mq = window.matchMedia("(min-width: 861px)");
  mq.addEventListener("change", function onResize(ev) {
    if (ev.matches) setDrawer(false);
    if (!document.body.contains(drawer)) mq.removeEventListener("change", onResize);
  });

  container.querySelectorAll('[data-shell="signout"]').forEach((btn) => {
    btn.addEventListener("click", () => onSignOut?.());
  });

  return container.querySelector("#shell-main");
}
