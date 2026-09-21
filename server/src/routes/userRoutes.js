import { Router } from "express";
import * as controller from "../controllers/userController.js";
import auth from "../middleware/authMiddleware.js";
import roles, { selfOrAdmin } from "../middleware/roleMiddleware.js";
import validate, {
  listSchema,
  idSchema,
  profileSchema,
  statusSchema,
} from "../middleware/validate.js";
const router = Router();
router.use(auth);
router.get(
  "/",
  roles(["admin"]),
  validate(listSchema, "query"),
  controller.list,
);
router.get(
  "/:id",
  roles(["trainee", "trainer", "admin"]),
  validate(idSchema, "params"),
  selfOrAdmin,
  controller.get,
);
router.patch(
  "/:id",
  roles(["trainee", "trainer", "admin"]),
  validate(idSchema, "params"),
  selfOrAdmin,
  validate(profileSchema),
  controller.update,
);
router.patch(
  "/:id/status",
  roles(["admin"]),
  validate(idSchema, "params"),
  validate(statusSchema),
  controller.status,
);
export default router;
