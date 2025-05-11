import { db } from "@db";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "@db";
import { eq, and } from "drizzle-orm";
import { users } from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  async getUser(id) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    return user;
  }

  async getUserByUsername(username) {
    return await db.query.users.findFirst({
      where: eq(users.username, username),
    });
  }

  async getUserByEmail(email) {
    return await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async createUser(userData) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
}

export const storage = new DatabaseStorage();
