import { Router } from "express";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import { capacityFor } from "../services/capacityService.js";
const router = Router();

router.post(
  "/capacity",
  auth,
  roles(["admin"]),
  validate(
    z
      .object({
        batch: z.string().regex(/^[a-f\d]{24}$/i),
        traineeCount: z.number().int().min(1).max(100000),
        batchSize: z.number().int().min(1).max(10000),
        trainersPerSession: z.number().int().min(1).max(20),
        start: z.string().datetime({ offset: true }),
        end: z.string().datetime({ offset: true }),
      })
      .strict()
      .refine(
        (x) => new Date(x.end) > new Date(x.start),
        "End must follow start",
      ),
  ),
  async (req, res) => {
    const { batch, ...inputs } = req.validated.body;
    res.json({ success: true, data: await capacityFor(batch, inputs) });
  },
);
export default router;
