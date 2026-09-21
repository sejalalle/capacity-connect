import api from "../services/api";
import { createContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { errorMessage, tokenStore } from "../services/api";
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function refresh() {
    setLoading(true);
    setError("");
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    try {
      setUser(await authService.me());
    } catch (e) {
      setUser(null);
      if (e.response?.status !== 401 && e.response?.status !== 403)
        setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    const expire = () => {
      setUser(null);
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  async function login(credentials, remember) {
    const data = await authService.login(credentials);
    tokenStore.set(data.token, remember);
    setUser(data.user);
    return data.user;
  }
  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      if (e.response?.status !== 401 && e.response?.status !== 403) {
        setError(
          "Sign-out could not be confirmed. Retry to revoke your sessions.",
        );
        return;
      }
    }
    tokenStore.clear();
    setUser(null);
    setError("");
  }
  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, error, refresh, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
