# Mailchimp Transactional Email Setup Guide

This guide will help you switch from SendGrid to Mailchimp Transactional for cost-effective email delivery.

## Why Switch to Mailchimp Transactional?

- **Cost-effective**: 25,000 free emails per month
- **Reliable**: High delivery rates and reputation
- **Integrated**: Works seamlessly with existing Mailchimp accounts
- **Simple pricing**: Pay only for what you use beyond the free tier

## Step 1: Get Your Mailchimp Transactional API Key

1. **Log into your Mailchimp account** at https://mailchimp.com
2. **Navigate to Account Settings**:
   - Click your profile icon → Account
   - Go to "Extras" → "API Keys"
3. **Create a Transactional API Key**:
   - Under "Transactional API Keys" section
   - Click "Create A Key"
   - Copy the key (starts with "md-")

## Step 2: Set Up Sender Authentication (Recommended)

### Option A: Verify a Sending Domain
1. Go to **Settings** → **Sending Domains**
2. Add your domain (e.g., yourdomain.com)
3. Follow DNS setup instructions
4. Use any email from your verified domain (e.g., noreply@yourdomain.com)

### Option B: Use Any Email You Own
- You can use your personal email or any email address you control
- No additional verification needed

## Step 3: Configure Environment Variables

Add these two secrets to your Replit project:

```
MAILCHIMP_API_KEY=md-your-api-key-here
MAILCHIMP_SENDER_EMAIL=your-email@domain.com
```

## Step 4: Test Configuration

Run the configuration test:
```bash
npx tsx server/configure-mailchimp.ts
```

## Step 5: Remove SendGrid (Optional)

Once Mailchimp is working, you can remove SendGrid secrets:
- Remove `SENDGRID_API_KEY`
- Remove `SENDGRID_SENDER_EMAIL`

The system will automatically use Mailchimp when available.

## Pricing Comparison

### SendGrid
- Free tier: 100 emails/day
- Paid plans start at $14.95/month

### Mailchimp Transactional
- Free tier: 25,000 emails/month
- Pay-as-you-go: $0.20 per 1,000 emails

## Troubleshooting

### Common Issues:
1. **Invalid API Key**: Make sure it starts with "md-"
2. **Sender Email Issues**: Use an email you control
3. **Domain Verification**: Not required but recommended for better deliverability

### Need Help?
Run the test script to see detailed error messages:
```bash
npx tsx server/configure-mailchimp.ts
```