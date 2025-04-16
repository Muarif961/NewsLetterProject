
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10
});

export const db = drizzle(pool, { schema });

export async function removeSubscribers(subscriberIds: number[]) {
  try {
    for (const id of subscriberIds) {
      await db.delete(schema.subscribers).where(eq(schema.subscribers.id, id));
    }
    return { success: true };
  } catch (error) {
    console.error("Error removing subscribers:", error);
    throw new Error("Failed to remove subscribers");
  }
}
