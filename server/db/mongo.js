import mongoose from 'mongoose';
import { Schema } from 'mongoose';

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://BusProject:BusProject12345@cluster0.sr6vu8z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Connect to MongoDB
export const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

// Schema definitions

// User schema
const userSchema = new Schema({
  username: String,
  password: String,
  email: String,
  role: String,
  fullName: String,
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

// Bus schema
const busSchema = new Schema({
  busNumber: String,
  capacity: Number,
  status: String,
  currentLocation: {
    lat: Number,
    lng: Number
  },
  driverId: { type: Schema.Types.ObjectId, ref: 'User' },
  routeId: { type: Schema.Types.ObjectId, ref: 'Route' },
  createdAt: { type: Date, default: Date.now }
});

// Route schema
const routeSchema = new Schema({
  name: String,
  description: String,
  status: String,
  stops: [{ type: Schema.Types.ObjectId, ref: 'Stop' }],
  createdAt: { type: Date, default: Date.now }
});

// Stop schema
const stopSchema = new Schema({
  name: String,
  location: {
    lat: Number,
    lng: Number
  },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

// RouteStop schema (association between routes and stops)
const routeStopSchema = new Schema({
  routeId: { type: Schema.Types.ObjectId, ref: 'Route' },
  stopId: { type: Schema.Types.ObjectId, ref: 'Stop' },
  order: Number,
  scheduledArrival: String,
  scheduledDeparture: String,
  createdAt: { type: Date, default: Date.now }
});

// Ticket schema
const ticketSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  routeId: { type: Schema.Types.ObjectId, ref: 'Route' },
  fromStopId: { type: Schema.Types.ObjectId, ref: 'Stop' },
  toStopId: { type: Schema.Types.ObjectId, ref: 'Stop' },
  status: String,
  purchaseDate: Date,
  travelDate: Date,
  price: Number,
  qrCode: String,
  createdAt: { type: Date, default: Date.now }
});

// Subscription plan schema
const subscriptionPlanSchema = new Schema({
  name: String,
  description: String,
  price: Number,
  duration: Number, // in days
  features: [String],
  createdAt: { type: Date, default: Date.now }
});

// Subscription schema
const subscriptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  startDate: Date,
  endDate: Date,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

// Incident schema
const incidentSchema = new Schema({
  busId: { type: Schema.Types.ObjectId, ref: 'Bus' },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  description: String,
  incidentType: String,
  status: String,
  location: {
    lat: Number,
    lng: Number
  },
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// Saved route schema
const savedRouteSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  routeId: { type: Schema.Types.ObjectId, ref: 'Route' },
  name: String,
  createdAt: { type: Date, default: Date.now }
});

// Export models
export const User = mongoose.model('User', userSchema);
export const Bus = mongoose.model('Bus', busSchema);
export const Route = mongoose.model('Route', routeSchema);
export const Stop = mongoose.model('Stop', stopSchema);
export const RouteStop = mongoose.model('RouteStop', routeStopSchema);
export const Ticket = mongoose.model('Ticket', ticketSchema);
export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export const Subscription = mongoose.model('Subscription', subscriptionSchema);
export const Incident = mongoose.model('Incident', incidentSchema);
export const SavedRoute = mongoose.model('SavedRoute', savedRouteSchema);

// Helper function to convert Mongoose document to plain object
export const convertToPlainObject = (doc) => {
  if (!doc) return null;
  
  if (Array.isArray(doc)) {
    return doc.map(item => {
      if (item && typeof item.toObject === 'function') {
        const obj = item.toObject();
        // Rename _id to id for consistency with the frontend
        if (obj._id) {
          obj.id = obj._id.toString();
        }
        return obj;
      }
      return item;
    });
  }
  
  if (doc && typeof doc.toObject === 'function') {
    const obj = doc.toObject();
    // Rename _id to id for consistency with the frontend
    if (obj._id) {
      obj.id = obj._id.toString();
    }
    return obj;
  }
  
  return doc;
};