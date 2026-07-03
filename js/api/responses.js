// Response data access: owner reads/deletes, public share-link submission,
// and per-form response counts for the dashboard overview.

import { supabase } from "../supabaseClient.js";

export async function listResponses(formId) {
  const { data, error } = await supabase
    .from("responses")
    .select("id, form_id, answer1, answer2, answer3, respondent_name, created_at")
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("Could not load responses.");
  return data || [];
}

// One round trip for the dashboard: count responses per owned form.
export async function loadResponseCounts(formIds) {
  if (!formIds.length) return {};
  const { data, error } = await supabase
    .from("responses")
    .select("form_id")
    .in("form_id", formIds)
    .limit(5000);
  if (error) return {};
  const counts = {};
  for (const row of data || []) counts[row.form_id] = (counts[row.form_id] || 0) + 1;
  return counts;
}

// Public submission through the share link. RLS enforces that the form is
// active and within the free-plan response cap.
export async function submitPublicResponse(formId, { answer1, answer2, answer3, respondent_name }) {
  const { error } = await supabase.from("responses").insert({
    form_id: formId,
    answer1: answer1 || "",
    answer2: answer2 || "",
    answer3: answer3 || "",
    respondent_name: respondent_name || null,
  });
  if (error) {
    const closed = /policy|violates row-level/i.test(error.message || "");
    const friendly = new Error(closed
      ? "This form is not accepting responses right now."
      : "Could not send your feedback. Try again.");
    friendly.code = closed ? "form_closed" : "submit_failed";
    throw friendly;
  }
}

export async function deleteResponse(id) {
  const { error } = await supabase.from("responses").delete().eq("id", id);
  if (error) throw new Error("Could not delete the response.");
}
