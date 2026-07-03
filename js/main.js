// Bootstrap: runtime config sanity, auth restoration, checkout-return
// reconciliation, and the initial route.

import { initAuth, refreshProfile } from "./auth.js";
import { startRouter, route } from "./router.js";
import { getState, setState, subscribe } from "./state.js";
import { reconcileCheckout } from "./api/billing.js";
import { toast, showAppLoader, hideAppLoader } from "./ui.js";

async function handleCheckoutReturn() {
  const params = new URLSearchParams(location.search);
  const checkout = params.get("checkout");
  if (!checkout) return;

  const sessionId = params.get("session_id");
  // Clean the query string; keep the hash so routing still works.
  history.replaceState(null, "", location.pathname + (location.hash || "#/account"));
  if (!location.hash) location.hash = "#/account";

  if (checkout === "cancel") {
    setState({ checkoutStatus: "cancel" });
    return;
  }
  if (checkout !== "success" || !sessionId) return;

  if (!getState().session) {
    toast("Sign in to finish confirming your payment.", "info");
    return;
  }

  showAppLoader("Confirming your payment…");
  try {
    const result = await reconcileCheckout(sessionId);
    if (result?.status === "paid") {
      await refreshProfile();
      setState({ checkoutStatus: "paid" });
      toast("Payment confirmed — welcome to Pro!", "success");
    } else {
      setState({ checkoutStatus: "pending" });
      toast("Payment is being confirmed. Your plan updates automatically.", "info");
    }
  } catch (err) {
    setState({ checkoutStatus: "pending" });
    toast(err.message || "Could not confirm the payment yet. It updates automatically.", "error");
  } finally {
    hideAppLoader();
  }
}

async function boot() {
  const supabaseConfig = window.__POLYMAI_SUPABASE_CONFIG__;
  if (!supabaseConfig?.url || !supabaseConfig?.anonKey) {
    document.getElementById("app").innerHTML =
      '<div class="public-page"><div class="public-card"><h1>PulseDesk is starting up</h1>' +
      "<p>The app is not fully provisioned yet. Please try again in a moment.</p></div></div>";
    return;
  }

  await initAuth();
  await handleCheckoutReturn();

  // Default landing for signed-in users hitting the bare URL.
  if (!location.hash && getState().session) location.hash = "#/dashboard";

  // Re-route when auth flips (sign-in from another tab, sign-out, recovery).
  let lastAuthKey = getState().session?.user?.id || "";
  subscribe((state) => {
    const key = state.session?.user?.id || "";
    if (key !== lastAuthKey) {
      lastAuthKey = key;
      route();
    }
  });

  await startRouter();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
