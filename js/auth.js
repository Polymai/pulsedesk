// Auth: sign in, sign up, sign out, session restoration, and the app-local
// profile bootstrap. Auth accounts are shared across apps on this platform;
// the app705_pulsedesk.profiles row is PulseDesk's own access/plan record and
// is created after an explicit sign-in/sign-up action in this app.

import { supabase, storageKey, invokeAppApi } from "./supabaseClient.js";
import { getState, setState, clearSessionState } from "./state.js";

const PENDING_SIGNUP_KEY = storageKey("pendingSignup");
const PENDING_TTL_MS = 60 * 60 * 1000;

// Email links must not carry a hash route; we route after session restore.
export function authEmailRedirect() {
  const isLocal = ["127.0.0.1", "localhost"].includes(location.hostname);
  if (isLocal) return location.origin + location.pathname;
  const siteUrl = window.__POLYMAI_SUPABASE_CONFIG__?.siteUrl;
  return siteUrl || location.origin + location.pathname;
}

function rememberPendingSignup(displayName) {
  try {
    localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify({ displayName, ts: Date.now() }));
  } catch { /* storage unavailable */ }
}

function readPendingSignup() {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > PENDING_TTL_MS) {
      localStorage.removeItem(PENDING_SIGNUP_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearPendingSignup() {
  try { localStorage.removeItem(PENDING_SIGNUP_KEY); } catch { /* ignore */ }
}

// Map raw provider errors to plain copy without disclosing account existence.
function friendlyAuthError(error) {
  const msg = String(error?.message || "");
  if (/already registered|already exists|user already/i.test(msg)) {
    return "This email may already work for sign-in. Sign in instead, or reset your password.";
  }
  if (/invalid login credentials/i.test(msg)) {
    return "That email and password combination did not work. Check both and try again.";
  }
  if (/email not confirmed/i.test(msg)) {
    return "Please confirm your email first — check your inbox for the confirmation link.";
  }
  if (/password should be/i.test(msg)) {
    return "Please choose a longer password (at least 6 characters).";
  }
  return msg || "Sign-in failed. Try again.";
}

// Fetch or create this app's profile row for the signed-in user.
export async function ensureProfile(user) {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("user_id, email, display_name, plan, stripe_customer_id, welcome_email_sent_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (selectError) throw new Error("Could not load your account. Try again.");
  if (existing) {
    clearPendingSignup();
    return existing;
  }

  const pending = readPendingSignup();
  const displayName = pending?.displayName || user.user_metadata?.display_name || "";
  const row = {
    user_id: user.id,
    email: user.email || "",
    display_name: displayName || null,
  };
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert(row)
    .select("user_id, email, display_name, plan, stripe_customer_id, welcome_email_sent_at")
    .single();
  if (insertError) throw new Error("Could not finish setting up your account. Try again.");
  clearPendingSignup();

  // First-time welcome email; never block sign-in on it.
  invokeAppApi("send-welcome-email", {}, { timeoutMs: 15000 }).catch(() => {});
  return created;
}

async function applySession(session) {
  if (!session?.user) {
    clearSessionState();
    setState({ authReady: true });
    return;
  }
  setState({ session, user: session.user, authReady: true });
  try {
    const profile = await ensureProfile(session.user);
    setState({ profile });
  } catch (err) {
    console.error("profile bootstrap failed", err);
    setState({ profile: null });
  }
}

export async function initAuth() {
  const { data } = await supabase.auth.getSession();
  await applySession(data?.session ?? null);
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      clearSessionState();
      setState({ authReady: true });
      if (/^#\/(dashboard|forms|account)/.test(location.hash)) location.hash = "#/";
      return;
    }
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      const current = getState();
      if (event === "TOKEN_REFRESHED" && current.profile) {
        setState({ session, user: session?.user ?? null });
        return;
      }
      applySession(session);
    }
  });
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyAuthError(error));
  await applySession(data.session);
  return data.session;
}

export async function signUpAccount(email, password, displayName) {
  rememberPendingSignup(displayName);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authEmailRedirect(),
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
  if (error) throw new Error(friendlyAuthError(error));
  if (data.session) {
    await applySession(data.session);
    return { session: data.session, confirmationRequired: false };
  }
  return { session: null, confirmationRequired: true };
}

export async function signOut() {
  await supabase.auth.signOut();
  clearSessionState();
  setState({ authReady: true });
  location.hash = "#/";
}

export async function saveDisplayName(displayName) {
  const state = getState();
  if (!state.user) throw new Error("Please sign in again.");
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null, updated_at: new Date().toISOString() })
    .eq("user_id", state.user.id)
    .select("user_id, email, display_name, plan, stripe_customer_id, welcome_email_sent_at")
    .single();
  if (error) throw new Error("Could not save your name. Try again.");
  setState({ profile: data });
  return data;
}

export async function refreshProfile() {
  const state = getState();
  if (!state.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, email, display_name, plan, stripe_customer_id, welcome_email_sent_at")
    .eq("user_id", state.user.id)
    .maybeSingle();
  if (data) setState({ profile: data });
  return data;
}
