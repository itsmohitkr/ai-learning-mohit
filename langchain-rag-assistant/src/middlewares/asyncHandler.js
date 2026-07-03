/**
 * Express doesn't automatically catch rejected promises from async route
 * handlers. Without this wrapper, an error thrown inside an `async`
 * controller becomes an unhandled rejection instead of a proper HTTP
 * response. Wrap every async controller with this before registering it
 * on a route.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
