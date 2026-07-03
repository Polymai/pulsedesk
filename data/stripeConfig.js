// Polymai runtime Stripe config.
// Frontend-safe only: publishable key, Connect client ID, mode, redirect defaults, and function URL.
// Never add Stripe secret keys, webhook secrets, restricted keys, or backend credentials here.
(function () {
  const config = Object.freeze({
    mode: "test",
    publishableKey: "pk_test_51TS3spRndyGeYiPN1ggn5xv2S9j498dTFjPEpx3uBcxjB2HNidQMf2LJ0vcTzso4JzbVVfFwHQf8IYFTZ88Y4xNm00gTQrWc28",
    connectClientId: "ca_UVJpPMLXXKDt2D0AfRrNodn9Y73VWs4Q",
    stripeConnectClientId: "ca_UVJpPMLXXKDt2D0AfRrNodn9Y73VWs4Q",
    functionsBaseUrl: "https://pfnlebwkbhblytpvaokd.supabase.co/functions/v1",
    defaultSuccessUrl: "",
    defaultCancelUrl: "",
    defaultPriceIds: [],
    // App payment routing (frontend-safe function names only).
    apiFunctionName: "app705-pulsedesk-api",
    checkoutFunctionName: "app705-pulsedesk-api",
    billingPortalFunctionName: "app705-pulsedesk-api",
    webhookFunctionName: "app705-pulsedesk-stripe-webhook",
    webhookRouterFunctionName: "polymai-stripe-webhook-router",
    // Pricing intent: server-owned plans table + price_data in the API router.
    dynamicPricing: true,
    fixedProductPriceAmount: 900,
    fixedProductCurrency: "usd",
    fixedProductInterval: "month",
  });
  window.__POLYMAI_STRIPE_CONFIG__ = config;
})();
