import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useLanguage = () => {
  const { i18n, t } = useTranslation();

  // Get current language
  const currentLanguage = i18n.language;

  // Switch language function
  const switchLanguage = useCallback((language: 'en' | 'es') => {
    i18n.changeLanguage(language);
    // Store language preference in localStorage
    localStorage.setItem('i18nextLng', language);
  }, [i18n]);

  // Get available languages
  const availableLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ];

  return {
    currentLanguage,
    switchLanguage,
    availableLanguages,
    t
  };
}; 