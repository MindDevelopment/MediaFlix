const User = require('../models/User');
const File = require('../models/File');
const fs = require('fs-extra'); // Toegevoegd

const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = new User({
      username,
      password,
      role: role || 'viewer'
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.session.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user's files
    const userFiles = await File.find({ uploadedBy: userId });
    for (const file of userFiles) {
      try {
        await fs.remove(file.path);
        if (file.thumbnailPath) {
          await fs.remove(file.thumbnailPath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    await File.deleteMany({ uploadedBy: userId });

    await User.findByIdAndDelete(userId);

    res.json({ message: 'User and associated files deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalFiles = await File.countDocuments();
    const publicFiles = await File.countDocuments({ isPublic: true });
    const privateFiles = await File.countDocuments({ isPublic: false });

    const filesByCategory = await File.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const categoryStats = {
      images: 0,
      videos: 0,
      gifs: 0,
      music: 0
    };

    filesByCategory.forEach(stat => {
      categoryStats[stat._id] = stat.count;
    });

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const roleStats = {
      admin: 0,
      developer: 0,
      viewer: 0
    };

    usersByRole.forEach(stat => {
      roleStats[stat._id] = stat.count;
    });

    res.json({
      totalUsers,
      totalFiles,
      publicFiles,
      privateFiles,
      categoryStats,
      roleStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

module.exports = {
  getUsers,
  createUser,
  deleteUser,
  getStats
};
