"use strict";

const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { connectDB } = require("./config/database");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { User } = require("./models/User");
const { Course } = require("./models/Course");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const courseRoutes = require("./routes/courses");
const enrollmentRoutes = require("./routes/enrollments");
const materialRoutes = require("./routes/materials");
const assignmentRoutes = require("./routes/assignments");
const resultRoutes = require("./routes/results");
const dashboardRoutes = require("./routes/dashboard");
const registrationRoutes = require("./routes/registrations");

dotenv.config({ path: path.join(process.cwd(), "config.env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log("📦 MongoDB already connected");
      return;
    }

    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/ead-lms";
    const clientOptions = {
      serverApi: { version: "1", strict: true, deprecationErrors: true },
      autoCreate: true,
      autoIndex: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    console.log("🔄 Connecting to MongoDB Atlas...");
    await mongoose.connect(uri, clientOptions);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    // Don't throw error in serverless - just log it
  }
};

// Ensure default users
const ensureDefaultUsers = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@university.edu";
    const adminPassword = process.env.ADMIN_PASSWORD || "password123";
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        email: adminEmail,
        password: adminPassword,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        isActive: true,
        isEmailVerified: true,
      });
      console.log(`👑 Admin created: ${admin.email}`);
    } else {
      const isMatch = await admin.comparePassword(adminPassword);
      if (!isMatch) {
        admin.password = adminPassword;
        await admin.save();
        console.log(`🔑 Admin password updated: ${admin.email}`);
      }
    }

    const instructorEmail = "instructor@university.edu";
    const instructorPassword = "password123";
    let instructor = await User.findOne({ email: instructorEmail });
    if (!instructor) {
      instructor = await User.create({
        email: instructorEmail,
        password: instructorPassword,
        firstName: "Dr. Smith",
        lastName: "Instructor",
        role: "instructor",
        isActive: true,
        isEmailVerified: true,
      });
      console.log(`👨‍🏫 Instructor created: ${instructor.email}`);
    } else {
      const isMatch = await instructor.comparePassword(instructorPassword);
      if (!isMatch) {
        instructor.password = instructorPassword;
        await instructor.save();
        console.log(`🔑 Instructor password updated: ${instructor.email}`);
      }
    }

    const studentEmail = "student@university.edu";
    const studentPassword = "password123";
    let student = await User.findOne({ email: studentEmail });
    if (!student) {
      student = await User.create({
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
    } else {
      const isMatch = await student.comparePassword(studentPassword);
      if (!isMatch) {
        student.password = studentPassword;
        await student.save();
        console.log(`🔑 Student password updated: ${student.email}`);
      }
    }

    return { admin, instructor, student };
  } catch (err) {
    console.error("Failed to ensure default users:", err);
    throw err;
  }
};

// Ensure sample courses
const ensureSampleCourses = async (instructor) => {
  try {
    const courseCount = await Course.countDocuments();
    if (courseCount > 0) return;

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

    await Course.insertMany(sampleCourses);
    console.log(`📚 Created ${sampleCourses.length} sample courses`);
  } catch (err) {
    console.error("Failed to create sample courses:", err);
  }
};

// Ensure sample results
const ensureSampleResults = async (student, course) => {
  try {
    const Result = require("./models/Result").default;
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
  } catch (err) {
    console.error("Failed to ensure sample results:", err);
  }
};

// Initialize system
const initializeSystem = async () => {
  try {
    await connectDB();
    const { admin, instructor, student } = await ensureDefaultUsers();
    const course = await Course.findOne({ instructor: instructor._id });
    await ensureSampleCourses(instructor);
    if (course) await ensureSampleResults(student, course);
    console.log("✅ System initialization completed");
  } catch (error) {
    console.error("❌ System initialization failed:", error);
  }
};

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
        "https://frontend-of-ead-lms.vercel.app",
      ];
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "EAD LMS API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("Hello from EAD LMS backend!");
});

// Quick ping
app.get("/api/ping", (req, res) => {
  res.status(200).json({ ok: true, message: "pong" });
});

// Import and use routes
try {
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/enrollments", enrollmentRoutes);
  app.use("/api/materials", materialRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/results", resultRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/registrations", registrationRoutes);
} catch (error) {
  console.error("Error loading routes:", error);
}

// Fallback inline auth routes
try {
  const userSchema = new mongoose.Schema(
    {
      firstName: String,
      lastName: String,
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, select: true },
      role: { type: String, enum: ["admin", "student", "instructor"], required: true },
      studentId: String,
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );

  userSchema.methods.comparePassword = async function (candidate) {
    if (!this.password) return false;
    return bcrypt.compare(candidate, this.password);
  };

  const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    try {
      await connectDB();
      const { email, password, role } = req.body || {};
      if (!email || !password || !role) {
        return res.status(400).json({ success: false, error: "Email, password, and role are required" });
      }

      const user = await UserModel.findOne({ email: String(email).toLowerCase().trim(), role }).select("+password");
      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_SECRET || "fallback-secret-key",
        { expiresIn: process.env.JWT_EXPIRE || "7d" }
      );

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
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // GET /api/auth/debug/users
  app.get("/api/auth/debug/users", async (req, res) => {
    try {
      await connectDB();
      const users = await UserModel.find({}, { password: 0 }).lean();
      res.json({ success: true, count: users.length, users });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // POST /api/auth/seed
  app.post("/api/auth/seed", async (req, res) => {
    try {
      await connectDB();
      const defaults = [
        {
          email: process.env.ADMIN_EMAIL || "admin@university.edu",
          firstName: "Admin",
          lastName: "User",
          role: "admin",
          password: process.env.ADMIN_PASSWORD || "password123",
        },
        {
          email: "instructor@university.edu",
          firstName: "Dr. Smith",
          lastName: "Instructor",
          role: "instructor",
          password: "password123",
        },
        {
          email: "student@university.edu",
          firstName: "John",
          lastName: "Student",
          role: "student",
          studentId: "STU001",
          password: "password123",
        },
      ];

      const results = [];
      for (const d of defaults) {
        const existing = await UserModel.findOne({ email: d.email, role: d.role });
        if (existing) {
          results.push({ email: d.email, role: d.role, status: "exists" });
          continue;
        }
        const hash = await bcrypt.hash(d.password, Number(process.env.BCRYPT_ROUNDS || 12));
        const created = await UserModel.create({
          email: d.email,
          firstName: d.firstName,
          lastName: d.lastName,
          role: d.role,
          studentId: d.studentId,
          password: hash,
          isActive: true,
        });
        results.push({ email: created.email, role: created.role, status: "created" });
      }

      res.json({ success: true, results });
    } catch (err) {
      console.error("Seed error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // DB status diagnostic
  app.get("/api/db-status", async (req, res) => {
    try {
      const state = mongoose.connection.readyState;
      const dbName = mongoose.connection.name;
      const host = mongoose.connection.host;
      res.json({
        success: true,
        readyState: state,
        host,
        dbName,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to get DB status" });
    }
  });
} catch (e) {
  console.error("Inline auth fallback setup failed:", e);
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize system after routes are set up
initializeSystem();

// Export for Vercel
module.exports = app;