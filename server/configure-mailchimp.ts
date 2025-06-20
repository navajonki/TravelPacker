import { emailService } from './emailService';

async function testMailchimpConfiguration() {
  console.log('Testing Mailchimp Transactional configuration...');
  
  // Check if API key is configured
  if (!process.env.MAILCHIMP_API_KEY) {
    console.error('❌ MAILCHIMP_API_KEY environment variable not set');
    return false;
  }
  
  console.log('✓ Mailchimp API key found');
  
  // Check sender email configuration
  const senderEmail = process.env.MAILCHIMP_SENDER_EMAIL || process.env.SENDGRID_SENDER_EMAIL;
  if (!senderEmail || senderEmail === 'noreply@yourverifieddomain.com') {
    console.log('⚠️  MAILCHIMP_SENDER_EMAIL not configured');
    console.log('   Please set this to your verified sender email');
    return false;
  }
  
  console.log(`✓ Sender email configured: ${senderEmail}`);
  
  // Test email sending
  try {
    console.log('Testing email send...');
    const testResult = await emailService.sendEmail({
      to: senderEmail, // Send test email to sender (yourself)
      from: senderEmail,
      subject: 'Mailchimp Configuration Test',
      text: 'This is a test email to verify Mailchimp Transactional configuration.',
      html: '<p>This is a test email to verify Mailchimp Transactional configuration.</p>'
    });
    
    if (testResult) {
      console.log('✓ Test email sent successfully');
      console.log('✓ Mailchimp Transactional is properly configured');
      return true;
    } else {
      console.log('❌ Failed to send test email');
      return false;
    }
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
}

async function guidedSetup() {
  console.log('\n=== Mailchimp Transactional Setup Guide ===\n');
  
  console.log('1. Get your Mailchimp Transactional API key:');
  console.log('   • Log into your Mailchimp account');
  console.log('   • Go to Account → Extras → API Keys');
  console.log('   • Click "Create A Key" under Transactional API Keys');
  console.log('   • Copy the API key (starts with "md-")');
  
  console.log('\n2. Set up a verified sending domain (recommended):');
  console.log('   • Go to Settings → Sending Domains');
  console.log('   • Add your domain and verify DNS records');
  console.log('   • Or use any email address you own');
  
  console.log('\n3. Configure environment variables:');
  console.log('   • Add MAILCHIMP_API_KEY=your-api-key to your secrets');
  console.log('   • Add MAILCHIMP_SENDER_EMAIL=your-email@domain.com to your secrets');
  
  console.log('\n4. Test the configuration:');
  console.log('   • Run: npx tsx server/configure-mailchimp.ts');
  
  console.log('\n5. Benefits of Mailchimp Transactional:');
  console.log('   • More cost-effective than SendGrid');
  console.log('   • 25,000 free emails per month');
  console.log('   • Reliable delivery rates');
  console.log('   • Easy integration with existing Mailchimp accounts\n');
}

// Run configuration test
testMailchimpConfiguration()
  .then((success) => {
    if (!success) {
      guidedSetup();
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Configuration test failed:', error);
    guidedSetup();
    process.exit(1);
  });