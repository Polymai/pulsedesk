// Public landing page and the sign-in / create-account entry.

import { getState } from "../state.js";
import { signIn, signUpAccount } from "../auth.js";
import { escapeHtml, setBusy } from "../ui.js";

function appData() {
  return window.__DATA__ || {};
}

function planCard(plan, highlight) {
  return `
    <article class="price-card ${highlight ? "price-card--pro" : ""}">
      ${highlight ? '<span class="price-card__flag">Most popular</span>' : ""}
      <h3>${escapeHtml(plan.name)}</h3>
      <p class="price-card__price">${escapeHtml(plan.priceLabel)}<span> ${escapeHtml(plan.interval)}</span></p>
      <ul>
        ${plan.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
      </ul>
      <a class="btn ${highlight ? "btn--primary" : "btn--ghost"} btn--block" href="#/auth">
        ${highlight ? "Start with Pro" : "Start free"}
      </a>
    </article>`;
}

export function render(container) {
  const state = getState();
  const data = appData();
  const signedIn = Boolean(state.session);
  const primaryCta = signedIn
    ? '<a class="btn btn--primary btn--lg" href="#/dashboard">Open your dashboard</a>'
    : '<a class="btn btn--primary btn--lg" href="#/auth">Create your first form</a>';

  container.innerHTML = `
    <div class="landing">
      <header class="landing__topbar">
        <a class="brand-wordmark" href="#/">Pulse<span>Desk</span></a>
        <nav class="landing__nav" aria-label="Landing">
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        ${signedIn
          ? '<a class="btn btn--ghost" href="#/dashboard">Dashboard</a>'
          : '<a class="btn btn--ghost" href="#/auth">Sign in</a>'}
      </header>

      <section class="hero">
        <div class="hero__content">
          <span class="hero__badge">Customer feedback, simplified</span>
          <h1>Know how your customers feel — in one pulse.</h1>
          <p class="hero__sub">
            PulseDesk gives you a beautiful three-question feedback form, one link to share
            anywhere, and a clear view of every response. Pro adds an instant summary of what
            your customers are really saying.
          </p>
          <div class="hero__actions">
            ${primaryCta}
            <a class="btn btn--ghost btn--lg" href="#pricing">See pricing</a>
          </div>
          <ul class="hero__chips" aria-label="Highlights">
            <li>3-question forms</li>
            <li>One share link</li>
            <li>Response dashboard</li>
            <li>Smart summaries</li>
          </ul>
        </div>
      </section>

      <section class="landing__section" id="how-it-works">
        <h2>How it works</h2>
        <div class="steps">
          <article class="step-card">
            <span class="step-card__num">1</span>
            <h3>Create your form</h3>
            <p>Give it a title and ask the three questions that matter most to you.</p>
          </article>
          <article class="step-card">
            <span class="step-card__num">2</span>
            <h3>Share one link</h3>
            <p>Send it by email, drop it in a receipt, or post it anywhere your customers are.</p>
          </article>
          <article class="step-card">
            <span class="step-card__num">3</span>
            <h3>Read the pulse</h3>
            <p>Every answer lands in your dashboard. Pro condenses them into themes and next steps.</p>
          </article>
        </div>
      </section>

      <section class="landing__section landing__section--alt">
        <h2>Built for small teams who actually read feedback</h2>
        <div class="feature-grid">
          <article class="feature-card"><h3>No respondent accounts</h3><p>Customers answer in seconds — no sign-up wall in front of your questions.</p></article>
          <article class="feature-card"><h3>Focused by design</h3><p>Three questions keep completion high and answers thoughtful.</p></article>
          <article class="feature-card"><h3>Open and close anytime</h3><p>Pause a form with one switch when a campaign ends.</p></article>
          <article class="feature-card"><h3>Summaries that save hours</h3><p>Pro turns hundreds of answers into sentiment, themes, and one next step.</p></article>
          <article class="feature-card"><h3>Private by default</h3><p>Only you can see your responses. Share links show questions, never answers.</p></article>
          <article class="feature-card"><h3>Works everywhere</h3><p>Forms look great on phones, tablets, and desktops out of the box.</p></article>
        </div>
      </section>

      <section class="landing__section" id="pricing">
        <h2>Simple pricing</h2>
        <p class="landing__section-sub">Start free. Upgrade when the responses keep coming.</p>
        <div class="price-grid">
          ${planCard(data.plans?.free ?? { name: "Free", priceLabel: "$0", interval: "forever", features: [] }, false)}
          ${planCard(data.plans?.pro ?? { name: "Pro", priceLabel: "$9", interval: "per month", features: [] }, true)}
        </div>
      </section>

      <section class="landing__section landing__section--alt" id="faq">
        <h2>Frequently asked questions</h2>
        <div class="faq">
          <details>
            <summary>Who is PulseDesk for?</summary>
            <p>Small businesses, indie makers, and teams who want honest customer feedback without setting up a survey suite.</p>
          </details>
          <details>
            <summary>Do my customers need an account?</summary>
            <p>No. Anyone with your share link can answer your three questions — optionally leaving their name.</p>
          </details>
          <details>
            <summary>What does the free plan include?</summary>
            <p>Up to 2 feedback forms with 50 responses each, a shareable link, and the full response dashboard.</p>
          </details>
          <details>
            <summary>What extra do I get with Pro?</summary>
            <p>Unlimited forms and responses, plus one-click summaries of what your customers are saying — for $9 per month, cancel anytime.</p>
          </details>
          <details>
            <summary>Can I close a form?</summary>
            <p>Yes. Deactivate any form and its link stops accepting new responses immediately; your collected answers stay safe.</p>
          </details>
        </div>
      </section>

      <footer class="landing__footer">
        <span class="brand-wordmark brand-wordmark--sm">Pulse<span>Desk</span></span>
        <p>Feedback forms with a pulse. Start free, upgrade when you grow.</p>
      </footer>
    </div>`;
}

export function renderAuth(container) {
  const state = getState();
  if (state.session && state.profile) {
    location.hash = "#/dashboard";
    return;
  }

  container.innerHTML = `
    <div class="auth-page">
      <header class="landing__topbar">
        <a class="brand-wordmark" href="#/">Pulse<span>Desk</span></a>
        <a class="btn btn--ghost" href="#/">Back to start</a>
      </header>
      <div class="auth-card">
        <h1 class="auth-card__title">Welcome to PulseDesk</h1>
        <div class="auth-tabs" role="tablist" aria-label="Sign in or create account">
          <button type="button" role="tab" id="tab-signin" aria-selected="true" aria-controls="auth-form" class="auth-tab is-active" data-mode="signin">Sign in</button>
          <button type="button" role="tab" id="tab-signup" aria-selected="false" aria-controls="auth-form" class="auth-tab" data-mode="signup">Create account</button>
        </div>
        <form id="auth-form" class="auth-form" role="tabpanel" novalidate>
          <div class="field" id="field-name" hidden>
            <label for="auth-name">Your name</label>
            <input id="auth-name" name="name" type="text" autocomplete="name" maxlength="80" placeholder="Alex Baker" />
          </div>
          <div class="field">
            <label for="auth-email">Email</label>
            <input id="auth-email" name="email" type="email" autocomplete="email" required placeholder="you@company.com" />
          </div>
          <div class="field">
            <label for="auth-password">Password</label>
            <input id="auth-password" name="password" type="password" autocomplete="current-password" required minlength="6" placeholder="••••••••" />
          </div>
          <div id="auth-notice" class="auth-notice" aria-live="polite"></div>
          <button type="submit" class="btn btn--primary btn--block" id="auth-submit">Sign in</button>
          <p class="auth-trust">
            Sign-in is handled securely by Supabase. If you have used another service from the
            same provider, the same account may work here.
          </p>
        </form>
      </div>
    </div>`;

  let mode = "signin";
  const form = container.querySelector("#auth-form");
  const nameField = container.querySelector("#field-name");
  const nameInput = container.querySelector("#auth-name");
  const passwordInput = container.querySelector("#auth-password");
  const submitBtn = container.querySelector("#auth-submit");
  const notice = container.querySelector("#auth-notice");

  const setNotice = (kind, text) => {
    notice.innerHTML = text ? `<div class="notice notice--${kind}">${escapeHtml(text)}</div>` : "";
  };

  container.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      mode = tab.dataset.mode;
      container.querySelectorAll(".auth-tab").forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
      });
      nameField.hidden = mode !== "signup";
      passwordInput.autocomplete = mode === "signup" ? "new-password" : "current-password";
      submitBtn.textContent = mode === "signup" ? "Create account" : "Sign in";
      setNotice("", "");
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) {
      setNotice("error", "Please fill in your email and password.");
      return;
    }
    setBusy(submitBtn, true, mode === "signup" ? "Creating account…" : "Signing in…");
    setNotice("", "");
    try {
      if (mode === "signup") {
        const result = await signUpAccount(email, password, nameInput.value.trim());
        if (result.confirmationRequired) {
          setNotice("success", "Almost there — check your inbox and confirm your email, then come back and sign in.");
          setBusy(submitBtn, false);
          return;
        }
      } else {
        await signIn(email, password);
      }
      location.hash = "#/dashboard";
    } catch (err) {
      setNotice("error", err.message || "Something went wrong. Try again.");
      setBusy(submitBtn, false);
    }
  });
}
