import { emailService } from './emailService';

async function testSendGridConfiguration() {
  console.log('Testing SendGrid configuration...');
  
  // Check if API key is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY environment variable not set');
    return false;
  }
  
  console.log('✓ SendGrid API key found');
  
  // Check sender email configuration
  const senderEmail = process.env.SENDGRID_SENDER_EMAIL;
  if (!senderEmail || senderEmail === 'noreply@yourverifieddomain.com') {
    console.log('⚠️  SENDGRID_SENDER_EMAIL not configured');
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
      subject: 'SendGrid Configuration Test',
      text: 'This is a test email to verify SendGrid configuration.',
      html: '<p>This is a test email to verify SendGrid configuration.</p>'
    });
    
    if (testResult) {
      console.log('✓ Test email sent successfully');
      console.log('✓ SendGrid is properly configured');
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
  console.log('\n=== SendGrid Setup Guide ===\n');
  
  console.log('1. Verify a sender email in SendGrid:');
  console.log('   • Go to https://sendgrid.com → Settings → Sender Authentication');
  console.log('   • Click "Verify a Single Sender"');
  console.log('   • Enter your email details and verify via email');
  
  console.log('\n2. Set the SENDGRID_SENDER_EMAIL environment variable:');
  console.log('   • Add SENDGRID_SENDER_EMAIL=your-verified-email@domain.com to your secrets');
  
  console.log('\n3. Test the configuration:');
  console.log('   • Run: npx tsx server/configure-sendgrid.ts');
  
  console.log('\n4. Once verified, password reset emails will work properly\n');
}

// Run configuration test
testSendGridConfiguration()
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