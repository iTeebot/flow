import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import authEn from '../locales/en/auth.json';
import authUr from '../locales/ur/auth.json';
import commonEn from '../locales/en/common.json';
import commonUr from '../locales/ur/common.json';

// Translation files would normally be in public/locales or as JSON imports
const resources = {
  en: {
    auth: authEn,
    common: commonEn,
  },
  ur: {
    auth: authUr,
    common: commonUr,
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
