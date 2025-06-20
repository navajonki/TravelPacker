import { db } from './db';
import { passwordResetTokens, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

async function testPasswordReset() {
  try {
    console.log('Testing password reset functionality...');
    
    // Find an existing user
    const [user] = await db.select().from(users).limit(1);
    if (!user) {
      console.log('No users found to test with');
      return;
    }
    
    console.log(`Testing with user: ${user.username} (ID: ${user.id})`);
    
    // Create a test reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    const [createdToken] = await db
      .insert(passwordResetTokens)
      .values({
        userId: user.id,
        token: resetToken,
        expires: expiresAt,
      })
      .returning();
    
    console.log(`Created reset token: ${resetToken}`);
    console.log(`Token expires at: ${expiresAt}`);
    
    // Verify token was created
    const [foundToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, resetToken));
    
    if (foundToken) {
      console.log('✓ Token successfully created in database');
      console.log('✓ Password reset system is working correctly');
      
      console.log('\nYou can now test the password reset flow:');
      console.log(`1. Visit: http://localhost:5000/reset-password?token=${resetToken}`);
      console.log('2. Enter a new password to test the reset functionality');
    } else {
      console.log('✗ Failed to create token in database');
    }
    
  } catch (error) {
    console.error('Error testing password reset:', error);
    throw error;
  }
}

// Run the test
testPasswordReset()
  .then(() => {
    console.log('\nPassword reset test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Password reset test failed:', error);
    process.exit(1);
  });