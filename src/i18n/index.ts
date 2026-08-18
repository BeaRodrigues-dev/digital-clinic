import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import pt from "./locales/pt.json";
import es from "./locales/es.json";
import en from "./locales/en.json";

// Idioma padrão da plataforma — mude aqui se quiser nascer em outro idioma.
export const DEFAULT_LANGUAGE = "pt";

export const SUPPORTED_LANGUAGES = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇺🇸" },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      es: { translation: es },
      en: { translation: en },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    detection: {
      // Preferência salva do usuário manda; se nunca escolheu, cai para o
      // idioma do navegador e, por fim, para DEFAULT_LANGUAGE.
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "travessia_language",
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
