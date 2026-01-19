const express = require('express');
const { default: mongoose } = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const userGameRoutes = require('./routes/userGameRoutes');
const globalErrorHandler = require('./utils/globalErrorHandler');
const app = express();

const DB_LINK = process.env.DATABASE;

// READ DATA FROM BODY TO REQ.BODY
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROUTES
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/game', userGameRoutes);

// SECURITY
app.use(globalErrorHandler);

// DB CONNECTION
async function connectDB() {
  try {
    console.log('Connecting...');
    await mongoose.connect(DB_LINK);
    console.log('DB successfully connected!');
  } catch (err) {
    console.error(err.message);
    process.exit(0);
  }
}

connectDB();

module.exports = app;
