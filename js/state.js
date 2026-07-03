// App state: session, profile, forms, selected form, and UI status.
// State only — no data access, no rendering. Views read state; loaders and
// action handlers mutate it through setState.

const state = {
  authReady: false,
  session: null,
  user: null,
  profile: null,
  forms: [],
  formsLoaded: false,
  formsError: null,
  responseCounts: {},
  selectedFormId: null,
  responses: [],
  responsesLoaded: false,
  responsesError: null,
  latestSummary: null,
  checkoutStatus: null,
  route: { name: "landing", params: {} },
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const listener of listeners) listener(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearSessionState() {
  setState({
    session: null,
    user: null,
    profile: null,
    forms: [],
    formsLoaded: false,
    formsError: null,
    responseCounts: {},
    selectedFormId: null,
    responses: [],
    responsesLoaded: false,
    responsesError: null,
    latestSummary: null,
    checkoutStatus: null,
  });
}
