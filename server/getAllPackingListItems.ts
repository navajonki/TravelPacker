import { db } from "./db";
import { eq } from "drizzle-orm";
import { items } from "@shared/schema";

export async function getAllPackingListItems(packingListId: number) {
  try {
    // Direct SQL query to get all items for this packing list, including those with null categoryId
    return await db.query.items.findMany({
      where: eq(items.packingListId, packingListId)
    });
  } catch (error) {
    console.error("Error fetching all packing list items:", error);
    return [];
  }
}