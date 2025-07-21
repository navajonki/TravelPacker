#!/bin/bash

# TravelPacker Local Setup Script
echo "🎒 Setting up TravelPacker for local development..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ and try again."
    exit 1
fi

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null && ! command -v docker &> /dev/null; then
    echo "❌ Neither PostgreSQL nor Docker is installed."
    echo "Please install one of them and try again."
    echo "- PostgreSQL: https://www.postgresql.org/download/"
    echo "- Docker: https://www.docker.com/get-started"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your database credentials."
    echo "📖 See LOCAL_SETUP.md for detailed instructions."
else
    echo "✅ .env file already exists."
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=" .env || grep -q "DATABASE_URL=\"\"" .env; then
    echo "⚠️  DATABASE_URL is not configured in .env file."
    echo "Please update your .env file with your database connection string."
    echo "Example: DATABASE_URL=\"postgresql://username:password@localhost:5432/travelpacker_dev\""
fi

echo ""
echo "🚀 Setup complete! Next steps:"
echo "1. Configure your database (see LOCAL_SETUP.md)"
echo "2. Update your .env file with database credentials"
echo "3. Run: npm run db:push"
echo "4. Run: npm run dev"
echo ""
echo "📖 Full instructions: LOCAL_SETUP.md"