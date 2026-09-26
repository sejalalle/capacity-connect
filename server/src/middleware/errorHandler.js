export class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
export default function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  // A deliberate HttpError carries a safe, already-worded explanation a person
  // can act on (for example the AI fallback guidance). Anything unexpected —
  // including every non-HttpError 5xx — stays masked.
  let message =
    err instanceof HttpError || status < 500
      ? err.message || "Something went wrong. Please try again."
      : "Something went wrong. Please try again.";
  if (err.code === 11000) {
    status = 409;
    message = err.keyPattern?.email
      ? "An account with this email already exists."
      : "This record already exists. Duplicate decisions or admissions are not allowed.";
  }
  if (err.name === "ValidationError" || err.name === "CastError") {
    status = 400;
    message = "Invalid input.";
  }
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body.";
  }
  if (
    status >= 500 &&
    (process.env.NODE_ENV !== "test" ||
      process.env.DEBUG_TEST_ERRORS === "true")
  )
    console.error(err.name, err.message);
  res.status(status).json({
    success: false,
    message,
    ...(Array.isArray(err.errors) && err.errors.length
      ? { errors: err.errors }
      : {}),
  });
}
