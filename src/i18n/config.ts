import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import tl from './locales/tl.json';
import es from './locales/es.json';
import ceb from './locales/ceb.json';
import ilo from './locales/ilo.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tl: { translation: tl },
      es: { translation: es },
      ceb: { translation: ceb },
      ilo: { translation: ilo }
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
