import User from "../models/User.js";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { register, login, me } from "../controllers/authController.js";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate, {
  registerSchema,
  loginSchema,
} from "../middleware/validate.js";
const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
});
router.post("/register", limiter, validate(registerSchema), register);
router.post("/login", limiter, validate(loginSchema), login);
router.get("/me", auth, roles(["trainee", "trainer", "admin"]), me);
router.post(
  "/logout",
  auth,
  roles(["trainee", "trainer", "admin"]),
  async (req, res) => {
    await User.updateOne(
      { _id: req.user._id },
      { $inc: { sessionVersion: 1 } },
    );
    res.json({ success: true, data: {}, message: "All sessions signed out." });
  },
);
export default router;
