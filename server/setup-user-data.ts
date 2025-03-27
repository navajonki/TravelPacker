import { db } from "./db";
import { users, packingLists } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "./auth";

/**
 * This script creates a user with the specified email
 * and assigns all existing packing lists to that user.
 */
export async function setupUserData() {
  try {
    console.log("Setting up user data...");
    
    // Check if user with email zjbodnar@gmail.com already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.username, "zjbodnar@gmail.com"))
      .limit(1);
    
    let userId: number;
    
    if (existingUser.length === 0) {
      // Create the user if it doesn't exist
      console.log("Creating user with email zjbodnar@gmail.com");
      const hashedPassword = await hashPassword("password123");
      
      const [newUser] = await db.insert(users)
        .values({
          username: "zjbodnar@gmail.com",
          password: hashedPassword
        })
        .returning();
      
      userId = newUser.id;
      console.log(`Created user with ID: ${userId}`);
    } else {
      userId = existingUser[0].id;
      console.log(`User already exists with ID: ${userId}`);
    }
    
    // Update all existing packing lists to belong to this user
    const updateResult = await db.update(packingLists)
      .set({ userId })
      .where(sql`true`);
    
    console.log("Updated packing lists to belong to the user");
    
    return { success: true, userId };
  } catch (error) {
    console.error("Error setting up user data:", error);
    return { success: false, error };
  }
}