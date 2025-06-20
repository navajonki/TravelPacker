# SendGrid Sender Verification Setup Guide

## Step 1: Verify Your Sender Identity

1. **Log into your SendGrid account** at https://sendgrid.com
2. **Navigate to Settings > Sender Authentication**
3. **Choose one of these options:**

### Option A: Single Sender Verification (Easiest)
1. Click "Verify a Single Sender"
2. Fill out the form with:
   - **From Name**: TravelPack
   - **From Email**: Use an email you control (e.g., your@email.com or noreply@yourdomain.com)
   - **Reply To**: Same as From Email or a support email
   - **Company Address**: Your address details
3. Click "Create"
4. **Check your email** and click the verification link
5. Once verified, update the email service configuration

### Option B: Domain Authentication (Recommended for Production)
1. Click "Authenticate Your Domain"
2. Select your DNS provider
3. Add the provided DNS records to your domain
4. Verify the domain setup

## Step 2: Update Email Service Configuration

Once you have a verified sender email, update the email service:

```typescript
// In server/emailService.ts, update the 'from' field:
from: 'your-verified-email@domain.com'
```

## Step 3: Test Email Functionality

After verification, test the password reset email:

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com"}'
```

## Common Issues and Solutions

### Issue: 403 Forbidden Error
- **Cause**: Sender email not verified or API key permissions insufficient
- **Solution**: Complete sender verification and ensure API key has "Mail Send" permissions

### Issue: API Key Permissions
1. Go to Settings > API Keys in SendGrid
2. Click on your API key
3. Ensure "Mail Send" permission is enabled
4. If needed, create a new API key with "Full Access" permissions

### Issue: Domain Authentication
- For production use, domain authentication is recommended
- This allows sending from any email address on your verified domain
- Requires DNS record configuration

## Quick Setup for Testing

For immediate testing, use Single Sender Verification with an email address you control:

1. Verify a single sender email in SendGrid
2. Update the `from` field in emailService.ts to use your verified email
3. Test the password reset functionality

The system will then send proper password reset emails to users.