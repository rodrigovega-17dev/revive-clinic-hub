#!/bin/bash

echo "🚀 Deploying Cliniker Hub to Netlify..."

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Build the project
echo "📦 Building project..."
npm run build

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
netlify deploy --prod --dir=dist

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up environment variables in Netlify dashboard"
echo "2. Configure Stripe webhooks"
echo "3. Test the subscription flow"
echo ""
echo "📖 See NETLIFY_DEPLOYMENT.md for detailed instructions" 