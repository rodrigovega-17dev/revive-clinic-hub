import { useTranslation } from 'react-i18next';

/**
 * Enhanced translation hook with fallback mechanism
 * Provides graceful degradation when translations are missing
 */
export const useTranslationWithFallback = () => {
  const { t, i18n } = useTranslation();

  const tWithFallback = (key: string, options?: any): string => {
    try {
      const translation = t(key, options);
      
      // Check if translation actually exists (not just returning the key)
      if (translation === key && !key.includes('.')) {
        // If it's a simple key without namespace, it might be valid
        return translation;
      }
      
      // If translation is the same as key and contains dots, it's likely missing
      if (translation === key && key.includes('.')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`🌐 Missing translation for key: ${key} (language: ${i18n.language})`);
        }
        
        // Return a human-readable fallback
        return createFallbackText(key);
      }
      
      return translation;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`🌐 Translation error for key ${key}:`, error);
      }
      
      return createFallbackText(key);
    }
  };

  const createFallbackText = (key: string): string => {
    // Extract the last part of the key and make it human-readable
    const parts = key.split('.');
    const lastPart = parts[parts.length - 1];
    
    // Convert camelCase or snake_case to readable text
    const readable = lastPart
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
      .trim();
    
    return readable;
  };

  const checkTranslationExists = (key: string): boolean => {
    const translation = t(key);
    return translation !== key || !key.includes('.');
  };

  const getTranslationCoverage = () => {
    // This would be used in development to track coverage
    return {
      language: i18n.language,
      // Additional coverage metrics could be added here
    };
  };

  return {
    t: tWithFallback,
    i18n,
    checkTranslationExists,
    getTranslationCoverage,
    // Expose original t function for cases where fallback isn't needed
    tOriginal: t
  };
};