// Express 4 does not catch rejected promises thrown inside async route
// handlers — an unhandled rejection there just hangs the request forever
// (no response is ever sent). Wrap every async handler with this so any
// thrown/rejected error is forwarded to the app's error-handling
// middleware and turned into a real JSON error response.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
