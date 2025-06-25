const User = require('../models/User');
const File = require('../models/File');

const getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userFiles = await File.find({ uploadedBy: req.session.userId });
    
    const stats = {
      totalFiles: userFiles.length,
      filesByCategory: {
        images: userFiles.filter(f => f.category === 'images').length,
        videos: userFiles.filter(f => f.category === 'videos').length,
        gifs: userFiles.filter(f => f.category === 'gifs').length,
        music: userFiles.filter(f => f.category === 'music').length
      },
      publicFiles: userFiles.filter(f => f.isPublic).length,
      privateFiles: userFiles.filter(f => !f.isPublic).length,
      totalStorage: userFiles.reduce((sum, f) => sum + f.size, 0)
    };

    res.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        memberSince: user.createdAt
      },
      stats,
      recentFiles: userFiles
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(file => ({
          id: file._id,
          filename: file.filename,
          originalName: file.originalName,
          category: file.category,
          size: file.size,
          isPublic: file.isPublic,
          uploadedAt: file.createdAt,
          thumbnailUrl: file.thumbnailPath ? `/uploads/thumbnails/thumb_${file.filename}.jpg` : null
        }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

module.exports = {
  getDashboard
};
