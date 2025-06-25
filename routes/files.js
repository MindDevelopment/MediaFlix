const express = require('express');
const router = express.Router();
const { requireAuth, requireViewer, requireDeveloper } = require('../middleware/auth');
const { uploadFile, getFiles, downloadFile, deleteFile } = require('../controllers/fileController');
const { createFolder, getFolders, deleteFolder, moveFile } = require('../controllers/folderController');
const upload = require('../middleware/upload');

// Folder routes
router.post('/folders', requireAuth, requireDeveloper, createFolder);
router.get('/folders', requireAuth, requireViewer, getFolders);
router.delete('/folders/:folderId', requireAuth, requireDeveloper, deleteFolder);
router.patch('/move/:fileId', requireAuth, requireDeveloper, moveFile);

// Category-specific routes
router.get('/images', requireAuth, requireViewer, (req, res, next) => {
  req.params.category = 'images';
  next();
}, getFiles);

router.get('/videos', requireAuth, requireViewer, (req, res, next) => {
  req.params.category = 'videos';
  next();
}, getFiles);

router.get('/gifs', requireAuth, requireViewer, (req, res, next) => {
  req.params.category = 'gifs';
  next();
}, getFiles);

router.get('/music', requireAuth, requireViewer, (req, res, next) => {
  req.params.category = 'music';
  next();
}, getFiles);

// Get files routes
router.get('/all', requireAuth, requireViewer, (req, res, next) => {
  req.query.type = 'all';
  req.params.category = 'all';
  next();
}, getFiles);

router.get('/public', requireAuth, requireViewer, (req, res, next) => {
  req.query.type = 'public';
  req.params.category = 'all';
  next();
}, getFiles);

router.get('/private', requireAuth, requireDeveloper, (req, res, next) => {
  req.query.type = 'private';
  req.params.category = 'all';
  next();
}, getFiles);

// Generic category route (moet na specifieke routes)
router.get('/:category', requireAuth, requireViewer, getFiles);

// Upload, download, delete routes
router.post(
  '/upload/:category',
  requireAuth,
  requireDeveloper,
  upload.array('file'),
  uploadFile
);
router.get('/download/:id', requireAuth, requireViewer, downloadFile);
router.delete('/:id', requireAuth, requireDeveloper, deleteFile);

module.exports = router;
