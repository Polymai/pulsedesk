// AI feedback summaries: request a new summary through the app API Edge
// Function (Pro feature, runs server-side) and read stored summaries.

import { supabase, invokeAppApi } from "../supabaseClient.js";

// Longer timeout: summaries can take a while on large forms.
export async function requestFeedbackSummary(formId) {
  return invokeAppApi("summarize-feedback", { form_id: formId }, { timeoutMs: 60000 });
}

export async function loadLatestSummary(formId) {
  const { data, error } = await supabase
    .from("ai_summaries")
    .select("id, form_id, summary, response_count, created_at")
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}
