import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Translation Debugger Component
 * Shows missing translations in development mode
 */
const TranslationDebugger = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Track missing translations
    const missingKeys = new Set<string>();
    
    const handleMissingKey = (lng: string, namespace: string, key: string) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      
      if (!missingKeys.has(fullKey)) {
        missingKeys.add(fullKey);
        console.warn(`🌐 Missing translation: ${lng}.${fullKey}`);
        
        // Show a visual indicator in development
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          showMissingTranslationNotification(lng, fullKey);
        }
      }
    };

    // Listen for missing key events
    i18n.on('missingKey', handleMissingKey);

    // Cleanup
    return () => {
      i18n.off('missingKey', handleMissingKey);
    };
  }, [i18n]);

  return null; // This component doesn't render anything
};

function showMissingTranslationNotification(language: string, key: string) {
  // Create a temporary notification for missing translations
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff6b6b;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
    max-width: 300px;
    word-break: break-word;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  
  notification.textContent = `Missing ${language}: ${key}`;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

export default TranslationDebugger;