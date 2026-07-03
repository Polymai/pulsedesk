// Supabase browser client for PulseDesk (app705).
// Reads Polymai runtime config (window.__POLYMAI_SUPABASE_CONFIG__), scopes
// the client to the app schema, uses the app-scoped auth storage key, and
// exposes the app API invoker for Edge Function actions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = (typeof window !== "undefined" && window.__POLYMAI_SUPABASE_CONFIG__) || {};
const appData = (typeof window !== "undefined" && window.__DATA__) || {};

export const supabaseConfig = config;
export const appConfig = appData;

export const supabase = createClient(config.url, config.anonKey, {
  db: { schema: appData.appSchema || "app705_pulsedesk" },
  auth: {
    storageKey: config.authStorageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Every app-owned browser storage key must be app-scoped.
export function storageKey(name) {
  return (config.appStoragePrefix || "polymai:app705:") + name;
}

// POST an action to the app API Edge Function router with the caller's JWT,
// a request timeout, and normalized errors.
export async function invokeAppApi(action, payload = {}, { timeoutMs = 30000 } = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || config.anonKey;
  const url = `${config.functionsBaseUrl}/${appData.apiFunctionName || "app705-pulsedesk-api"}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": config.anonKey,
      },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (err) {
    const aborted = err?.name === "AbortError";
    const error = new Error(aborted ? "The request timed out. Try again." : "Network error. Check your connection and try again.");
    error.code = aborted ? "timeout" : "network";
    throw error;
  } finally {
    clearTimeout(timer);
  }

  let body = null;
  try { body = await response.json(); } catch { body = null; }

  if (!response.ok) {
    const error = new Error(body?.message || friendlyApiError(body?.error) || "Something went wrong. Try again.");
    error.code = body?.error || `http_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return body;
}

function friendlyApiError(code) {
  const map = {
    auth_required: "Please sign in again.",
    upgrade_required: "This feature is part of PulseDesk Pro.",
    setup_required: "This feature is not fully set up yet. Please try again later.",
    no_billing_history: "No billing history yet.",
    no_responses: "No responses to summarize yet.",
  };
  return map[code] || null;
}
