#!/bin/bash

# Get Current Schema from Supabase
# This script uses Supabase CLI to get the actual current schema

echo "🔍 Getting current schema from Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    exit 1
fi

# Create output directory
mkdir -p scripts/schema-output

echo "📊 Generating current schema..."

# Get the current database schema from remote (linked project)
supabase db dump --linked -f scripts/schema-output/current_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Current schema saved to scripts/schema-output/current_schema.sql"
else
    echo "❌ Failed to get current schema"
    exit 1
fi

# Get schema with data for comparison
echo "📋 Getting schema with sample data..."
supabase db dump --data-only -f scripts/schema-output/current_data.sql

# Get migration history
echo "📜 Getting migration history..."
supabase migration list > scripts/schema-output/migration_history.txt

# Generate a clean schema without migration comments
echo "🧹 Generating clean schema..."
cat scripts/schema-output/current_schema.sql | \
    grep -v "^--" | \
    grep -v "^$" | \
    sed '/^SET /d' | \
    sed '/^SELECT pg_catalog.set_config/d' > scripts/schema-output/clean_schema.sql

echo "📈 Schema analysis complete!"
echo "   📄 Full schema: scripts/schema-output/current_schema.sql"
echo "   🧹 Clean schema: scripts/schema-output/clean_schema.sql"
echo "   📊 Sample data: scripts/schema-output/current_data.sql"
echo "   📜 Migration history: scripts/schema-output/migration_history.txt"

# Show basic stats
echo ""
echo "📊 Schema Statistics:"
echo "   Tables: $(grep -c "CREATE TABLE" scripts/schema-output/current_schema.sql)"
echo "   Indexes: $(grep -c "CREATE.*INDEX" scripts/schema-output/current_schema.sql)"
echo "   Functions: $(grep -c "CREATE.*FUNCTION" scripts/schema-output/current_schema.sql)"
echo "   Types: $(grep -c "CREATE TYPE" scripts/schema-output/current_schema.sql)"
echo "   Policies: $(grep -c "CREATE POLICY" scripts/schema-output/current_schema.sql)"