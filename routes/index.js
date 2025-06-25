const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Media Manager API',
    version: '1.0.0',
    status: 'Server is running successfully!',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register (admin only)',
        logout: 'POST /api/auth/logout'
      },
      dashboard: {
        info: 'GET /api/dashboard'
      },
      files: {
        all: 'GET /api/files/all',
        public: 'GET /api/files/public',
        private: 'GET /api/files/private',
        byCategory: 'GET /api/files/:category',
        upload: 'POST /api/files/upload/:category',
        download: 'GET /api/files/download/:id',
        delete: 'DELETE /api/files/:id'
      }
    },
    note: 'This is a REST API. Use tools like Postman, curl, or a frontend application to interact with the endpoints.'
  });
});

module.exports = router;
