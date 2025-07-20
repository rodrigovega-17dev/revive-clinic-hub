#!/usr/bin/env node

/**
 * Migration Analysis Script
 * Analyzes existing migration files to identify consolidation opportunities
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = 'supabase/migrations';

function analyzeMigrations() {
    console.log('🔍 Analyzing migration files...\n');
    
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
        return;
    }
    
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.sql'))
        .sort();
    
    console.log(`📊 Found ${migrationFiles.length} migration files\n`);
    
    // Categorize migrations
    const categories = {
        initial: [],
        core_tables: [],
        subscription: [],
        fixes: [],
        features: [],
        rls_policies: [],
        indexes: [],
        duplicates: []
    };
    
    const seenNames = new Set();
    
    migrationFiles.forEach(file => {
        const fileName = file.toLowerCase();
        
        // Check for duplicates
        const baseName = fileName.replace(/^\d{14}_/, '').replace(/[-_]\d+\.sql$/, '.sql');
        if (seenNames.has(baseName)) {
            categories.duplicates.push(file);
        } else {
            seenNames.add(baseName);
        }
        
        // Categorize by content
        if (fileName.includes('initial') || fileName.includes('restore_complete')) {
            categories.initial.push(file);
        } else if (fileName.includes('subscription') || fileName.includes('billing')) {
            categories.subscription.push(file);
        } else if (fileName.includes('fix') || fileName.includes('restore')) {
            categories.fixes.push(file);
        } else if (fileName.includes('rls') || fileName.includes('policies')) {
            categories.rls_policies.push(file);
        } else if (fileName.includes('index') || fileName.includes('idx')) {
            categories.indexes.push(file);
        } else if (fileName.includes('add-') || fileName.includes('create-')) {
            if (fileName.includes('table') || fileName.includes('clients') || 
                fileName.includes('therapists') || fileName.includes('appointments')) {
                categories.core_tables.push(file);
            } else {
                categories.features.push(file);
            }
        } else {
            categories.features.push(file);
        }
    });
    
    // Print analysis results
    console.log('📋 Migration Categories:\n');
    
    Object.entries(categories).forEach(([category, files]) => {
        if (files.length > 0) {
            console.log(`${getCategoryIcon(category)} ${category.toUpperCase().replace('_', ' ')} (${files.length} files):`);
            files.forEach(file => {
                console.log(`   • ${file}`);
            });
            console.log('');
        }
    });
    
    // Generate consolidation recommendations
    console.log('💡 Consolidation Recommendations:\n');
    
    console.log('1️⃣ INITIAL SCHEMA MIGRATION:');
    console.log('   Combine core table creation files:');
    categories.core_tables.concat(categories.initial).forEach(file => {
        console.log(`   • ${file}`);
    });
    
    console.log('\n2️⃣ SUBSCRIPTION SYSTEM MIGRATION:');
    console.log('   Combine subscription-related files:');
    categories.subscription.forEach(file => {
        console.log(`   • ${file}`);
    });
    
    console.log('\n3️⃣ CURRENT STATE MIGRATION:');
    console.log('   Combine features, fixes, and policies:');
    categories.features.concat(categories.fixes, categories.rls_policies, categories.indexes).forEach(file => {
        console.log(`   • ${file}`);
    });
    
    if (categories.duplicates.length > 0) {
        console.log('\n⚠️  DUPLICATE FILES TO REMOVE:');
        categories.duplicates.forEach(file => {
            console.log(`   • ${file}`);
        });
    }
    
    console.log('\n📈 Summary:');
    console.log(`   Current migrations: ${migrationFiles.length}`);
    console.log(`   Recommended migrations: 3`);
    console.log(`   Reduction: ${Math.round((1 - 3/migrationFiles.length) * 100)}%`);
    
    // Generate file size analysis
    console.log('\n📏 File Size Analysis:');
    let totalSize = 0;
    migrationFiles.forEach(file => {
        const filePath = path.join(MIGRATIONS_DIR, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
    });
    
    console.log(`   Total size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`   Average size: ${(totalSize / migrationFiles.length / 1024).toFixed(2)} KB per file`);
}

function getCategoryIcon(category) {
    const icons = {
        initial: '🏗️',
        core_tables: '🗄️',
        subscription: '💳',
        fixes: '🔧',
        features: '✨',
        rls_policies: '🔒',
        indexes: '⚡',
        duplicates: '🔄'
    };
    return icons[category] || '📄';
}

// Run the analysis
if (require.main === module) {
    analyzeMigrations();
}

module.exports = { analyzeMigrations };