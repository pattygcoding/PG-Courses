// jsdom does not implement scrolling, and the router's scrollBehavior calls
// window.scrollTo on every navigation. Stub it so the test output stays clean.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {}
}
