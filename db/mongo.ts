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
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['passenger', 'driver', 'admin'] 
  },
  fullName: { type: String },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Bus schema
const busSchema = new Schema({
  busNumber: { type: String, required: true },
  capacity: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  driverId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User'
  },
  routeId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Route'
  },
  createdAt: { type: Date, default: Date.now }
});

// Route schema
const routeSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'temporary'],
    default: 'active'
  },
  stops: [{
    name: { type: String, required: true },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number]
    },
    arrivalTime: { type: String },
    departureTime: { type: String },
  }],
  createdAt: { type: Date, default: Date.now }
});

// Stop schema
const stopSchema = new Schema({
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// RouteStop schema (association between routes and stops)
const routeStopSchema = new Schema({
  routeId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Route',
    required: true
  },
  stopId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Stop',
    required: true
  },
  order: { type: Number, required: true },
  scheduledArrival: { type: String },
  scheduledDeparture: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Ticket schema
const ticketSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  routeId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Route',
    required: true
  },
  fromStopId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Stop',
    required: true
  },
  toStopId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Stop',
    required: true
  },
  status: { 
    type: String, 
    enum: ['active', 'used', 'expired', 'canceled'],
    default: 'active'
  },
  purchaseDate: { type: Date, default: Date.now },
  travelDate: { type: Date, required: true },
  price: { type: Number, required: true },
  qrCode: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Subscription plan schema
const subscriptionPlanSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  duration: { type: Number, required: true }, // in days
  features: [String],
  createdAt: { type: Date, default: Date.now }
});

// Subscription schema
const subscriptionSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  planId: { 
    type: Schema.Types.ObjectId, 
    ref: 'SubscriptionPlan',
    required: true
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['active', 'expired', 'canceled'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now }
});

// Incident schema
const incidentSchema = new Schema({
  busId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Bus',
    required: true
  },
  reportedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  description: { type: String, required: true },
  incidentType: { 
    type: String, 
    enum: ['delay', 'breakdown', 'accident', 'other'],
    required: true
  },
  status: { 
    type: String, 
    enum: ['reported', 'in_progress', 'resolved'],
    default: 'reported'
  },
  location: {
    lat: Number,
    lng: Number
  },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Saved route schema
const savedRouteSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  routeId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Route',
    required: true
  },
  name: { type: String, required: true },
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
export const convertToPlainObject = (doc: any) => {
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