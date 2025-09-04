# MongoDB Atlas Setup Guide

## Overview
This guide explains how to set up and use MongoDB Atlas with your University LMS application.

## Configuration Changes Made

### 1. Environment Variables
- **Old**: `MONGODB_URI=mongodb://localhost:27017/ead-lms`
- **New**: `MONGO_URI=mongodb+srv://sutheskumarpiriyaluxan025_db_user:<db_password>@cluster0.ocpt9fg.mongodb.net/myappdb?retryWrites=true&w=majority&appName=Cluster0`

### 2. Database Connection Features
- ✅ **Automatic Database Creation**: Database will be created automatically when first accessed
- ✅ **Automatic Index Creation**: Indexes will be created automatically
- ✅ **Connection Pooling**: Optimized connection management
- ✅ **Enhanced Error Handling**: Better error messages and connection monitoring
- ✅ **Graceful Shutdown**: Proper cleanup on application termination

## Setup Steps

### Step 1: Update Your Password
Replace `<db_password>` in your `config.env` file with your actual MongoDB Atlas password:

```env
MONGO_URI=mongodb+srv://sutheskumarpiriyaluxan025_db_user:YOUR_ACTUAL_PASSWORD@cluster0.ocpt9fg.mongodb.net/myappdb?retryWrites=true&w=majority&appName=Cluster0
```

### Step 2: Test Connection
Run the test script to verify your MongoDB Atlas connection:

```bash
cd Backend
node test-mongodb-atlas.js
```

### Step 3: Rebuild Project (if using TypeScript)
If you're using TypeScript, rebuild your project to update the compiled files:

```bash
npm run build
# or
npx tsc
```

### Step 4: Start Your Application
Start your application normally:

```bash
npm start
# or
npm run dev
```

## Connection Features

### Automatic Database Creation
- The database `myappdb` will be created automatically when you first access it
- No need to manually create databases or collections
- Collections are created automatically when you first insert documents

### Connection Options
- **autoCreate**: Automatically creates databases and collections
- **autoIndex**: Automatically creates indexes for better performance
- **maxPoolSize**: Maximum 10 concurrent connections
- **Server Selection Timeout**: 5 seconds
- **Socket Timeout**: 45 seconds

### Connection Monitoring
The application now provides detailed connection information:
- Connection status
- Database name
- Host information
- Connection state monitoring

## Troubleshooting

### Common Issues

#### 1. Authentication Failed
```
❌ MongoDB Atlas connection failed: authentication failed
```
**Solution**: Check your username and password in the connection string

#### 2. Network Error
```
❌ MongoDB Atlas connection failed: ENOTFOUND
```
**Solution**: Check your internet connection and verify the cluster URL

#### 3. Connection Refused
```
❌ MongoDB Atlas connection failed: ECONNREFUSED
```
**Solution**: Check if your cluster is running and firewall settings

### Network Access
Ensure your IP address is whitelisted in MongoDB Atlas:
1. Go to MongoDB Atlas Dashboard
2. Navigate to Network Access
3. Add your current IP address or `0.0.0.0/0` for all IPs (development only)

### Database User Permissions
Ensure your database user has the necessary permissions:
- **Read and write to any database** (for development)
- **Read and write to specific database** (for production)

## Security Best Practices

### Production Environment
1. **Never commit passwords** to version control
2. **Use environment variables** for sensitive data
3. **Restrict IP access** to your application servers only
4. **Use database-specific users** with minimal required permissions
5. **Enable MongoDB Atlas security features** (encryption, auditing, etc.)

### Development Environment
1. **Use local environment files** (`.env.local`, `config.env`)
2. **Add environment files** to `.gitignore`
3. **Use strong passwords** even for development

## Fallback Configuration

If you need to switch back to local MongoDB, you can:
1. Update `MONGO_URI` in `config.env`
2. Or use the fallback in the code: `mongodb://localhost:27017/ead-lms`

## Monitoring and Logs

The application now provides enhanced logging:
- Connection status changes
- Database operations
- Error details with context
- Graceful shutdown information

## Support

If you encounter issues:
1. Check the MongoDB Atlas status page
2. Verify your connection string format
3. Test with the provided test script
4. Check the application logs for detailed error information
