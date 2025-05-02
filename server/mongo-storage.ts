import session from "express-session";
import { connectToMongoDB, User, convertToPlainObject } from "../db/mongo";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import MongoStore from "connect-mongo";

// Interface for storage operations
export interface IStorage {
  sessionStore: session.Store;
  getUser(id: string): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  createUser(user: any): Promise<any>;
}

// MongoDB implementation
export class MongoDBStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // MongoDB session store
    this.sessionStore = MongoStore.create({
      mongoUrl: 'mongodb+srv://BusProject:BusProject12345@cluster0.sr6vu8z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
      collectionName: 'sessions'
    });
  }

  async getUser(id: string): Promise<any> {
    try {
      const user = await User.findById(id);
      return convertToPlainObject(user);
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw new Error("Unable to find user");
    }
  }

  async getUserByUsername(username: string): Promise<any> {
    try {
      const user = await User.findOne({ username });
      return convertToPlainObject(user);
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<any> {
    try {
      const user = await User.findOne({ email });
      return convertToPlainObject(user);
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async createUser(userData: any): Promise<any> {
    try {
      const newUser = new User(userData);
      await newUser.save();
      return convertToPlainObject(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Unable to create user");
    }
  }
}

// Initialize MongoDB connection and export storage instance
export const initializeStorage = async () => {
  try {
    await connectToMongoDB();
    return new MongoDBStorage();
  } catch (error) {
    console.error("Failed to initialize MongoDB storage:", error);
    throw error;
  }
};