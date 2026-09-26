import { z } from "zod";
export default function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success)
      return res.status(400).json({
        success: false,
        message: "Please correct the highlighted fields.",
        errors: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    req.validated = { ...req.validated, [source]: result.data };
    next();
  };
}
const text = z.string().trim().max(200);
const required = text.min(1, "This field is required");
export const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .refine(
    (s) => Buffer.byteLength(s, "utf8") <= 72,
    "Password must be at most 72 bytes",
  );
const email = z
  .string()
  .trim()
  .email("Enter a valid email")
  .max(254)
  .transform((s) => s.toLowerCase());
const phone = z
  .string()
  .trim()
  .max(25)
  .regex(/^[+\d\s()-]*$/, "Enter a valid phone number");
export const registerSchema = z
  .object({
    name: required.max(100),
    email,
    password,
    confirmPassword: z.string(),
    role: z.enum(["trainee", "trainer"]),
    department: required,
    designation: required,
    phone: phone.optional(),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(200) })
  .strict();
const url = z
  .string()
  .max(2000)
  .refine(
    (s) =>
      !s || (/^https?:\/\//i.test(s) && z.string().url().safeParse(s).success),
    "Use an http or https URL",
  );
const date = z
  .string()
  .refine(
    (s) =>
      !s ||
      (/^\d{4}-\d{2}-\d{2}$/.test(s) &&
        !Number.isNaN(Date.parse(s)) &&
        new Date(s).toISOString().slice(0, 10) === s),
    "Enter a valid date",
  )
  .transform((s) => s || undefined)
  .optional();
export const profileSchema = z
  .object({
    name: required.max(100).optional(),
    department: required.optional(),
    designation: required.optional(),
    phone: phone.optional(),
    profilePhoto: url.optional(),
    qualifications: z.array(required).max(30).optional(),
    interests: z.array(required).max(30).optional(),
    skills: z.array(required).max(30).optional(),
    workExperience: z
      .array(
        z
          .object({
            organization: required,
            role: required,
            from: date,
            to: date,
          })
          .strict()
          .refine((v) => !v.from || !v.to || v.from <= v.to, {
            path: ["to"],
            message: "End date must follow start date",
          }),
      )
      .max(30)
      .optional(),
    certificates: z
      .array(
        z
          .object({
            title: required,
            issuedBy: required,
            date,
            fileUrl: url.optional(),
          })
          .strict(),
      )
      .max(30)
      .optional(),
  })
  .strict()
  .refine(
    (v) => Object.keys(v).length > 0,
    "Provide at least one profile field",
  );
export const idSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID"),
});
export const listSchema = z
  .object({
    role: z.enum(["trainee", "trainer", "admin"]).optional(),
    status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();
export const statusSchema = z
  .object({ accountStatus: z.enum(["approved", "rejected", "suspended"]) })
  .strict();
export const jobRoleSchema = z
  .object({
    jobRole: z.union([
      z.string().regex(/^[a-f\d]{24}$/i, "Invalid professional role"),
      z.null(),
    ]),
  })
  .strict();
