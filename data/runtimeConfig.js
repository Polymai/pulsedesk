// PulseDesk public runtime data (window.__DATA__ pattern).
// Frontend-safe, read-only app identity, plan copy, and free-plan limits.
// Never add secrets here. Secret env vars live in Edge Functions only.
(function () {
  window.__DATA__ = Object.freeze({
    appId: "app705",
    appSchema: "app705_pulsedesk",
    brand: "PulseDesk",
    tagline: "Know how your customers feel — in one pulse.",
    apiFunctionName: "app705-pulsedesk-api",
    freeLimits: Object.freeze({
      forms: 2,
      responsesPerForm: 50,
    }),
    plans: Object.freeze({
      free: Object.freeze({
        key: "free",
        name: "Free",
        priceLabel: "$0",
        interval: "forever",
        features: Object.freeze([
          "Up to 2 feedback forms",
          "50 responses per form",
          "Shareable public link",
          "Response dashboard",
        ]),
      }),
      pro: Object.freeze({
        key: "pro",
        name: "Pro",
        priceLabel: "$9",
        interval: "per month",
        features: Object.freeze([
          "Unlimited feedback forms",
          "Unlimited responses",
          "AI feedback summaries",
          "Priority support",
        ]),
      }),
    }),
  });
})();
