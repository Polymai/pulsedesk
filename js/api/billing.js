// Billing actions: Pro checkout, billing portal, and checkout reconciliation.
// All Stripe work happens server-side in the app API Edge Function; the
// browser only receives redirect URLs and status. Frontend Stripe settings
// come from window.__POLYMAI_STRIPE_CONFIG__ (publishable config only).

import { invokeAppApi } from "../supabaseClient.js";
import { showAppLoader, hideAppLoader } from "../ui.js";

function stripeConfig() {
  return (typeof window !== "undefined" && window.__POLYMAI_STRIPE_CONFIG__) || {};
}

function returnUrl() {
  return location.origin + location.pathname;
}

// Starts hosted checkout for the Pro plan. Keeps the app loader visible
// during the redirect; hides it only on failure.
export async function startProCheckout() {
  showAppLoader("Opening secure checkout…");
  try {
    const result = await invokeAppApi("create-checkout-session", {
      plan_key: "pro",
      return_url: returnUrl(),
      mode: stripeConfig().mode || "test",
    }, { timeoutMs: 30000 });
    if (!result?.url) throw new Error("Checkout is unavailable right now. Try again.");
    location.href = result.url;
  } catch (err) {
    hideAppLoader();
    throw err;
  }
}

// Opens the hosted billing portal (invoices, payment method, cancellation).
export async function openBillingPortal() {
  showAppLoader("Opening billing…");
  try {
    const result = await invokeAppApi("create-billing-portal", {
      return_url: returnUrl(),
    }, { timeoutMs: 30000 });
    if (!result?.url) throw new Error("Billing is unavailable right now. Try again.");
    location.href = result.url;
  } catch (err) {
    hideAppLoader();
    throw err;
  }
}

// Server-side verification of a returned checkout session; the browser never
// decides plan or payment state.
export async function reconcileCheckout(sessionId) {
  return invokeAppApi("reconcile-checkout", { session_id: sessionId }, { timeoutMs: 30000 });
}
