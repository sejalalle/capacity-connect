import crypto from "node:crypto";
import mongoose from "mongoose";
import { P2AuditLog } from "../models/Part2.js";
import User from "../models/User.js";
import { HttpError } from "../middleware/errorHandler.js";
export async function list(req, res) {
  const { role, status, page, limit } = req.validated.query;
  const filter = {
    ...(role && { role }),
    ...(status && { accountStatus: status }),
  };
  const [users, total, counts] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
    User.aggregate([
      {
        $group: {
          _id: { role: "$role", status: "$accountStatus" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);
  res.json({
    success: true,
    data: {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      counts,
    },
  });
}
export async function get(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  res.json({ success: true, data: { user } });
}
export async function update(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  Object.assign(user, req.validated.body);
  await user.save();
  res.json({ success: true, data: { user }, message: "Profile updated." });
}
export async function status(req, res) {
  if (req.params.id === req.user.id)
    throw new HttpError(
      409,
      "Administrators cannot change their own account status.",
    );
  const target = req.validated.body.accountStatus;
  const source = target === "suspended" ? "approved" : "pending";
  const user = await mongoose.connection.transaction(async (session) => {
    const changed = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $ne: "admin" }, accountStatus: source },
      { $set: { accountStatus: target } },
      { new: true, runValidators: true, session },
    );
    if (!changed) {
      if (!(await User.exists({ _id: req.params.id }).session(session)))
        throw new HttpError(404, "User not found");
      throw new HttpError(
        409,
        "This account status transition is not allowed. Administrator accounts are protected.",
      );
    }
    await P2AuditLog.create(
      [
        {
          actor: req.user._id,
          action: "ACCOUNT_STATUS_CHANGED",
          entityType: "User",
          entityId: changed._id,
          previousStatus: source,
          newStatus: target,
          reason: `Administrator changed account access from ${source} to ${target}`,
          correlationId: crypto.randomUUID(),
        },
      ],
      { session },
    );
    return changed;
  });
  res.json({ success: true, data: { user }, message: `Account ${target}.` });
}
