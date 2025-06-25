const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const category = req.params.category || 'misc';
        const uploadDir = path.join(__dirname, '../../uploads', category);
        fs.ensureDirSync(uploadDir); // Create directory if it doesn't exist
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

// Middleware to ensure user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
};

// Mock data (replace with database queries)
let folders = [
    { id: 'folder1', name: 'Movies', category: 'videos', parentId: null, isPublic: true },
    { id: 'folder2', name: 'Vacation Photos', category: 'images', parentId: null, isPublic: false },
    { id: 'folder3', name: 'Music Collection', category: 'music', parentId: null, isPublic: true }
];

let files = [
    {
        id: 'file1',
        originalName: 'Sample Video.mp4',
        fileUrl: '/uploads/videos/sample-video.mp4',
        thumbnailUrl: '/uploads/thumbnails/sample-video.jpg',
        category: 'videos',
        folderId: null,
        size: 1048576,
        uploadedBy: 'System',
        uploadedAt: new Date().toISOString(),
        isPublic: true,
        downloadUrl: '/api/files/download/file1'
    },
    {
        id: 'file2',
        originalName: 'Sample Image.jpg',
        fileUrl: '/uploads/images/sample-image.jpg',
        thumbnailUrl: '/uploads/images/sample-image.jpg',
        category: 'images',
        folderId: null,
        size: 512000,
        uploadedBy: 'System',
        uploadedAt: new Date().toISOString(),
        isPublic: true,
        downloadUrl: '/api/files/download/file2'
    },
    {
        id: 'file3',
        originalName: 'Sample Music.mp3',
        fileUrl: '/uploads/music/sample-music.mp3',
        category: 'music',
        folderId: null,
        size: 3145728,
        uploadedBy: 'System',
        uploadedAt: new Date().toISOString(),
        isPublic: true,
        downloadUrl: '/api/files/download/file3'
    }
];

// GET files by category
router.get('/:category', isAuthenticated, (req, res) => {
    try {
        const { category } = req.params;
        const { folderId } = req.query;
        
        // Validate category
        const validCategories = ['videos', 'images', 'gifs', 'music'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }
        
        // Filter folders by category and parentId
        const filteredFolders = folders.filter(folder => 
            folder.category === category && 
            folder.parentId === (folderId || null)
        );
        
        // Filter files by category and folderId
        const filteredFiles = files.filter(file => 
            file.category === category && 
            file.folderId === (folderId || null)
        );
        
        res.json({
            folders: filteredFolders,
            files: filteredFiles
        });
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

// Upload a file
router.post('/upload/:category', isAuthenticated, upload.array('file'), (req, res) => {
    try {
        const { category } = req.params;
        const { isPublic, folderId } = req.body;
        
        // Validate category
        const validCategories = ['videos', 'images', 'gifs', 'music'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }
        
        // Process uploaded files
        const uploadedFiles = req.files.map(file => {
            const fileId = 'file' + Date.now() + Math.round(Math.random() * 1000);
            
            // Create file record
            const newFile = {
                id: fileId,
                originalName: file.originalname,
                fileUrl: `/uploads/${category}/${file.filename}`,
                thumbnailUrl: `/uploads/${category}/${file.filename}`, // Should generate actual thumbnails for videos
                category,
                folderId: folderId || null,
                size: file.size,
                uploadedBy: req.session.user.username,
                uploadedAt: new Date().toISOString(),
                isPublic: isPublic === 'true',
                downloadUrl: `/api/files/download/${fileId}`
            };
            
            files.push(newFile);
            return newFile;
        });
        
        res.json({ success: true, files: uploadedFiles });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Download a file
router.get('/download/:id', isAuthenticated, (req, res) => {
    try {
        const { id } = req.params;
        const file = files.find(f => f.id === id);
        
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Remove the leading slash from fileUrl
        const filePath = path.join(__dirname, '../..', file.fileUrl.replace(/^\//, ''));
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }
        
        res.download(filePath, file.originalName);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// Delete a file
router.delete('/:id', isAuthenticated, (req, res) => {
    try {
        const { id } = req.params;
        const fileIndex = files.findIndex(f => f.id === id);
        
        if (fileIndex === -1) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const file = files[fileIndex];
        
        // Remove the leading slash from fileUrl
        const filePath = path.join(__dirname, '../..', file.fileUrl.replace(/^\//, ''));
        
        // Delete the file from the filesystem
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Remove the file from the array
        files.splice(fileIndex, 1);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Create a folder
router.post('/folders', isAuthenticated, (req, res) => {
    try {
        const { name, category, isPublic, parentId } = req.body;
        
        if (!name || !category) {
            return res.status(400).json({ error: 'Name and category are required' });
        }
        
        const folderId = 'folder' + Date.now() + Math.round(Math.random() * 1000);
        
        const newFolder = {
            id: folderId,
            name,
            category,
            parentId: parentId || null,
            isPublic: isPublic || false
        };
        
        folders.push(newFolder);
        
        res.json({ success: true, folder: newFolder });
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// Delete a folder
router.delete('/folders/:id', isAuthenticated, (req, res) => {
    try {
        const { id } = req.params;
        const folderIndex = folders.findIndex(f => f.id === id);
        
        if (folderIndex === -1) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        
        // Delete the folder
        folders.splice(folderIndex, 1);
        
        // Delete all files and subfolders in this folder
        files = files.filter(file => file.folderId !== id);
        
        // Recursively delete subfolders
        const deleteSubfolders = (parentId) => {
            const subFolders = folders.filter(f => f.parentId === parentId);
            for (const subFolder of subFolders) {
                folders = folders.filter(f => f.id !== subFolder.id);
                files = files.filter(file => file.folderId !== subFolder.id);
                deleteSubfolders(subFolder.id);
            }
        };
        
        deleteSubfolders(id);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});

module.exports = router;
