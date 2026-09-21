import { useCallback, useEffect, useState } from "react";
import { userService } from "../services/userService";
import { errorMessage } from "../services/api";
export default function useUsers({
  role = "",
  status = "",
  page = 1,
  limit = 10,
} = {}) {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    userService
      .list({ ...(role && { role }), ...(status && { status }), page, limit })
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
  }, [role, status, page, limit, revision]);
  return { data, loading, error, refresh };
}
