#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read translation files
const enPath = path.join(__dirname, '../src/i18n/locales/en.json');
const esPath = path.join(__dirname, '../src/i18n/locales/es.json');

const enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const esTranslations = JSON.parse(fs.readFileSync(esPath, 'utf8'));

// Function to flatten nested objects into dot notation keys
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}

// Flatten both translation objects
const flatEnglish = flattenObject(enTranslations);
const flatSpanish = flattenObject(esTranslations);

// Find missing keys
const englishKeys = new Set(Object.keys(flatEnglish));
const spanishKeys = new Set(Object.keys(flatSpanish));

const missingInSpanish = [...englishKeys].filter(key => !spanishKeys.has(key));
const extraInSpanish = [...spanishKeys].filter(key => !englishKeys.has(key));

console.log('🌐 Translation Analysis Report');
console.log('================================');
console.log(`📊 English keys: ${englishKeys.size}`);
console.log(`📊 Spanish keys: ${spanishKeys.size}`);
console.log(`❌ Missing in Spanish: ${missingInSpanish.length}`);
console.log(`➕ Extra in Spanish: ${extraInSpanish.length}`);

if (missingInSpanish.length > 0) {
  console.log('\n❌ Keys missing in Spanish:');
  missingInSpanish.forEach(key => {
    console.log(`  - ${key}: "${flatEnglish[key]}"`);
  });
}

if (extraInSpanish.length > 0) {
  console.log('\n➕ Extra keys in Spanish (not in English):');
  extraInSpanish.forEach(key => {
    console.log(`  - ${key}: "${flatSpanish[key]}"`);
  });
}

// Calculate coverage
const coverage = ((spanishKeys.size - extraInSpanish.length) / englishKeys.size * 100).toFixed(1);
console.log(`\n📈 Spanish translation coverage: ${coverage}%`);

if (missingInSpanish.length === 0) {
  console.log('\n✅ All English keys have Spanish translations!');
} else {
  console.log(`\n🔧 Need to add ${missingInSpanish.length} Spanish translations`);
}