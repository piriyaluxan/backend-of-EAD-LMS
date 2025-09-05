// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Create Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'EAD LMS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Hello from Railway backend!');
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('📦 MongoDB already connected');
      return;
    }

    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ead-lms';
    const clientOptions = {
      serverApi: { version: '1', strict: true, deprecationErrors: true },
      autoCreate: true,
      autoIndex: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    };

    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, clientOptions);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Don't throw error in serverless - just log it
  }
};

// Initialize database connection
connectDB();

// Import and use routes
try {
  const authRoutes = require('../dist/routes/auth.js').default;
  const userRoutes = require('../dist/routes/users.js').default;
  const courseRoutes = require('../dist/routes/courses.js').default;
  const enrollmentRoutes = require('../dist/routes/enrollments.js').default;
  const materialRoutes = require('../dist/routes/materials.js').default;
  const assignmentRoutes = require('../dist/routes/assignments.js').default;
  const resultRoutes = require('../dist/routes/results.js').default;
  const dashboardRoutes = require('../dist/routes/dashboard.js').default;
  const registrationRoutes = require('../dist/routes/registrations.js').default;

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/enrollments', enrollmentRoutes);
  app.use('/api/materials', materialRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/results', resultRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/registrations', registrationRoutes);
} catch (error) {
  console.error('Error loading routes:', error);
}

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Export for Vercel
module.exports = app;
