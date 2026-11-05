// Mock / Real. Rule 19: runtime server-side mode, POST /api/mode with exactly {source},
// GET /api/info returns {source, realAvailable}. For this lab, "Real" = scan LIVE data the
// operator supplies in the request body (their own tool metadata / Agent Card JSON) instead
// of the built-in fixtures; it is still in-process and makes no outbound call. Mock = the
// built-in poisoned/clean fixtures. Default: Mock (there is nothing to configure).
export const MODES = ['mock', 'real'];

export function createMode() {
  const state = { source: 'mock' };
  return {
    info: () => ({ source: state.source, realAvailable: true, realReason: null }),
    source: () => state.source,
    set: (source) => { state.source = source; },
  };
}
