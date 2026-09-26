import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../services/api";

export default function useApi(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const reload = useCallback(() => setRevision((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.resolve()
      .then(() => loaderRef.current())
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, revision]);

  const run = useCallback(
    async (operation, notify, successMessage) => {
      setBusy(true);
      try {
        const result = await operation();
        if (notify && successMessage) notify(successMessage);
        setRevision((v) => v + 1);
        return result;
      } catch (e) {
        if (notify) notify(errorMessage(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { data, loading, error, busy, reload, run, setData };
}

export function fmtDate(value, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(d);
}
