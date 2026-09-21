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
  let message =
    status >= 500 ? "Something went wrong. Please try again." : err.message;
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
