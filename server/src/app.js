import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import part2Routes from "./routes/part2Routes.js";
import part3Routes from "./routes/part3aRoutes.js";
import part3bRoutes from "./routes/part3bRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "64kb" }));
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", part2Routes);
app.use("/api/part3", part3Routes);
app.use("/api/part3", part3bRoutes);
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);
app.use(errorHandler);
export default app;
