// Create and edit flow for a feedback form: title plus exactly three
// questions, with the free-plan form limit surfaced before saving.

import { getState } from "../state.js";
import { signOut } from "../auth.js";
import { listForms, getForm, createForm, updateForm } from "../api/forms.js";
import { startProCheckout } from "../api/billing.js";
import { renderAppShell, escapeHtml, toast, setBusy, loadingHtml, noticeHtml } from "../ui.js";

const DEFAULT_QUESTIONS = [
  "What do you like most about us?",
  "What should we improve?",
  "How likely are you to recommend us, and why?",
];

function freeLimits() {
  return window.__DATA__?.freeLimits || { forms: 2, responsesPerForm: 50 };
}

export async function render(container, params = {}) {
  const main = renderAppShell(container, { onSignOut: signOut });
  const state = getState();
  const isNew = !params.formId;

  main.innerHTML = loadingHtml(isNew ? "Preparing editor…" : "Loading form…");

  let form = null;
  if (!isNew) {
    try {
      form = await getForm(params.formId);
    } catch (err) {
      main.innerHTML = `${noticeHtml("error", err.message)}<a class="btn btn--primary" href="#/dashboard">Back to dashboard</a>`;
      return;
    }
    if (!form) {
      main.innerHTML = `${noticeHtml("error", "This form was not found.")}<a class="btn btn--primary" href="#/dashboard">Back to dashboard</a>`;
      return;
    }
  } else if (state.profile?.plan !== "pro") {
    // Free-plan gate: check the form count before showing the editor.
    let ownForms = state.formsLoaded ? state.forms : null;
    if (!ownForms) {
      try { ownForms = await listForms(state.user.id); } catch { ownForms = []; }
    }
    if (ownForms.length >= freeLimits().forms) {
      main.innerHTML = `
        <a class="back-link" href="#/dashboard">&larr; All forms</a>
        <div class="upgrade-callout upgrade-callout--page">
          <h1>You've used your ${freeLimits().forms} free forms</h1>
          <p>Upgrade to Pro for unlimited forms, unlimited responses, and instant feedback summaries — $9/month, cancel anytime.</p>
          <button type="button" class="btn btn--primary btn--lg" id="upgrade-btn">Upgrade to Pro — $9/month</button>
        </div>`;
      main.querySelector("#upgrade-btn").addEventListener("click", async (event) => {
        setBusy(event.currentTarget, true, "Opening checkout…");
        try {
          await startProCheckout();
        } catch (err) {
          setBusy(event.currentTarget, false);
          toast(err.message, "error");
        }
      });
      return;
    }
  }

  const questions = form
    ? [form.question1, form.question2, form.question3]
    : DEFAULT_QUESTIONS;

  main.innerHTML = `
    <a class="back-link" href="${form ? `#/forms/${form.id}` : "#/dashboard"}">&larr; ${form ? "Back to responses" : "All forms"}</a>
    <div class="page-head">
      <h1>${isNew ? "Create a feedback form" : "Edit form"}</h1>
    </div>
    <form id="editor-form" class="editor" novalidate>
      <div class="field">
        <label for="f-title">Form title</label>
        <input id="f-title" name="title" type="text" required maxlength="120"
          placeholder="e.g. How was your visit?" value="${escapeHtml(form?.title || "")}" />
        <p class="field__hint">Shown at the top of your public form.</p>
      </div>
      ${questions.map((q, i) => `
        <div class="field">
          <label for="f-q${i + 1}">Question ${i + 1}</label>
          <input id="f-q${i + 1}" name="q${i + 1}" type="text" required maxlength="200" value="${escapeHtml(q)}" />
        </div>`).join("")}
      <label class="switch-field">
        <input type="checkbox" id="f-active" ${form ? (form.is_active ? "checked" : "") : "checked"} />
        <span class="switch" aria-hidden="true"></span>
        <span>Open for responses</span>
      </label>
      <div id="editor-notice" aria-live="polite"></div>
      <div class="editor__actions">
        <a class="btn btn--ghost" href="${form ? `#/forms/${form.id}` : "#/dashboard"}">Cancel</a>
        <button type="submit" class="btn btn--primary" id="save-btn">${isNew ? "Create form" : "Save changes"}</button>
      </div>
    </form>`;

  const editorForm = main.querySelector("#editor-form");
  const saveBtn = main.querySelector("#save-btn");
  const noticeEl = main.querySelector("#editor-notice");

  editorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      title: editorForm.title.value.trim(),
      question1: editorForm.q1.value.trim(),
      question2: editorForm.q2.value.trim(),
      question3: editorForm.q3.value.trim(),
      is_active: main.querySelector("#f-active").checked,
    };
    if (!payload.title || !payload.question1 || !payload.question2 || !payload.question3) {
      noticeEl.innerHTML = noticeHtml("error", "Please fill in the title and all three questions.");
      return;
    }
    noticeEl.innerHTML = "";
    setBusy(saveBtn, true, "Saving…");
    try {
      const saved = isNew
        ? await createForm(getState().user.id, payload)
        : await updateForm(form.id, payload);
      toast(isNew ? "Form created — share the link to start collecting feedback." : "Changes saved.", "success");
      location.hash = `#/forms/${saved.id}`;
    } catch (err) {
      setBusy(saveBtn, false);
      noticeEl.innerHTML = noticeHtml("error", err.message);
    }
  });
}
