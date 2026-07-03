// Account view: plan and billing, usage, and profile settings.

import { getState, setState } from "../state.js";
import { signOut, saveDisplayName } from "../auth.js";
import { listForms } from "../api/forms.js";
import { loadResponseCounts } from "../api/responses.js";
import { startProCheckout, openBillingPortal } from "../api/billing.js";
import {
  renderAppShell, escapeHtml, toast, setBusy, loadingHtml, noticeHtml,
} from "../ui.js";

function planData(key) {
  const plans = window.__DATA__?.plans || {};
  return plans[key] || plans.free || { name: "Free", priceLabel: "$0", interval: "forever", features: [] };
}

export async function render(container) {
  const main = renderAppShell(container, { onSignOut: signOut });
  main.innerHTML = loadingHtml("Loading your account…");

  const state = getState();
  let forms = [];
  let counts = {};
  try {
    forms = await listForms(state.user.id);
    counts = await loadResponseCounts(forms.map((f) => f.id));
  } catch {
    // usage numbers are non-critical; keep rendering the account page
  }

  const profile = getState().profile;
  const isPro = profile?.plan === "pro";
  const plan = planData(isPro ? "pro" : "free");
  const limits = window.__DATA__?.freeLimits || { forms: 2, responsesPerForm: 50 };
  const totalResponses = Object.values(counts).reduce((a, b) => a + b, 0);
  const checkoutStatus = state.checkoutStatus;

  main.innerHTML = `
    <div class="page-head"><h1>Account</h1></div>
    ${checkoutStatus === "paid" ? noticeHtml("success", "Payment confirmed — welcome to PulseDesk Pro!") : ""}
    ${checkoutStatus === "pending" ? noticeHtml("info", "Your payment is being confirmed. Your plan updates automatically once it clears.") : ""}
    ${checkoutStatus === "cancel" ? noticeHtml("info", "Checkout was canceled. You can upgrade any time.") : ""}

    <div class="account-grid">
      <section class="card">
        <h2>Your plan</h2>
        <p class="account-plan">
          <span class="plan-chip plan-chip--${isPro ? "pro" : "free"}">${escapeHtml(plan.name)}</span>
          <span class="account-plan__price">${escapeHtml(plan.priceLabel)} ${escapeHtml(plan.interval)}</span>
        </p>
        <ul class="plan-features">
          ${plan.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
        </ul>
        ${isPro
          ? `<button type="button" class="btn btn--primary" id="manage-billing">Manage billing</button>
             <p class="card__hint">Invoices, payment method, and cancellation.</p>`
          : `<button type="button" class="btn btn--primary" id="upgrade-plan">Upgrade to Pro — $9/month</button>
             <p class="card__hint">Unlimited forms and responses, plus instant feedback summaries. Cancel anytime.</p>`}
      </section>

      <section class="card">
        <h2>Usage</h2>
        <div class="usage-rows">
          <div class="usage-row">
            <span>Forms</span>
            <strong>${forms.length}${isPro ? "" : ` of ${limits.forms}`}</strong>
          </div>
          <div class="usage-row">
            <span>Total responses</span>
            <strong>${totalResponses}</strong>
          </div>
          <div class="usage-row">
            <span>Responses per form</span>
            <strong>${isPro ? "Unlimited" : `Up to ${limits.responsesPerForm}`}</strong>
          </div>
        </div>
        <a class="btn btn--ghost" href="#/dashboard">Go to your forms</a>
      </section>

      <section class="card">
        <h2>Profile</h2>
        <form id="profile-form" novalidate>
          <div class="field">
            <label for="acc-email">Email</label>
            <input id="acc-email" type="email" value="${escapeHtml(profile?.email || "")}" disabled />
          </div>
          <div class="field">
            <label for="acc-name">Display name</label>
            <input id="acc-name" type="text" maxlength="80" value="${escapeHtml(profile?.display_name || "")}" placeholder="Your name" />
          </div>
          <button type="submit" class="btn btn--primary" id="save-profile">Save profile</button>
        </form>
      </section>

      <section class="card">
        <h2>Session</h2>
        <p class="card__hint">Signed in as ${escapeHtml(profile?.email || "")}.</p>
        <button type="button" class="btn btn--ghost" id="account-signout">Sign out</button>
      </section>
    </div>`;

  if (checkoutStatus) setState({ checkoutStatus: null });

  const upgradeBtn = main.querySelector("#upgrade-plan");
  if (upgradeBtn) {
    upgradeBtn.addEventListener("click", async () => {
      setBusy(upgradeBtn, true, "Opening checkout…");
      try {
        await startProCheckout();
      } catch (err) {
        setBusy(upgradeBtn, false);
        toast(err.message, "error");
      }
    });
  }

  const billingBtn = main.querySelector("#manage-billing");
  if (billingBtn) {
    billingBtn.addEventListener("click", async () => {
      setBusy(billingBtn, true, "Opening billing…");
      try {
        await openBillingPortal();
      } catch (err) {
        setBusy(billingBtn, false);
        toast(err.message, "error");
      }
    });
  }

  main.querySelector("#profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = main.querySelector("#save-profile");
    setBusy(btn, true, "Saving…");
    try {
      await saveDisplayName(main.querySelector("#acc-name").value.trim());
      toast("Profile saved.", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(btn, false);
    }
  });

  main.querySelector("#account-signout").addEventListener("click", () => signOut());
}
