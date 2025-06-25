const express = require('express');
const router = express.Router();
const { requireAuth, requireViewer, requireDeveloper, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');

// Landing page
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Media Manager',
    user: req.session.userId ? req.session : null
  });
});

// Login page
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Login' });
});

// Files page
router.get('/files', requireAuth, requireViewer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.render('files', { 
      title: 'Media Library',
      user: user,
      currentPage: 'files'
    });
  } catch (error) {
    console.error('Files page error:', error);
    res.redirect('/dashboard');
  }
});

// Dashboard page
router.get('/dashboard', requireAuth, requireViewer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    
    // Get dashboard stats
    const File = require('../models/File');
    const stats = {
      totalFiles: await File.countDocuments({ uploadedBy: user._id }),
      publicFiles: await File.countDocuments({ uploadedBy: user._id, isPublic: true }),
      privateFiles: await File.countDocuments({ uploadedBy: user._id, isPublic: false }),
      categories: {
        images: await File.countDocuments({ uploadedBy: user._id, category: 'images' }),
        videos: await File.countDocuments({ uploadedBy: user._id, category: 'videos' }),
        gifs: await File.countDocuments({ uploadedBy: user._id, category: 'gifs' }),
        music: await File.countDocuments({ uploadedBy: user._id, category: 'music' })
      }
    };
    
    res.render('dashboard', { 
      title: 'Dashboard',
      user: user,
      currentPage: 'dashboard',
      stats: stats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', { 
      error: 'Failed to load dashboard',
      title: 'Error',
      user: null,
      currentPage: 'dashboard'
    });
  }
});

// Admin panel page
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.render('admin', { 
      title: 'Admin Panel',
      user: user,
      currentPage: 'admin'
    });
  } catch (error) {
    console.error('Admin page error:', error);
    res.redirect('/dashboard');
  }
});

module.exports = router;
