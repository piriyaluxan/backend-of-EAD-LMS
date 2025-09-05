import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  try {
    // Skip connection if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('📦 MongoDB already connected');
      return;
    }

    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/ead-lms";

    // MongoDB Atlas connection options with Stable API version
    const clientOptions = { 
      serverApi: { 
        version: '1' as const, 
        strict: true, 
        deprecationErrors: true 
      },
      // Automatically create database if it doesn't exist
      autoCreate: true,
      // Create indexes automatically
      autoIndex: true,
      // Set maximum pool size (reduced for serverless)
      maxPoolSize: process.env.NODE_ENV === 'production' ? 5 : 10,
      // Server selection timeout
      serverSelectionTimeoutMS: 5000,
      // Socket timeout
      socketTimeoutMS: 45000,
      // Buffer commands for serverless
      bufferCommands: false,
      // Buffer max entries
      bufferMaxEntries: 0,
    };

    console.log('🔄 Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(uri, clientOptions);

    // Test the connection with a ping command
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");

    console.log(`📦 MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    mongoose.connection.on("connected", () => {
      console.log("MongoDB connected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB disconnected");
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error);
  }
};
