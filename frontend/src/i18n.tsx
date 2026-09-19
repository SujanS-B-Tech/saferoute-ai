import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "ta";
const dict = {
  en: {
    findRoutes: "Find safe routes", login: "Log in", register: "Create account", logout: "Log out",
    plan: "Plan route", nearby: "Nearby facilities", dataSources: "Data confidence", contacts: "Trusted contacts",
    profile: "Privacy & profile", emergency: "Emergency? Call 112", journeys: "Journeys", reports: "Community Reports",
  },
  ta: {
    findRoutes: "பாதுகாப்பான வழிகளைக் கண்டறி", login: "உள்நுழை", register: "கணக்கை உருவாக்கு", logout: "வெளியேறு",
    plan: "வழி திட்டமிடு", nearby: "அருகிலுள்ள வசதிகள்", dataSources: "தரவு நம்பகத்தன்மை", contacts: "நம்பகமான தொடர்புகள்",
    profile: "தனியுரிமை & சுயவிவரம்", emergency: "அவசரமா? 112 ஐ அழைக்கவும்", journeys: "பயணங்கள்", reports: "சமூக அறிக்கைகள்",
  },
} as const;
export type Key = keyof typeof dict.en;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>(null!);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("saferoute.lang") as Lang) || "en");
  const setLang = (l: Lang) => { localStorage.setItem("saferoute.lang", l); document.documentElement.lang = l; setLangState(l); };
  return <Ctx.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
