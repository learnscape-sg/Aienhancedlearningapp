import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { i18nConfig } from './config';

import commonZh from './locales/zh/common.json';
import studentConsoleZh from './locales/zh/studentConsole.json';
import coursePageZh from './locales/zh/coursePage.json';
import progressTrackerZh from './locales/zh/progressTracker.json';
import visualizationEditorZh from './locales/zh/visualizationEditor.json';

import commonEn from './locales/en/common.json';
import studentConsoleEn from './locales/en/studentConsole.json';
import coursePageEn from './locales/en/coursePage.json';
import progressTrackerEn from './locales/en/progressTracker.json';
import visualizationEditorEn from './locales/en/visualizationEditor.json';

const resources = {
  zh: {
    common: commonZh,
    studentConsole: studentConsoleZh,
    coursePage: coursePageZh,
    progressTracker: progressTrackerZh,
    visualizationEditor: visualizationEditorZh,
  },
  en: {
    common: commonEn,
    studentConsole: studentConsoleEn,
    coursePage: coursePageEn,
    progressTracker: progressTrackerEn,
    visualizationEditor: visualizationEditorEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...i18nConfig,
    resources,
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;
