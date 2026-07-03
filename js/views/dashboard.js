// Signed-in dashboard: forms overview grid, and the per-form response
// overview with share link and AI summary panel.

import { getState, setState } from "../state.js";
import { signOut } from "../auth.js";
import { listForms, getForm, updateForm, deleteForm, shareUrlForForm } from "../api/forms.js";
import { listResponses, loadResponseCounts, deleteResponse } from "../api/responses.js";
import { requestFeedbackSummary, loadLatestSummary } from "../api/ai.js";
import { startProCheckout } from "../api/billing.js";
import {
  renderAppShell, escapeHtml, formatDate, toast, setBusy, confirmDialog,
  emptyStateHtml, loadingHtml, noticeHtml, showAppLoader, hideAppLoader,
} from "../ui.js";

function freeLimits() {
  return window.__DATA__?.freeLimits || { forms: 2, responsesPerForm: 50 };
}

async function refreshForms() {
  const state = getState();
  const forms = await listForms(state.user.id);
  const counts = await loadResponseCounts(forms.map((f) => f.id));
  setState({ forms, formsLoaded: true, formsError: null, responseCounts: counts });
}

export async function render(container, params = {}) {
  const main = renderAppShell(container, { onSignOut: signOut });
  if (params.formId) {
    await renderDetail(main, params.formId);
  } else {
    await renderOverview(main);
  }
}

// ---------------------------------------------------------------------------
// Forms overview
// ---------------------------------------------------------------------------
async function renderOverview(main) {
  main.innerHTML = loadingHtml("Loading your forms…");
  try {
    await refreshForms();
  } catch (err) {
    main.innerHTML = `
      ${noticeHtml("error", err.message || "Could not load your forms.")}
      <button type="button" class="btn btn--primary" id="retry-forms">Try again</button>`;
    main.querySelector("#retry-forms").addEventListener("click", () => renderOverview(main));
    return;
  }

  const state = getState();
  const { forms, responseCounts, profile } = state;
  const isPro = profile?.plan === "pro";
  const limits = freeLimits();

  if (!forms.length) {
    main.innerHTML = `
      <div class="page-head">
        <h1>Your forms</h1>
      </div>
      ${emptyStateHtml({
        title: "No forms yet",
        body: "Create your first feedback form — a title and three questions is all it takes.",
        actionHref: "#/forms/new",
        actionLabel: "Create your first form",
      })}`;
    return;
  }

  const totalResponses = Object.values(responseCounts).reduce((a, b) => a + b, 0);
  const usageLine = isPro
    ? `<span class="usage-line">Pro plan · unlimited forms and responses</span>`
    : `<span class="usage-line">${forms.length} of ${limits.forms} free forms · <a href="#/account">Upgrade for unlimited</a></span>`;

  main.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Your forms</h1>
        ${usageLine}
      </div>
      <a class="btn btn--primary" href="#/forms/new">New form</a>
    </div>
    <div class="stat-row">
      <div class="stat"><span class="stat__value">${forms.length}</span><span class="stat__label">Forms</span></div>
      <div class="stat"><span class="stat__value">${totalResponses}</span><span class="stat__label">Responses</span></div>
      <div class="stat"><span class="stat__value">${forms.filter((f) => f.is_active).length}</span><span class="stat__label">Open for feedback</span></div>
    </div>
    <div class="form-grid">
      ${forms.map((form) => {
        const count = responseCounts[form.id] || 0;
        return `
          <article class="form-card" data-id="${form.id}">
            <div class="form-card__top">
              <h2><a href="#/forms/${form.id}">${escapeHtml(form.title)}</a></h2>
              <span class="badge ${form.is_active ? "badge--live" : "badge--paused"}">${form.is_active ? "Open" : "Paused"}</span>
            </div>
            <p class="form-card__meta">${count} response${count === 1 ? "" : "s"} · created ${formatDate(form.created_at)}</p>
            <div class="form-card__actions">
              <a class="btn btn--sm btn--primary" href="#/forms/${form.id}">Responses</a>
              <a class="btn btn--sm btn--ghost" href="#/forms/${form.id}/edit">Edit</a>
              <button type="button" class="btn btn--sm btn--ghost" data-act="copy">Copy link</button>
              <button type="button" class="btn btn--sm btn--ghost btn--danger-ghost" data-act="delete">Delete</button>
            </div>
          </article>`;
      }).join("")}
    </div>`;

  main.querySelectorAll(".form-card").forEach((card) => {
    const form = forms.find((f) => f.id === card.dataset.id);
    card.querySelector('[data-act="copy"]').addEventListener("click", async (event) => {
      try {
        await navigator.clipboard.writeText(shareUrlForForm(form));
        toast("Share link copied.", "success");
      } catch {
        toast("Could not copy — the link is on the form page.", "error");
      }
    });
    card.querySelector('[data-act="delete"]').addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: "Delete this form?",
        body: `"${form.title}" and all of its responses will be permanently deleted.`,
        confirmLabel: "Delete form",
        danger: true,
      });
      if (!ok) return;
      try {
        await deleteForm(form.id);
        toast("Form deleted.", "success");
        await renderOverview(main);
      } catch (err) {
        toast(err.message, "error");
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Response overview for one form
// ---------------------------------------------------------------------------
async function renderDetail(main, formId) {
  main.innerHTML = loadingHtml("Loading responses…");

  let form;
  let responses;
  let summary;
  try {
    form = await getForm(formId);
    if (!form) {
      main.innerHTML = `
        ${noticeHtml("error", "This form was not found.")}
        <a class="btn btn--primary" href="#/dashboard">Back to dashboard</a>`;
      return;
    }
    [responses, summary] = await Promise.all([listResponses(formId), loadLatestSummary(formId)]);
  } catch (err) {
    main.innerHTML = `
      ${noticeHtml("error", err.message || "Could not load this form.")}
      <a class="btn btn--primary" href="#/dashboard">Back to dashboard</a>`;
    return;
  }

  setState({ selectedFormId: formId, responses, responsesLoaded: true, latestSummary: summary });
  const state = getState();
  const isPro = state.profile?.plan === "pro";
  const shareUrl = shareUrlForForm(form);
  const questions = [form.question1, form.question2, form.question3];

  main.innerHTML = `
    <a class="back-link" href="#/dashboard">&larr; All forms</a>
    <div class="page-head">
      <div>
        <h1>${escapeHtml(form.title)}</h1>
        <span class="usage-line">${responses.length} response${responses.length === 1 ? "" : "s"} ·
          <span class="badge ${form.is_active ? "badge--live" : "badge--paused"}">${form.is_active ? "Open" : "Paused"}</span>
        </span>
      </div>
      <div class="page-head__actions">
        <button type="button" class="btn btn--ghost" id="toggle-active">${form.is_active ? "Pause form" : "Reopen form"}</button>
        <a class="btn btn--ghost" href="#/forms/${form.id}/edit">Edit</a>
      </div>
    </div>

    <section class="share-panel">
      <label for="share-url">Share link</label>
      <div class="share-panel__row">
        <input id="share-url" type="text" readonly value="${escapeHtml(shareUrl)}" />
        <button type="button" class="btn btn--primary" id="copy-share">Copy</button>
      </div>
      <p class="share-panel__hint">Anyone with this link can answer your three questions. No account needed.</p>
    </section>

    <section class="summary-panel">
      <div class="summary-panel__head">
        <h2>Feedback summary</h2>
        ${isPro
          ? `<button type="button" class="btn btn--primary" id="generate-summary" ${responses.length ? "" : "disabled"}>
               ${summary ? "Refresh summary" : "Generate summary"}
             </button>`
          : ""}
      </div>
      <div id="summary-body">
        ${isPro
          ? (summary
              ? `<pre class="summary-text">${escapeHtml(summary.summary)}</pre>
                 <p class="summary-meta">Based on ${summary.response_count} responses · ${formatDate(summary.created_at)}</p>`
              : `<p class="summary-empty">${responses.length
                  ? "Generate a summary to see sentiment, key themes, and a suggested next step."
                  : "Summaries unlock once your first responses arrive."}</p>`)
          : `<div class="upgrade-callout">
               <p><strong>See what your customers are really saying.</strong>
               Pro condenses every response into sentiment, themes, and one next step — $9/month, unlimited forms and responses.</p>
               <button type="button" class="btn btn--primary" id="upgrade-from-summary">Upgrade to Pro — $9/month</button>
             </div>`}
      </div>
    </section>

    <section class="responses-section">
      <h2>Responses</h2>
      ${responses.length === 0
        ? emptyStateHtml({
            title: "No responses yet",
            body: "Share your link to start collecting feedback. Responses appear here the moment they arrive.",
          })
        : `<ul class="response-list">
            ${responses.map((r) => `
              <li class="response-card" data-id="${r.id}">
                <div class="response-card__head">
                  <strong>${escapeHtml(r.respondent_name || "Anonymous")}</strong>
                  <span>${formatDate(r.created_at)}</span>
                </div>
                ${questions.map((q, i) => `
                  <div class="response-card__qa">
                    <p class="response-card__q">${escapeHtml(q)}</p>
                    <p class="response-card__a">${escapeHtml(r["answer" + (i + 1)] || "—")}</p>
                  </div>`).join("")}
                <button type="button" class="btn btn--sm btn--ghost btn--danger-ghost" data-act="delete-response">Remove</button>
              </li>`).join("")}
          </ul>`}
    </section>`;

  main.querySelector("#copy-share").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast("Share link copied.", "success");
    } catch {
      main.querySelector("#share-url").select();
      toast("Press Ctrl+C to copy the selected link.", "info");
    }
  });

  main.querySelector("#toggle-active").addEventListener("click", async (event) => {
    const btn = event.currentTarget;
    setBusy(btn, true);
    try {
      await updateForm(form.id, { is_active: !form.is_active });
      toast(form.is_active ? "Form paused — the link stops accepting responses." : "Form reopened.", "success");
      await renderDetail(main, formId);
    } catch (err) {
      setBusy(btn, false);
      toast(err.message, "error");
    }
  });

  const generateBtn = main.querySelector("#generate-summary");
  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      setBusy(generateBtn, true, "Summarizing…");
      showAppLoader("Reading your feedback…");
      try {
        const result = await requestFeedbackSummary(formId);
        hideAppLoader();
        toast(result.cached ? "Summary is up to date." : "Summary ready.", "success");
        await renderDetail(main, formId);
      } catch (err) {
        hideAppLoader();
        setBusy(generateBtn, false);
        toast(err.message, "error");
      }
    });
  }

  const upgradeBtn = main.querySelector("#upgrade-from-summary");
  if (upgradeBtn) {
    upgradeBtn.addEventListener("click", async () => {
      setBusy(upgradeBtn, true, "Opening checkout…");
      try {
        await startProCheckout();
      } catch (err) {
        setBusy(upgradeBtn, false);
        toast(err.message, "error");
      }
    });
  }

  main.querySelectorAll('[data-act="delete-response"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const card = btn.closest(".response-card");
      const ok = await confirmDialog({
        title: "Remove this response?",
        body: "The response will be permanently deleted.",
        confirmLabel: "Remove",
        danger: true,
      });
      if (!ok) return;
      try {
        await deleteResponse(card.dataset.id);
        toast("Response removed.", "success");
        await renderDetail(main, formId);
      } catch (err) {
        toast(err.message, "error");
      }
    });
  });
}
