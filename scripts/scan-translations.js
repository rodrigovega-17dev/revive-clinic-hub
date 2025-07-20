#!/usr/bin/env node

/**
 * Translation Scanner Script
 * Scans React components for hardcoded strings and missing translations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = 'src';
const LOCALES_DIR = 'src/i18n/locales';

async function scanTranslations() {
    console.log('🔍 Scanning for translation issues...\n');
    
    // Load existing translation files
    const englishTranslations = loadTranslationFile('en.json');
    const spanishTranslations = loadTranslationFile('es.json');
    
    console.log('📊 Current Translation Status:');
    console.log(`   English keys: ${countKeys(englishTranslations)}`);
    console.log(`   Spanish keys: ${countKeys(spanishTranslations)}`);
    
    // Find hardcoded strings in components
    console.log('\n🔍 Scanning for hardcoded strings...');
    const hardcodedStrings = await scanForHardcodedStrings();
    
    // Compare translation files
    console.log('\n📋 Comparing translation files...');
    const translationComparison = compareTranslations(englishTranslations, spanishTranslations);
    
    // Generate report
    generateReport(hardcodedStrings, translationComparison, englishTranslations, spanishTranslations);
}

function loadTranslationFile(filename) {
    try {
        const filePath = path.join(LOCALES_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`❌ Error loading ${filename}:`, error.message);
        return {};
    }
}

function countKeys(obj, prefix = '') {
    let count = 0;
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            count += countKeys(obj[key], prefix + key + '.');
        } else {
            count++;
        }
    }
    return count;
}

function getAllKeys(obj, prefix = '') {
    const keys = [];
    for (const key in obj) {
        const fullKey = prefix + key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys.push(...getAllKeys(obj[key], fullKey + '.'));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

async function scanForHardcodedStrings() {
    const hardcodedStrings = [];
    const componentFiles = await getComponentFiles();
    
    for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const strings = findHardcodedStrings(content, file);
        hardcodedStrings.push(...strings);
    }
    
    return hardcodedStrings;
}

async function getComponentFiles() {
    const files = [];
    
    function scanDirectory(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDirectory(fullPath);
            } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
                files.push(fullPath);
            }
        }
    }
    
    scanDirectory(SRC_DIR);
    return files;
}

function findHardcodedStrings(content, filePath) {
    const hardcodedStrings = [];
    
    // Skip files that are primarily translation-related
    if (filePath.includes('i18n') || filePath.includes('locales')) {
        return hardcodedStrings;
    }
    
    // Patterns to look for hardcoded strings
    const patterns = [
        // JSX text content (excluding t() calls and imports)
        />\s*([A-Z][a-zA-Z\s]{3,})\s*</g,
        // String literals in JSX attributes (excluding common props)
        /(?:placeholder|title|alt|aria-label)=["']([A-Z][a-zA-Z\s]{3,})["']/g,
        // Button text and labels
        /(?:Button|Label)[^>]*>\s*([A-Z][a-zA-Z\s]{3,})\s*</g,
        // Toast messages and alerts
        /(?:toast|alert|message).*["']([A-Z][a-zA-Z\s]{3,})["']/g,
    ];
    
    const lines = content.split('\n');
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const text = match[1].trim();
            
            // Skip if it's likely a variable, component name, or already translated
            if (shouldSkipString(text, content)) {
                continue;
            }
            
            // Find line number
            const beforeMatch = content.substring(0, match.index);
            const lineNumber = beforeMatch.split('\n').length;
            
            hardcodedStrings.push({
                text,
                file: filePath,
                line: lineNumber,
                context: lines[lineNumber - 1]?.trim() || ''
            });
        }
    });
    
    return hardcodedStrings;
}

function shouldSkipString(text, content) {
    // Skip if it's likely not user-facing text
    const skipPatterns = [
        /^[A-Z_]+$/, // Constants like 'API_KEY'
        /^\d+/, // Starts with numbers
        /^(true|false|null|undefined)$/i, // Boolean/null values
        /^(px|rem|em|vh|vw|%)$/, // CSS units
        /^(GET|POST|PUT|DELETE|PATCH)$/i, // HTTP methods
        /^(React|Component|Props|State)/, // React-related terms
        /^(className|onClick|onChange|onSubmit)/, // Common props
    ];
    
    if (skipPatterns.some(pattern => pattern.test(text))) {
        return true;
    }
    
    // Skip if it's already being translated (contains t() call nearby)
    const textIndex = content.indexOf(text);
    const surroundingText = content.substring(Math.max(0, textIndex - 100), textIndex + 100);
    if (surroundingText.includes('t(') || surroundingText.includes('useTranslation')) {
        return true;
    }
    
    // Skip very short strings or single words that might be technical
    if (text.length < 4 || !text.includes(' ')) {
        return true;
    }
    
    return false;
}

function compareTranslations(english, spanish) {
    const englishKeys = getAllKeys(english);
    const spanishKeys = getAllKeys(spanish);
    
    const missingInSpanish = englishKeys.filter(key => !hasKey(spanish, key));
    const missingInEnglish = spanishKeys.filter(key => !hasKey(english, key));
    const commonKeys = englishKeys.filter(key => hasKey(spanish, key));
    
    return {
        englishKeys,
        spanishKeys,
        missingInSpanish,
        missingInEnglish,
        commonKeys,
        englishTotal: englishKeys.length,
        spanishTotal: spanishKeys.length,
        coverage: Math.round((commonKeys.length / Math.max(englishKeys.length, spanishKeys.length)) * 100)
    };
}

function hasKey(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return false;
        }
    }
    
    return true;
}

function generateReport(hardcodedStrings, comparison, englishTranslations, spanishTranslations) {
    console.log('\n📋 Translation Analysis Report\n');
    
    // Coverage summary
    console.log('📊 Coverage Summary:');
    console.log(`   Translation coverage: ${comparison.coverage}%`);
    console.log(`   English keys: ${comparison.englishTotal}`);
    console.log(`   Spanish keys: ${comparison.spanishTotal}`);
    console.log(`   Common keys: ${comparison.commonKeys.length}`);
    
    // Missing translations
    if (comparison.missingInSpanish.length > 0) {
        console.log(`\n❌ Missing in Spanish (${comparison.missingInSpanish.length} keys):`);
        comparison.missingInSpanish.slice(0, 10).forEach(key => {
            console.log(`   • ${key}`);
        });
        if (comparison.missingInSpanish.length > 10) {
            console.log(`   ... and ${comparison.missingInSpanish.length - 10} more`);
        }
    }
    
    if (comparison.missingInEnglish.length > 0) {
        console.log(`\n❌ Missing in English (${comparison.missingInEnglish.length} keys):`);
        comparison.missingInEnglish.slice(0, 10).forEach(key => {
            console.log(`   • ${key}`);
        });
        if (comparison.missingInEnglish.length > 10) {
            console.log(`   ... and ${comparison.missingInEnglish.length - 10} more`);
        }
    }
    
    // Hardcoded strings
    if (hardcodedStrings.length > 0) {
        console.log(`\n⚠️  Potential hardcoded strings (${hardcodedStrings.length} found):`);
        
        // Group by file
        const byFile = {};
        hardcodedStrings.forEach(item => {
            if (!byFile[item.file]) byFile[item.file] = [];
            byFile[item.file].push(item);
        });
        
        Object.entries(byFile).slice(0, 5).forEach(([file, strings]) => {
            console.log(`\n   📄 ${file}:`);
            strings.slice(0, 3).forEach(item => {
                console.log(`      Line ${item.line}: "${item.text}"`);
            });
            if (strings.length > 3) {
                console.log(`      ... and ${strings.length - 3} more in this file`);
            }
        });
        
        if (Object.keys(byFile).length > 5) {
            console.log(`\n   ... and ${Object.keys(byFile).length - 5} more files`);
        }
    } else {
        console.log('\n✅ No obvious hardcoded strings found!');
    }
    
    // Generate missing keys file
    if (comparison.missingInSpanish.length > 0) {
        generateMissingKeysFile(comparison.missingInSpanish, englishTranslations);
    }
    
    // Summary
    console.log('\n📈 Summary:');
    console.log(`   Translation coverage: ${comparison.coverage}%`);
    console.log(`   Keys to translate: ${comparison.missingInSpanish.length}`);
    console.log(`   Hardcoded strings: ${hardcodedStrings.length}`);
    
    if (comparison.coverage < 100 || hardcodedStrings.length > 0) {
        console.log('\n💡 Next steps:');
        if (comparison.missingInSpanish.length > 0) {
            console.log('   1. Check scripts/missing-spanish-keys.json for keys to translate');
        }
        if (hardcodedStrings.length > 0) {
            console.log('   2. Replace hardcoded strings with t() calls');
        }
        console.log('   3. Run this script again to verify improvements');
    } else {
        console.log('\n🎉 Translation system looks good!');
    }
}

function generateMissingKeysFile(missingKeys, englishTranslations) {
    const missingKeysWithValues = {};
    
    missingKeys.forEach(key => {
        const value = getValueByPath(englishTranslations, key);
        if (value) {
            missingKeysWithValues[key] = value;
        }
    });
    
    const outputPath = 'scripts/missing-spanish-keys.json';
    fs.writeFileSync(outputPath, JSON.stringify(missingKeysWithValues, null, 2));
    console.log(`\n📄 Missing Spanish keys saved to: ${outputPath}`);
}

function getValueByPath(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return null;
        }
    }
    
    return current;
}

// Run the scanner
if (import.meta.url === `file://${process.argv[1]}`) {
    scanTranslations().catch(console.error);
}

export { scanTranslations };