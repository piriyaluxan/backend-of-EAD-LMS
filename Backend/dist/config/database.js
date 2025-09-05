"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        if (mongoose_1.default.connection.readyState === 1) {
            console.log('📦 MongoDB already connected');
            return;
        }
        const uri = process.env.MONGO_URI || "mongodb://localhost:27017/ead-lms";
        const clientOptions = {
            serverApi: {
                version: '1',
                strict: true,
                deprecationErrors: true
            },
            autoCreate: true,
            autoIndex: true,
            maxPoolSize: process.env.NODE_ENV === 'production' ? 5 : 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
        };
        console.log('🔄 Connecting to MongoDB Atlas...');
        const conn = await mongoose_1.default.connect(uri, clientOptions);
        await mongoose_1.default.connection.db.admin().command({ ping: 1 });
        console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
        console.log(`📦 MongoDB Atlas Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        console.log(`🔗 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
        mongoose_1.default.connection.on("error", (err) => {
            console.error("MongoDB connection error:", err);
        });
        mongoose_1.default.connection.on("disconnected", () => {
            console.log("MongoDB disconnected");
        });
        mongoose_1.default.connection.on("connected", () => {
            console.log("MongoDB connected");
        });
        mongoose_1.default.connection.on("reconnected", () => {
            console.log("MongoDB reconnected");
        });
        process.on("SIGINT", async () => {
            await mongoose_1.default.connection.close();
            console.log("MongoDB connection closed through app termination");
            process.exit(0);
        });
        process.on("SIGTERM", async () => {
            await mongoose_1.default.connection.close();
            console.log("MongoDB connection closed through app termination");
            process.exit(0);
        });
    }
    catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        await mongoose_1.default.connection.close();
        console.log("MongoDB disconnected");
    }
    catch (error) {
        console.error("Error disconnecting from MongoDB:", error);
    }
};
exports.disconnectDB = disconnectDB;
//# sourceMappingURL=database.js.map