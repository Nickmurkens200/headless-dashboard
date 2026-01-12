#!/bin/sh
set -e

echo "🚀 Starting Dashboard API..."

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Check if this is first run (no users exist) and seed if needed
echo "🌱 Checking if seeding is needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('No users found, running seed...');
    process.exit(1);
  }
  console.log('Database already seeded, skipping...');
  process.exit(0);
}
check().finally(() => prisma.\$disconnect());
" || node dist/prisma/seed.js

echo "✅ Starting server..."
exec node dist/main.js
