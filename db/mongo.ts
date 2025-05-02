import mongoose from 'mongoose';

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://BusProject:BusProject12345@cluster0.sr6vu8z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Connect to MongoDB
export const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Define schemas
// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['passenger', 'driver', 'admin'], default: 'passenger' },
  fullName: { type: String },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Bus schema
const busSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'inactive' },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  createdAt: { type: Date, default: Date.now }
});

// Route schema
const routeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

// Stop schema
const stopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  createdAt: { type: Date, default: Date.now }
});

// Route Stop schema (junction collection)
const routeStopSchema = new mongoose.Schema({
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  stopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
  order: { type: Number, required: true },
  scheduledArrival: { type: String },
  scheduledDeparture: { type: String }
});

// Ticket schema
const ticketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  fromStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
  toStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
  departureTime: { type: Date, required: true },
  status: { type: String, enum: ['active', 'used', 'cancelled'], default: 'active' },
  qrCode: { type: String, required: true },
  price: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Subscription Plan schema
const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  duration: { type: Number, required: true }, // in days
  price: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Subscription schema
const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

// Incident schema
const incidentSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  incidentType: { type: String, enum: ['delay', 'breakdown', 'accident', 'other'], required: true },
  description: { type: String, required: true },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  status: { type: String, enum: ['reported', 'in_progress', 'resolved'], default: 'reported' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

// Saved Route schema
const savedRouteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  name: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Create models
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

// Index the compound key in RouteStop
routeStopSchema.index({ routeId: 1, stopId: 1 }, { unique: true });

// Helper function to convert MongoDB document to plain object
export const convertToPlainObject = (doc: any) => {
  if (!doc) return null;
  if (Array.isArray(doc)) {
    return doc.map(item => {
      if (typeof item.toObject === 'function') {
        return item.toObject();
      }
      return item;
    });
  }
  if (typeof doc.toObject === 'function') {
    return doc.toObject();
  }
  return doc;
};