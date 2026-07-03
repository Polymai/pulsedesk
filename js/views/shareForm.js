// Public feedback form reached through the share link (#/f/:slug), plus the
// thank-you state after submitting.

import { getPublicFormBySlug } from "../api/forms.js";
import { submitPublicResponse } from "../api/responses.js";
import { escapeHtml, setBusy, loadingHtml, noticeHtml } from "../ui.js";

export async function render(container, params) {
  container.innerHTML = `
    <div class="public-page">
      <header class="public-page__topbar">
        <a class="brand-wordmark brand-wordmark--sm" href="#/">Pulse<span>Desk</span></a>
      </header>
      <div class="public-card" id="public-card">${loadingHtml("Loading form…")}</div>
    </div>`;

  const card = container.querySelector("#public-card");

  let form;
  try {
    form = await getPublicFormBySlug(params.slug);
  } catch (err) {
    card.innerHTML = `
      ${noticeHtml("error", err.message)}
      <button type="button" class="btn btn--primary" id="retry-public">Try again</button>`;
    card.querySelector("#retry-public").addEventListener("click", () => render(container, params));
    return;
  }

  if (!form || !form.is_active) {
    card.innerHTML = `
      <div class="public-closed">
        <h1>This form isn't taking responses</h1>
        <p>The link may have expired or the form is paused. If someone sent it to you, let them know.</p>
        <a class="btn btn--ghost" href="#/">What is PulseDesk?</a>
      </div>`;
    return;
  }

  const questions = [form.question1, form.question2, form.question3];
  card.innerHTML = `
    <h1 class="public-card__title">${escapeHtml(form.title)}</h1>
    <p class="public-card__sub">Three quick questions — your answers go straight to the team.</p>
    <form id="public-form" novalidate>
      ${questions.map((q, i) => `
        <div class="field">
          <label for="p-a${i + 1}">${escapeHtml(q)}</label>
          <textarea id="p-a${i + 1}" name="a${i + 1}" rows="3" maxlength="2000" required
            placeholder="Your answer…"></textarea>
        </div>`).join("")}
      <div class="field">
        <label for="p-name">Your name <span class="field__optional">(optional)</span></label>
        <input id="p-name" name="name" type="text" maxlength="80" autocomplete="name" placeholder="Anonymous" />
      </div>
      <div id="public-notice" aria-live="polite"></div>
      <button type="submit" class="btn btn--primary btn--lg btn--block" id="public-submit">Send feedback</button>
    </form>`;

  const publicForm = card.querySelector("#public-form");
  const submitBtn = card.querySelector("#public-submit");
  const noticeEl = card.querySelector("#public-notice");

  publicForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = {
      answer1: publicForm.a1.value.trim(),
      answer2: publicForm.a2.value.trim(),
      answer3: publicForm.a3.value.trim(),
      respondent_name: publicForm.name.value.trim(),
    };
    if (!answers.answer1 && !answers.answer2 && !answers.answer3) {
      noticeEl.innerHTML = noticeHtml("error", "Please answer at least one question before sending.");
      return;
    }
    noticeEl.innerHTML = "";
    setBusy(submitBtn, true, "Sending…");
    try {
      await submitPublicResponse(form.id, answers);
      card.innerHTML = `
        <div class="public-thanks">
          <div class="public-thanks__pulse" aria-hidden="true"></div>
          <h1>Thank you!</h1>
          <p>Your feedback is on its way to the team behind “${escapeHtml(form.title)}”.</p>
          <a class="btn btn--ghost" href="#/">Create your own feedback form</a>
        </div>`;
    } catch (err) {
      setBusy(submitBtn, false);
      noticeEl.innerHTML = noticeHtml("error", err.message);
    }
  });
}
