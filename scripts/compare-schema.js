#!/usr/bin/env node

/**
 * Schema Comparison Script
 * Compares current database schema with migration files to identify consolidation opportunities
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function compareSchemas() {
    console.log('🔍 Comparing current schema with migrations...\n');
    
    // Use the existing current_schema.sql file
    const currentSchemaPath = 'current_schema.sql';
    if (!fs.existsSync(currentSchemaPath)) {
        console.error('❌ Current schema file not found. Please ensure current_schema.sql exists in the project root.');
        console.log('💡 You can get it by running: supabase db dump --linked -f current_schema.sql');
        return;
    }
    
    console.log('📊 Using existing current_schema.sql file...');
    
    const currentSchema = fs.readFileSync(currentSchemaPath, 'utf8');
    
    // Analyze current schema
    const schemaAnalysis = analyzeSchema(currentSchema);
    
    console.log('\n📋 Current Database Schema Analysis:\n');
    console.log(`🗄️  Tables: ${schemaAnalysis.tables.length}`);
    console.log(`🔧 Functions: ${schemaAnalysis.functions.length}`);
    console.log(`📊 Types: ${schemaAnalysis.types.length}`);
    console.log(`⚡ Indexes: ${schemaAnalysis.indexes.length}`);
    console.log(`🔒 Policies: ${schemaAnalysis.policies.length}`);
    console.log(`🔗 Triggers: ${schemaAnalysis.triggers.length}`);
    
    // Show tables
    console.log('\n📋 Tables in current schema:');
    schemaAnalysis.tables.forEach(table => {
        console.log(`   • ${table}`);
    });
    
    // Show custom types
    if (schemaAnalysis.types.length > 0) {
        console.log('\n🏷️  Custom Types:');
        schemaAnalysis.types.forEach(type => {
            console.log(`   • ${type}`);
        });
    }
    
    // Show functions
    if (schemaAnalysis.functions.length > 0) {
        console.log('\n⚙️  Functions:');
        schemaAnalysis.functions.forEach(func => {
            console.log(`   • ${func}`);
        });
    }
    
    // Generate consolidated migration recommendations
    console.log('\n💡 Consolidation Strategy:\n');
    
    console.log('1️⃣ Create 001_initial_schema.sql with:');
    console.log('   • All custom types (enums)');
    console.log('   • Core tables (profiles, clinics, clients, therapists, appointments, treatments)');
    console.log('   • Basic indexes and constraints');
    console.log('   • Essential functions (get_user_clinic_id, handle_new_user, etc.)');
    
    console.log('\n2️⃣ Create 002_subscription_system.sql with:');
    console.log('   • Subscription-related tables (subscription_plans, clinic_subscriptions, etc.)');
    console.log('   • Subscription functions and triggers');
    console.log('   • Billing and usage tracking');
    
    console.log('\n3️⃣ Create 003_current_state.sql with:');
    console.log('   • All RLS policies');
    console.log('   • Performance indexes');
    console.log('   • Google Calendar integration fields');
    console.log('   • Security settings and user preferences');
    
    // Create the consolidated migration files
    await generateConsolidatedMigrations(schemaAnalysis, currentSchema);
}

function analyzeSchema(schema) {
    const analysis = {
        tables: [],
        functions: [],
        types: [],
        indexes: [],
        policies: [],
        triggers: []
    };
    
    // Extract tables
    const tableMatches = schema.match(/CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+[^;]+;/gs) || [];
    tableMatches.forEach(match => {
        const tableName = match.match(/CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:"public"\.)?"?([^"\s(]+)"?\s*\(/);
        if (tableName) {
            analysis.tables.push(tableName[1]);
        }
    });
    
    // Extract functions
    const functionMatches = schema.match(/CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION[^$]+\$[^$]*\$[^;]*;/gs) || [];
    functionMatches.forEach(match => {
        const funcName = match.match(/FUNCTION\s+"?public"?\."?([^"(]+)"?\(/);
        if (funcName) {
            analysis.functions.push(funcName[1]);
        }
    });
    
    // Extract types
    const typeMatches = schema.match(/CREATE TYPE[^;]+;/gs) || [];
    typeMatches.forEach(match => {
        const typeName = match.match(/CREATE TYPE\s+"?public"?\."?([^"\s]+)"?\s+AS/);
        if (typeName) {
            analysis.types.push(typeName[1]);
        }
    });
    
    // Extract indexes
    const indexMatches = schema.match(/CREATE(?:\s+UNIQUE)?\s+INDEX[^;]+;/gs) || [];
    indexMatches.forEach(match => {
        const indexName = match.match(/INDEX\s+"?([^"\s]+)"?\s+ON/);
        if (indexName) {
            analysis.indexes.push(indexName[1]);
        }
    });
    
    // Extract policies
    const policyMatches = schema.match(/CREATE POLICY[^;]+;/gs) || [];
    policyMatches.forEach(match => {
        const policyName = match.match(/CREATE POLICY\s+"([^"]+)"/);
        if (policyName) {
            analysis.policies.push(policyName[1]);
        }
    });
    
    // Extract triggers
    const triggerMatches = schema.match(/CREATE(?:\s+OR\s+REPLACE)?\s+TRIGGER[^;]+;/gs) || [];
    triggerMatches.forEach(match => {
        const triggerName = match.match(/TRIGGER\s+"?([^"\s]+)"?\s+/);
        if (triggerName) {
            analysis.triggers.push(triggerName[1]);
        }
    });
    
    return analysis;
}

async function generateConsolidatedMigrations(analysis, currentSchema) {
    console.log('\n🏗️  Generating consolidated migration files...\n');
    
    // Create migrations directory if it doesn't exist
    const newMigrationsDir = 'supabase/migrations-new';
    if (!fs.existsSync(newMigrationsDir)) {
        fs.mkdirSync(newMigrationsDir, { recursive: true });
    }
    
    // Generate timestamp for new migrations
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    
    // 1. Initial Schema Migration
    const initialMigration = generateInitialSchemaMigration(analysis, currentSchema);
    fs.writeFileSync(
        path.join(newMigrationsDir, `${timestamp}01_initial_schema.sql`),
        initialMigration
    );
    console.log('✅ Generated 001_initial_schema.sql');
    
    // 2. Subscription System Migration
    const subscriptionMigration = generateSubscriptionMigration(analysis, currentSchema);
    fs.writeFileSync(
        path.join(newMigrationsDir, `${timestamp}02_subscription_system.sql`),
        subscriptionMigration
    );
    console.log('✅ Generated 002_subscription_system.sql');
    
    // 3. Current State Migration
    const currentStateMigration = generateCurrentStateMigration(analysis, currentSchema);
    fs.writeFileSync(
        path.join(newMigrationsDir, `${timestamp}03_current_state.sql`),
        currentStateMigration
    );
    console.log('✅ Generated 003_current_state.sql');
    
    console.log(`\n📁 New migration files created in: ${newMigrationsDir}`);
    console.log('\n⚠️  Next steps:');
    console.log('   1. Review the generated migration files');
    console.log('   2. Test them on a development database');
    console.log('   3. Replace the old migrations directory');
    console.log('   4. Run supabase db reset to test the new migrations');
}

function generateInitialSchemaMigration(analysis, schema) {
    let migration = `-- Initial Schema Migration
-- This migration creates the core database structure

`;
    
    // Add types
    const typeMatches = schema.match(/CREATE TYPE[^;]+;/gs) || [];
    if (typeMatches.length > 0) {
        migration += `-- Create custom types\n`;
        typeMatches.forEach(type => {
            migration += type + '\n\n';
        });
    }
    
    // Add core tables (excluding subscription tables)
    const coreTableNames = ['profiles', 'clinics', 'therapists', 'clients', 'appointments', 'treatments', 'expenses', 'payments', 'suppliers', 'shifts'];
    
    // Extract complete table definitions including all content until the closing );
    const tablePattern = /CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+[^;]+?\);/gs;
    const tableMatches = schema.match(tablePattern) || [];
    
    migration += `-- Create core tables\n`;
    tableMatches.forEach(table => {
        const tableName = table.match(/CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:"public"\.)?"?([^"\s(]+)"?\s*\(/);
        if (tableName && coreTableNames.includes(tableName[1])) {
            migration += table + '\n\n';
        }
    });
    
    // Add essential functions
    const essentialFunctions = ['get_user_clinic_id', 'handle_new_user', 'update_updated_at_column', 'is_clinic_owner'];
    const functionPattern = /CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION[^$]+\$[^$]*\$[^;]*;/gs;
    const functionMatches = schema.match(functionPattern) || [];
    
    migration += `-- Create essential functions\n`;
    functionMatches.forEach(func => {
        const funcName = func.match(/FUNCTION\s+"?public"?\."?([^"(]+)"?\(/);
        if (funcName && essentialFunctions.includes(funcName[1])) {
            migration += func + '\n\n';
        }
    });
    
    return migration;
}

function generateSubscriptionMigration(analysis, schema) {
    let migration = `-- Subscription System Migration
-- This migration adds subscription and billing functionality

`;
    
    // Add subscription tables
    const subscriptionTableNames = ['subscription_plans', 'clinic_subscriptions', 'subscription_usage', 'subscription_invoices'];
    const tableMatches = schema.match(/CREATE TABLE[^;]+;/gs) || [];
    
    migration += `-- Create subscription tables\n`;
    tableMatches.forEach(table => {
        const tableName = table.match(/CREATE TABLE\s+(?:"public"\.)?"?([^"\s(]+)"?\s*\(/);
        if (tableName && subscriptionTableNames.includes(tableName[1])) {
            migration += table + '\n\n';
        }
    });
    
    // Add subscription-related functions
    const functionMatches = schema.match(/CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION[^$]+\$[^$]*\$[^;]*;/gs) || [];
    migration += `-- Create subscription functions\n`;
    functionMatches.forEach(func => {
        if (func.includes('subscription') || func.includes('billing')) {
            migration += func + '\n\n';
        }
    });
    
    return migration;
}

function generateCurrentStateMigration(analysis, schema) {
    let migration = `-- Current State Migration
-- This migration adds RLS policies, indexes, and final configurations

`;
    
    // Add remaining tables
    const coreTableNames = ['profiles', 'clinics', 'therapists', 'clients', 'appointments', 'treatments', 'expenses', 'payments', 'suppliers', 'shifts'];
    const subscriptionTableNames = ['subscription_plans', 'clinic_subscriptions', 'subscription_usage', 'subscription_invoices'];
    const excludedTables = [...coreTableNames, ...subscriptionTableNames];
    
    const tableMatches = schema.match(/CREATE TABLE[^;]+;/gs) || [];
    migration += `-- Create remaining tables\n`;
    tableMatches.forEach(table => {
        const tableName = table.match(/CREATE TABLE\s+(?:"public"\.)?"?([^"\s(]+)"?\s*\(/);
        if (tableName && !excludedTables.includes(tableName[1])) {
            migration += table + '\n\n';
        }
    });
    
    // Add all indexes
    const indexMatches = schema.match(/CREATE(?:\s+UNIQUE)?\s+INDEX[^;]+;/gs) || [];
    if (indexMatches.length > 0) {
        migration += `-- Create indexes\n`;
        indexMatches.forEach(index => {
            migration += index + '\n';
        });
        migration += '\n';
    }
    
    // Add all RLS policies
    const policyMatches = schema.match(/CREATE POLICY[^;]+;/gs) || [];
    if (policyMatches.length > 0) {
        migration += `-- Create RLS policies\n`;
        policyMatches.forEach(policy => {
            migration += policy + '\n';
        });
        migration += '\n';
    }
    
    // Add triggers
    const triggerMatches = schema.match(/CREATE(?:\s+OR\s+REPLACE)?\s+TRIGGER[^;]+;/gs) || [];
    if (triggerMatches.length > 0) {
        migration += `-- Create triggers\n`;
        triggerMatches.forEach(trigger => {
            migration += trigger + '\n';
        });
    }
    
    return migration;
}

// Run the comparison
if (import.meta.url === `file://${process.argv[1]}`) {
    compareSchemas().catch(console.error);
}

export { compareSchemas };