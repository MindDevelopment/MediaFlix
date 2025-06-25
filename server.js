const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Trust proxy configuration - More specific configuration
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
} else {
  app.set('trust proxy', 'loopback');
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Voor development, pas aan voor productie
}));

// Rate limiting with better proxy handling
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuten
  max: 100, // Limiteer elke IP tot 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator voor development
  keyGenerator: (req) => {
    if (process.env.NODE_ENV === 'development') {
      // In development, gebruik connection info
      return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'unknown';
    }
    // In production, gebruik req.ip (na trust proxy)
    return req.ip;
  }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuten
  max: 10, // Limiteer uploads tot 10 per 15 minuten
  message: 'Too many upload attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (process.env.NODE_ENV === 'development') {
      return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'unknown';
    }
    return req.ip;
  }
});

app.use('/api/', limiter);
app.use('/api/files/upload', uploadLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // Lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dagen
  }
}));

// Ensure upload directories exist
const ensureUploadDirs = async () => {
  const dirs = [
    'uploads/images',
    'uploads/videos', 
    'uploads/gifs',
    'uploads/music',
    'uploads/thumbnails'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(__dirname, dir));
  }
};

ensureUploadDirs().catch(console.error);

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((error) => console.error('❌ MongoDB connection error:', error));

// Routes
app.use('/', require('./routes/web'));
app.use('/api', require('./routes/index'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/files', require('./routes/files'));
app.use('/api/admin', require('./routes/admin'));



// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).render('404', { 
      title: '404 - Page Not Found',
      user: req.session.userId ? req.session : null 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
});

module.exports = app;