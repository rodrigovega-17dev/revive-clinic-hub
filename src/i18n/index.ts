import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';

const resources = {
  en: {
    translation: en,
  },
  es: {
    translation: es,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    // Enhanced fallback handling
    saveMissing: true,
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`🌐 Missing translation: ${key} for language: ${lng}`);
      }
    },
    
    // Custom formatter for missing keys
    parseMissingKeyHandler: (key) => {
      // Convert camelCase keys to readable text
      const parts = key.split('.');
      const lastPart = parts[parts.length - 1];
      
      const readable = lastPart
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
        .trim();
      
      return readable;
    },
    
    // Return key if translation is missing instead of showing the full key path
    returnEmptyString: false,
    returnNull: false,
    returnObjects: false,
  });

export default i18n; 