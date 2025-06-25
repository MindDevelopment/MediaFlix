const User = require('../models/User');

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.session.userId);
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  };
};

const requireAdmin = requireRole(['admin']);
const requireDeveloper = requireRole(['developer', 'admin']);
const requireViewer = requireRole(['viewer', 'developer', 'admin']);

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireDeveloper,
  requireViewer
};
