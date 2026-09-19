import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "../services/api";
import type { User } from "../types/api";
import { useLang } from "../i18n";

interface AuthCtx {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}
const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());
  const { setLang } = useLang();

  const setUser = useCallback((u: User) => { setUserState(u); setLang(u.preferred_language); }, [setLang]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me().then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, [setUser]);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.login(email, password);
    tokenStore.set(access_token);
    setUser(await api.me());
  };
  const logout = async () => {
    try { await api.logout(); } catch { /* token may already be invalid; still sign out locally */ }
    tokenStore.clear(); setUserState(null);
  };
  return <Ctx.Provider value={{ user, loading, login, logout, setUser }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
