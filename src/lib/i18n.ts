import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import authEn from '../locales/en/auth.json';
import authUr from '../locales/ur/auth.json';
import commonEn from '../locales/en/common.json';
import commonUr from '../locales/ur/common.json';
import profileEn from '../locales/en/profile.json';
import profileUr from '../locales/ur/profile.json';
import settingsEn from '../locales/en/settings.json';
import settingsUr from '../locales/ur/settings.json';
import sidebarEn from '../locales/en/sidebar.json';
import sidebarUr from '../locales/ur/sidebar.json';
import infoEn from '../locales/en/info.json';
import infoUr from '../locales/ur/info.json';
import dashboardEn from '../locales/en/dashboard.json';
import dashboardUr from '../locales/ur/dashboard.json';
import inventoryEn from '../locales/en/inventory.json';
import inventoryUr from '../locales/ur/inventory.json';
import customersEn from '../locales/en/customers.json';
import customersUr from '../locales/ur/customers.json';
import deliveryChallanEn from '../locales/en/delivery_chalan.json';
import deliveryChallanUr from '../locales/ur/delivery_chalan.json';

// Translation files would normally be in public/locales or as JSON imports
const resources = {
  en: {
    auth: authEn,
    common: commonEn,
    profile: profileEn,
    settings: settingsEn,
    sidebar: sidebarEn,
    info: infoEn,
    dashboard: dashboardEn,
    inventory: inventoryEn,
    customers: customersEn,
    delivery_chalan: deliveryChallanEn,
  },
  ur: {
    auth: authUr,
    common: commonUr,
    profile: profileUr,
    settings: settingsUr,
    sidebar: sidebarUr,
    info: infoUr,
    dashboard: dashboardUr,
    inventory: inventoryUr,
    customers: customersUr,
    delivery_chalan: deliveryChallanUr,
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
