import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

async function resetPassword() {
  try {
    console.log("Resetting password for user zjbodnar@gmail.com...");
    
    // Find the user
    const [user] = await db.select().from(users).where(eq(users.username, "zjbodnar@gmail.com"));
    
    if (!user) {
      console.error("User not found!");
      process.exit(1);
    }
    
    console.log(`Found user with ID: ${user.id}`);
    
    // Hash the new password
    const hashedPassword = await hashPassword("pass12345");
    
    // Update the user's password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id));
    
    console.log("Password reset successful!");
    process.exit(0);
  } catch (error) {
    console.error("Error resetting password:", error);
    process.exit(1);
  }
}

resetPassword();