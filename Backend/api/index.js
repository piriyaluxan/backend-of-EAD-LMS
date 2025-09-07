// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

// Quick ping (helps verify routing in Postman)
app.get('/api/ping', (req, res) => {
  res.status(200).json({ ok: true, message: 'pong' });
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

// Helper to ensure DB is connected before handling requests
const ensureConnected = async () => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
};


// Import and use routes from dist/routes (production/serverless safe)
let routesLoaded = false;
try {
  const distRoot = path.join(__dirname, '..', 'dist', 'routes');
  app.use('/api/auth', require(path.join(distRoot, 'auth.js')));
  app.use('/api/users', require(path.join(distRoot, 'users.js')));
  app.use('/api/courses', require(path.join(distRoot, 'courses.js')));
  app.use('/api/enrollments', require(path.join(distRoot, 'enrollments.js')));
  app.use('/api/materials', require(path.join(distRoot, 'materials.js')));
  app.use('/api/assignments', require(path.join(distRoot, 'assignments.js')));
  app.use('/api/results', require(path.join(distRoot, 'results.js')));
  app.use('/api/dashboard', require(path.join(distRoot, 'dashboard.js')));
  app.use('/api/registrations', require(path.join(distRoot, 'registrations.js')));
  routesLoaded = true;
} catch (err) {
  console.warn('No route files found in dist/routes, using inline auth fallback.');
}

// Fallback inline auth routes if compiled routes aren't available in the deployment bundle
// Minimal User model definition for login/debug
try {
  const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: true },
    role: { type: String, enum: ['admin', 'student', 'instructor'], required: true },
    studentId: String,
    isActive: { type: Boolean, default: true },
  }, { timestamps: true });

  // Password comparison helper
  userSchema.methods.comparePassword = async function(candidate) {
    if (!this.password) return false;
    return bcrypt.compare(candidate, this.password);
  };

  const User = mongoose.models.User || mongoose.model('User', userSchema);

  // POST /api/auth/login
  app.post('/api/auth/me', async (req, res) => {
    try {
      await ensureConnected();
      const { email, password, role } = req.body || {};
      if (!email || !password || !role) {
        res.status(400).json({ success: false, error: 'email, password and role are required' });
        return;
      }

      const user = await User.findOne({ email: String(email).toLowerCase().trim(), role }).select('+password');
      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET || 'fallback-secret-key', { expiresIn: process.env.JWT_EXPIRE || '7d' });

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  });

  // GET /api/auth/debug/users
  app.get('/api/auth/debug/users', async (req, res) => {
    try {
      await ensureConnected();
      const users = await User.find({}, { password: 0 }).lean();
      res.json({ success: true, count: users.length, users });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Server error' });
    }
  });

  // POST /api/auth/seed - create default admin, instructor, and student
  app.post('/api/auth/seed', async (req, res) => {
    try {
      await ensureConnected();
      const defaults = [
        {
          email: process.env.ADMIN_EMAIL || 'admin@university.edu',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          password: process.env.ADMIN_PASSWORD || 'password123',
        },
        {
          email: 'instructor@university.edu',
          firstName: 'Dr. Smith',
          lastName: 'Instructor',
          role: 'instructor',
          password: 'password123',
        },
        {
          email: 'student@university.edu',
          firstName: 'John',
          lastName: 'Student',
          role: 'student',
          studentId: 'STU001',
          password: 'password123',
        },
      ];

      const results = [];
      for (const d of defaults) {
        const existing = await User.findOne({ email: d.email, role: d.role });
        if (existing) {
          results.push({ email: d.email, role: d.role, status: 'exists' });
          continue;
        }
        const hash = await bcrypt.hash(d.password, Number(process.env.BCRYPT_ROUNDS || 12));
        const created = await User.create({
          email: d.email,
          firstName: d.firstName,
          lastName: d.lastName,
          role: d.role,
          studentId: d.studentId,
          password: hash,
          isActive: true,
        });
        results.push({ email: created.email, role: created.role, status: 'created' });
      }

      res.json({ success: true, results });
    } catch (err) {
      console.error('Seed error:', err);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  });
} catch (e) {
  // If anything above fails, we still have /health and /api/ping working
  console.error('Inline auth fallback setup failed:', e);
}

// DB status diagnostic
app.get('/api/db-status', async (req, res) => {
  try {
    const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
    const dbName = mongoose.connection.name;
    const host = mongoose.connection.host;
    res.json({
      success: true,
      readyState: state,
      host,
      dbName,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'status-failed' });
  }
});

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
