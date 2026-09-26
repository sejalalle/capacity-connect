import { useCallback, useEffect, useState } from "react";
import useAuth from "./useAuth";
import { part3 } from "../services/part3Service";

// A nomination in one of these states no longer unlocks the trainee's
// Train-the-Trainer workspace.
const CLOSED_STATES = ["WITHDRAWN", "REJECTED"];

export const isTttOpen = (nomination) =>
  Boolean(nomination) && !CLOSED_STATES.includes(nomination.status);

// The candidate's own Train-the-Trainer nominations. Admin-created, so this is
// the switch that unlocks the trainee TTT navigation: no nomination, no portal.
export default function useTttNomination() {
  const { user } = useAuth();
  const role = user?.role;
  const eligible = role === "trainee";
  const [nominations, setNominations] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!eligible) {
      setNominations([]);
      return;
    }
    let active = true;
    setError("");
    part3
      .get("/ttt/candidates")
      .then((rows) => {
        if (active) setNominations(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.response?.data?.message || "Unable to load your nomination.");
        setNominations([]);
      });
    return () => {
      active = false;
    };
  }, [eligible, revision]);

  const list = nominations || [];
  const nomination =
    list.find(isTttOpen) ||
    [...list].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    )[0] ||
    null;

  return {
    nominations: list,
    nomination,
    hasAccess: list.some(isTttOpen),
    loading: eligible && nominations === null,
    error,
    reload,
  };
}
