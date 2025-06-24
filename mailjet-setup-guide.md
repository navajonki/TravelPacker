# Mailjet Free Email Setup Guide

## Why Mailjet?

Mailjet offers a **FREE tier** with 6,000 emails per month and 200 emails per day - perfect for password reset functionality in TravelPack. This is much more cost-effective than SendGrid's paid plans.

## Quick Setup Steps

### Step 1: Create Free Mailjet Account
1. Visit https://www.mailjet.com/
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Credentials
1. Log into your Mailjet dashboard
2. Go to **Account Settings** > **API Key Management**
3. Copy your **API Key** and **Secret Key**

### Step 3: Configure Environment Variables
Add these to your Replit secrets or environment:

```bash
MAILJET_API_KEY=your_api_key_here
MAILJET_SECRET_KEY=your_secret_key_here
MAILJET_SENDER_EMAIL=your_verified_email@domain.com
```

### Step 4: Verify Sender Email
1. In Mailjet dashboard, go to **Account Settings** > **Sender addresses**
2. Add and verify the email address you want to send from
3. Use this verified email as your `MAILJET_SENDER_EMAIL`

### Step 5: Test Configuration
Run the test script to verify everything works:

```bash
cd server && npx tsx configure-mailjet.ts
```

## Free Tier Limits

- **6,000 emails per month** - More than enough for password resets
- **200 emails per day** - Reasonable daily limit
- **No credit card required** for the free tier
- **Professional email templates** included

## Benefits Over SendGrid

| Feature | Mailjet (Free) | SendGrid |
|---------|----------------|----------|
| Monthly emails | 6,000 FREE | $14.95/month for 40K |
| Daily limit | 200 | No daily limit |
| Setup complexity | Simple | Requires sender verification |
| Cost for small apps | $0 | $14.95/month minimum |

## Integration Status

The email service now automatically:
1. **Tries Mailjet first** (if configured)
2. **Falls back to SendGrid** (if Mailjet unavailable)
3. **Shows clear error messages** if neither is configured

## Testing the Setup

Once configured, test the password reset functionality:

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com"}'
```

The system will automatically use Mailjet if configured, providing free email delivery for your TravelPack users.