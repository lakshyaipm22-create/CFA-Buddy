#!/bin/bash
# CFA Buddy — Quick Setup Script
# Run this ONCE after cloning or pulling new code.

set -e

echo "🔄 CFA Buddy Setup..."

# Clean build artifacts
echo "  ✓ Cleaning .next cache..."
rm -rf .next

# Install dependencies
echo "  ✓ Installing dependencies..."
npm install --silent

# Generate Prisma client
echo "  ✓ Generating Prisma client..."
npx prisma generate --no-hints 2>/dev/null || true

# Verify build
echo "  ✓ Verifying build..."
npx tsc --noEmit
npm run lint --silent
npm run build --silent

echo ""
echo "✅ Setup complete! Run: npm run dev"
echo "   Open: http://localhost:3000"
echo ""
echo "📝 Note: The app works 100% without any environment variables."
echo "   All data is stored in localStorage. Configure .env.local for Supabase auth."
