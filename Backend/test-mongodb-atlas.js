const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testMongoDBAtlasConnection() {
  try {
    console.log('🔍 Testing MongoDB Atlas connection...');
    console.log('📡 Connection string:', process.env.MONGO_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI environment variable is not set');
      process.exit(1);
    }

    // MongoDB Atlas connection options with Stable API version
    const clientOptions = { 
      serverApi: { 
        version: '1', 
        strict: true, 
        deprecationErrors: true 
      },
      // Automatically create database if it doesn't exist
      autoCreate: true,
      // Create indexes automatically
      autoIndex: true,
      // Set maximum pool size
      maxPoolSize: 10,
      // Server selection timeout
      serverSelectionTimeoutMS: 5000,
      // Socket timeout
      socketTimeoutMS: 45000,
    };

    console.log('🔄 Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGO_URI, clientOptions);

    // Test the connection with a ping command
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");

    console.log('✅ MongoDB Atlas connection successful!');
    console.log(`📦 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    console.log(`🌐 Port: ${conn.connection.port}`);

    // Test database operations
    console.log('🧪 Testing database operations...');
    
    // Create a test collection
    const testCollection = mongoose.connection.db.collection('test_connection');
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Connection test successful'
    });
    console.log('✅ Test document inserted successfully');

    // Read the test document
    const testDoc = await testCollection.findOne({ test: true });
    console.log('✅ Test document retrieved successfully:', testDoc);

    // Clean up test data
    await testCollection.deleteOne({ test: true });
    console.log('✅ Test document cleaned up');

    console.log('🎉 All tests passed! MongoDB Atlas is working correctly.');

  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication failed. Please check your username and password.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🌐 Network error. Please check your internet connection and cluster URL.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('🚫 Connection refused. Please check your cluster status and firewall settings.');
    }
    
    process.exit(1);
  } finally {
    // Close connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Connection closed');
    }
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, closing connection...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

// Run the test
testMongoDBAtlasConnection();
