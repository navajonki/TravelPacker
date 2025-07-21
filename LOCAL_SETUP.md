# Local Development Setup

This guide will help you set up the TravelPacker application locally without interfering with your online deployment.

## Prerequisites

1. **Node.js** (version 20 or higher)
2. **PostgreSQL** (version 12 or higher)
3. **npm** (comes with Node.js)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set up Local Database

### Option A: Using Local PostgreSQL Installation

1. Install PostgreSQL on your system:
   - **macOS**: `brew install postgresql` (if using Homebrew)
   - **Ubuntu/Debian**: `sudo apt-get install postgresql postgresql-contrib`
   - **Windows**: Download from https://www.postgresql.org/download/

2. Start PostgreSQL service:
   - **macOS**: `brew services start postgresql`
   - **Ubuntu/Debian**: `sudo systemctl start postgresql`
   - **Windows**: Use the PostgreSQL Service Manager

3. Create a database and user:

**For macOS with Homebrew:**
```bash
# Connect to PostgreSQL (no sudo needed)
psql postgres

# Create database and user
CREATE DATABASE travelpacker_dev;
CREATE USER travelpacker_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE travelpacker_dev TO travelpacker_user;
\q

# After running migrations, grant table permissions
psql travelpacker_dev -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO travelpacker_user;"
psql travelpacker_dev -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO travelpacker_user;"
psql travelpacker_dev -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO travelpacker_user;"
psql travelpacker_dev -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO travelpacker_user;"
```

**For Linux:**
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database and user
CREATE DATABASE travelpacker_dev;
CREATE USER travelpacker_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE travelpacker_dev TO travelpacker_user;
\q
```

### Option B: Using Docker (Recommended)

1. Install Docker on your system
2. Run PostgreSQL in a container:

```bash
docker run --name travelpacker-postgres \
  -e POSTGRES_DB=travelpacker_dev \
  -e POSTGRES_USER=travelpacker_user \
  -e POSTGRES_PASSWORD=your_password_here \
  -p 5432:5432 \
  -d postgres:16
```

## Step 3: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` file with your local database credentials:
```env
DATABASE_URL="postgresql://travelpacker_user:your_password_here@localhost:5432/travelpacker_dev"
SESSION_SECRET="your-local-session-secret-key-here"
NODE_ENV="development"
```

## Step 4: Run Database Migrations

```bash
npm run db:push
```

## Step 5: Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Step 6: Create Your First Account

1. Open `http://localhost:5000` in your browser
2. Click "Sign Up" to create a new account
3. Start creating packing lists!

## Optional: Email Configuration

To test email invitations locally, you can set up Mailjet:

1. Sign up for a free Mailjet account at https://www.mailjet.com/
2. Get your API key and secret from the Mailjet dashboard
3. Add them to your `.env` file:
```env
MAILJET_API_KEY="your_api_key_here"
MAILJET_SECRET_KEY="your_secret_key_here"
MAILJET_SENDER_EMAIL="your_email@domain.com"
```

## Troubleshooting

### Database Connection Issues
- Make sure PostgreSQL is running
- Verify your DATABASE_URL is correct
- Check if the database exists and the user has proper permissions

### Port Already in Use
- If port 5000 is already in use, you can change it in the server configuration
- The application is configured to use port 5000 by default

### Network Binding Issues
- The server is configured to bind to `localhost` in development and `0.0.0.0` in production
- This prevents `ENOTSUP` errors on some systems while maintaining production compatibility

### TypeScript Errors
- Run `npm run check` to see TypeScript errors
- Make sure all dependencies are installed with `npm install`

## Production Deployment

This local setup is completely separate from your online deployment. Your `.env` file is gitignored, so your local database credentials won't interfere with your production environment.

When you're ready to deploy:
1. Your online platform (Replit, Vercel, etc.) will use its own environment variables
2. The application will automatically detect the production environment
3. Database migrations will run automatically in production

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type checking
- `npm test` - Run tests
- `npm run db:push` - Push database schema changes