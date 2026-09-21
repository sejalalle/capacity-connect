import { HttpError } from "./errorHandler.js";
export default function roleMiddleware(roles) {
  return (req, res, next) => {
    if (!req.user) throw new HttpError(401, "Authentication required");
    if (!roles.includes(req.user.role))
      throw new HttpError(
        403,
        "You do not have permission to access this resource.",
      );
    next();
  };
}
export function selfOrAdmin(req, res, next) {
  if (req.user.role !== "admin" && req.user.id !== req.params.id)
    throw new HttpError(
      403,
      "You do not have permission to access this profile.",
    );
  next();
}
