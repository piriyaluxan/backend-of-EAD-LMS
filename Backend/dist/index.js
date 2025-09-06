"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const database_1 = require("./config/database");
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
const User_1 = require("./models/User");
const Course_1 = require("./models/Course");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const courses_1 = __importDefault(require("./routes/courses"));
const enrollments_1 = __importDefault(require("./routes/enrollments"));
const materials_1 = __importDefault(require("./routes/materials"));
const assignments_1 = __importDefault(require("./routes/assignments"));
const results_1 = __importDefault(require("./routes/results"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const registrations_1 = __importDefault(require("./routes/registrations"));
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), "config.env") });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;

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
const ensureDefaultUsers = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || "admin@university.edu";
        const adminPassword = process.env.ADMIN_PASSWORD || "password123";
        let admin = await User_1.User.findOne({ email: adminEmail });
        if (!admin) {
            admin = await User_1.User.create({
                email: adminEmail,
                password: adminPassword,
                firstName: "Admin",
                lastName: "User",
                role: "admin",
                isActive: true,
                isEmailVerified: true,
            });
            console.log(`👑 Admin created: ${admin.email}`);
        }
        else {
            const isMatch = await admin.comparePassword(adminPassword);
            if (!isMatch) {
                admin.password = adminPassword;
                await admin.save();
                console.log(`🔑 Admin password updated: ${admin.email}`);
            }
        }
        const instructorEmail = "instructor@university.edu";
        const instructorPassword = "password123";
        let instructor = await User_1.User.findOne({ email: instructorEmail });
        if (!instructor) {
            instructor = await User_1.User.create({
                email: instructorEmail,
                password: instructorPassword,
                firstName: "Dr. Smith",
                lastName: "Instructor",
                role: "instructor",
                isActive: true,
                isEmailVerified: true,
            });
            console.log(`👨‍🏫 Instructor created: ${instructor.email}`);
        }
        else {
            const isMatch = await instructor.comparePassword(instructorPassword);
            if (!isMatch) {
                instructor.password = instructorPassword;
                await instructor.save();
                console.log(`🔑 Instructor password updated: ${instructor.email}`);
            }
        }
        const studentEmail = "student@university.edu";
        const studentPassword = "password123";
        let student = await User_1.User.findOne({ email: studentEmail });
        if (!student) {
            student = await User_1.User.create({
                email: studentEmail,
                password: studentPassword,
                firstName: "John",
                lastName: "Student",
                role: "student",
                studentId: "STU001",
                isActive: true,
                isEmailVerified: true,
            });
            console.log(`👨‍🎓 Student created: ${student.email}`);
        }
        else {
            const isMatch = await student.comparePassword(studentPassword);
            if (!isMatch) {
                student.password = studentPassword;
                await student.save();
                console.log(`🔑 Student password updated: ${student.email}`);
            }
        }
        return { admin, instructor, student };
    }
    catch (err) {
        console.error("Failed to ensure default users:", err);
        throw err;
    }
};
const ensureSampleCourses = async (instructor) => {
    try {
        const courseCount = await Course_1.Course.countDocuments();
        if (courseCount > 0)
            return;
        const sampleCourses = [
            {
                title: "Introduction to Computer Science",
                code: "CS101",
                description: "Fundamental concepts of programming and computer science",
                instructor: instructor._id,
                capacity: 50,
                enrolled: 0,
                duration: "16 weeks",
                credits: 3,
                level: "beginner",
                category: "Computer Science",
                tags: ["programming", "basics"],
                status: "active",
            },
            {
                title: "Advanced Mathematics",
                code: "MATH201",
                description: "Advanced mathematical concepts and problem solving",
                instructor: instructor._id,
                capacity: 30,
                enrolled: 0,
                duration: "14 weeks",
                credits: 4,
                level: "intermediate",
                category: "Mathematics",
                tags: ["calculus", "algebra"],
                status: "active",
            },
            {
                title: "Web Development Fundamentals",
                code: "WEB101",
                description: "Learn HTML, CSS, and JavaScript for web development",
                instructor: instructor._id,
                capacity: 40,
                enrolled: 0,
                duration: "12 weeks",
                credits: 3,
                level: "beginner",
                category: "Computer Science",
                tags: ["web", "frontend"],
                status: "active",
            },
        ];
        await Course_1.Course.insertMany(sampleCourses);
        console.log(`📚 Created ${sampleCourses.length} sample courses`);
    }
    catch (err) {
        console.error("Failed to create sample courses:", err);
    }
};
const ensureSampleResults = async (admin, instructor, student) => {
    try {
        const Result = require("./models/Result").default;
        const Course = require("./models/Course").Course;
        const course = await Course.findOne();
        if (!course)
            return;
        const existingResult = await Result.findOne({
            student: student._id,
            course: course._id,
        });
        if (!existingResult) {
            await Result.create({
                student: student._id,
                course: course._id,
                caScore: 75,
                finalExamScore: 80,
                finalGrade: "B+",
                finalPercentage: 78,
                status: "passed",
            });
            console.log(`📊 Sample result created for ${student.firstName} ${student.lastName}`);
        }
    }
    catch (err) {
        console.error("Failed to ensure sample results:", err);
    }
};
const initializeSystem = async () => {
    try {
        const users = await ensureDefaultUsers();
        await ensureSampleCourses(users.instructor);
        await ensureSampleResults(users.admin, users.instructor, users.student);
        console.log("✅ System initialization completed");
    }
    catch (error) {
        console.error("❌ System initialization failed:", error);
    }
};
initializeSystem();
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowed = process.env.CORS_ORIGIN?.split(",") || [
            "https://frontend-of-ead-lms.vercel.app",
            "https://frontend-of-ead-lms.vercel.app",
        ];
        if (!origin)
            return callback(null, true);
        if (origin.startsWith("https://frontend-of-ead-lms.vercel.app") ||
            origin.startsWith("https://frontend-of-ead-lms.vercel.app")) {
            return callback(null, true);
        }
        const isLan = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(origin);
        if (process.env.NODE_ENV !== "production" && isLan) {
            return callback(null, true);
        }
        if (allowed.includes(origin))
            return callback(null, true);
        return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
}));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "EAD LMS API is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// Root endpoint for platform health checks (e.g., Railway)
app.get("/", (req, res) => {
    res.send("Hello from Railway backend!");
});

// Quick ping (helps verify routing in Postman)
app.get("/api/ping", (req, res) => {
    res.status(200).json({ ok: true, message: 'pong' });
});
// Import and use routes
try {
  const distRoot = path_1.default.join(__dirname, 'routes');
  const authRoutes = require(path_1.default.join(distRoot, 'auth.js')).default;
  const userRoutes = require(path_1.default.join(distRoot, 'users.js')).default;
  const courseRoutes = require(path_1.default.join(distRoot, 'courses.js')).default;
  const enrollmentRoutes = require(path_1.default.join(distRoot, 'enrollments.js')).default;
  const materialRoutes = require(path_1.default.join(distRoot, 'materials.js')).default;
  const assignmentRoutes = require(path_1.default.join(distRoot, 'assignments.js')).default;
  const resultRoutes = require(path_1.default.join(distRoot, 'results.js')).default;
  const dashboardRoutes = require(path_1.default.join(distRoot, 'dashboard.js')).default;
  const registrationRoutes = require(path_1.default.join(distRoot, 'registrations.js')).default;

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
  app.post('/api/auth/login', async (req, res) => {
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

} catch (e) {
  // If anything above fails, we still have /health and /api/ping working
  console.error('Inline auth fallback setup failed:', e);
}

app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
});
process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    process.exit(0);
});
process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully");
    process.exit(0);
});
exports.default = app;
module.exports = app; // Added for Vercel compatibility
//# sourceMappingURL=index.js.map