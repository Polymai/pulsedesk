// Owner feedback form CRUD against app705_pulsedesk.forms.
// The Supabase client is scoped to the app schema, so local table names here
// resolve to app705_pulsedesk.* exactly as defined in supabase/schema.sql.

import { supabase } from "../supabaseClient.js";

const FORM_FIELDS = "id, owner_id, title, question1, question2, question3, slug, is_active, created_at, updated_at";

export function makeSlug() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let slug = "";
  const random = new Uint32Array(10);
  crypto.getRandomValues(random);
  for (const value of random) slug += alphabet[value % alphabet.length];
  return slug;
}

export async function listForms(ownerId) {
  const { data, error } = await supabase
    .from("forms")
    .select(FORM_FIELDS)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your forms.");
  return data || [];
}

export async function getForm(id) {
  const { data, error } = await supabase
    .from("forms")
    .select(FORM_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load this form.");
  return data;
}

// Public share-link read; RLS only exposes active forms to visitors.
export async function getPublicFormBySlug(slug) {
  const { data, error } = await supabase
    .from("forms")
    .select("id, title, question1, question2, question3, slug, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Could not load this feedback form.");
  return data;
}

export async function createForm(ownerId, { title, question1, question2, question3, is_active = true }) {
  const { data, error } = await supabase
    .from("forms")
    .insert({
      owner_id: ownerId,
      title,
      question1,
      question2,
      question3,
      slug: makeSlug(),
      is_active,
    })
    .select(FORM_FIELDS)
    .single();
  if (error) {
    if (/policy|violates row-level/i.test(error.message || "")) {
      const limitError = new Error("You have reached the free plan limit of 2 forms. Upgrade to Pro for unlimited forms.");
      limitError.code = "form_limit";
      throw limitError;
    }
    throw new Error("Could not create the form. Try again.");
  }
  return data;
}

export async function updateForm(id, patch) {
  const { data, error } = await supabase
    .from("forms")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(FORM_FIELDS)
    .single();
  if (error) throw new Error("Could not save changes. Try again.");
  return data;
}

export async function deleteForm(id) {
  const { error } = await supabase.from("forms").delete().eq("id", id);
  if (error) throw new Error("Could not delete the form. Try again.");
}

export function shareUrlForForm(form) {
  return `${location.origin}${location.pathname}#/f/${form.slug}`;
}
