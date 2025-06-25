const Folder = require('../models/Folder');
const File = require('../models/File');
const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');

const createFolder = async (req, res) => {
  try {
    const { name, parentId, category } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: 'Folder name and category are required' });
    }

    // Valideer category
    const validCategories = ['images', 'videos', 'gifs', 'music'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Validate parentId if provided
    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ error: 'Invalid parent folder ID' });
    }

    // Bouw folder path
    let folderPath = category;
    let parent = null;
    
    if (parentId) {
      parent = await Folder.findById(parentId);
      if (!parent) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
      folderPath = `${parent.path}/${name}`;
    } else {
      folderPath = `${category}/${name}`;
    }

    // Check of folder al bestaat
    const existingFolder = await Folder.findOne({ path: folderPath });
    if (existingFolder) {
      return res.status(400).json({ error: 'Folder already exists' });
    }

    // Maak fysieke folder
    const physicalPath = path.join(__dirname, '../uploads', folderPath);
    await fs.ensureDir(physicalPath);

    // Maak database entry
    const folder = new Folder({
      name,
      path: folderPath,
      parent: parentId || null,
      category,
      createdBy: req.session.userId,
      isPublic: req.body.isPublic === 'true'
    });

    await folder.save();

    res.status(201).json({
      message: 'Folder created successfully',
      folder: {
        id: folder._id,
        name: folder.name,
        path: folder.path,
        parent: folder.parent,
        category: folder.category,
        isPublic: folder.isPublic,
        createdAt: folder.createdAt
      }
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
};

const getFolders = async (req, res) => {
  try {
    const { category, parentId } = req.query;
    
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (parentId === 'null' || !parentId) {
      query.parent = null;
    } else {
      query.parent = parentId;
    }

    // Filter based on user role
    if (req.user && req.user.role === 'viewer') {
      query.isPublic = true;
    }

    const folders = await Folder.find(query)
      .populate('createdBy', 'username')
      .sort({ name: 1 });

    const formattedFolders = folders.map(folder => ({
      id: folder._id,
      name: folder.name,
      path: folder.path,
      parent: folder.parent,
      category: folder.category,
      isPublic: folder.isPublic,
      createdBy: folder.createdBy.username,
      createdAt: folder.createdAt
    }));

    res.json({ folders: formattedFolders });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: 'Invalid folder ID' });
    }
    
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check permissions
    if (folder.createdBy.toString() !== req.session.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if folder has subfolders
    const subfolders = await Folder.find({ parent: folderId });
    if (subfolders.length > 0) {
      return res.status(400).json({ error: 'Cannot delete folder with subfolders. Delete subfolders first.' });
    }

    // Check if folder has files
    const files = await File.find({ folder: folderId });
    if (files.length > 0) {
      return res.status(400).json({ error: 'Cannot delete folder with files. Move or delete files first.' });
    }

    // Delete physical folder
    const physicalPath = path.join(__dirname, '../uploads', folder.path);
    try {
      await fs.remove(physicalPath);
    } catch (err) {
      console.error('Error removing physical folder:', err);
    }

    // Delete from database
    await Folder.findByIdAndDelete(folderId);

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
};

const moveFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { folderId } = req.body;
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }
    
    if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: 'Invalid folder ID' });
    }
    
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permissions
    const isOwner = file.uploadedBy.toString() === req.session.userId;
    const isAdmin = req.session.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file is already in the target folder
    const currentFolderId = file.folder ? file.folder.toString() : null;
    const targetFolderId = folderId || null;
    
    if (currentFolderId === targetFolderId) {
      return res.status(400).json({ error: 'File is already in the target folder' });
    }

    let targetFolder = null;
    let newFolderPath = file.category; // Default to category root
    
    if (folderId) {
      targetFolder = await Folder.findById(folderId);
      if (!targetFolder) {
        return res.status(404).json({ error: 'Target folder not found' });
      }
      
      // Check if folder is in same category
      if (targetFolder.category !== file.category) {
        return res.status(400).json({ error: 'Cannot move file to folder of different category' });
      }
      
      newFolderPath = targetFolder.path;
    }

    // Calculate new file path
    const oldPath = file.path;
    const fileName = path.basename(oldPath);
    const newPath = path.join(__dirname, '../uploads', newFolderPath, fileName);
    
    // Check if source and destination are the same
    if (path.resolve(oldPath) === path.resolve(newPath)) {
      return res.status(400).json({ error: 'File is already in the target location' });
    }
    
    // Ensure target directory exists
    await fs.ensureDir(path.dirname(newPath));
    
    // Move physical file
    await fs.move(oldPath, newPath);
    
    // Move thumbnail if exists
    if (file.thumbnailPath) {
      try {
        const thumbnailName = path.basename(file.thumbnailPath);
        const newThumbnailDir = path.join(__dirname, '../uploads/thumbnails');
        await fs.ensureDir(newThumbnailDir);
        const newThumbnailPath = path.join(newThumbnailDir, thumbnailName);
        
        if (path.resolve(file.thumbnailPath) !== path.resolve(newThumbnailPath)) {
          await fs.move(file.thumbnailPath, newThumbnailPath);
          file.thumbnailPath = newThumbnailPath;
        }
      } catch (err) {
        console.error('Error moving thumbnail:', err);
      }
    }

    // Update database
    file.folder = folderId || null;
    file.folderPath = newFolderPath;
    file.path = newPath;
    
    await file.save();

    res.json({ 
      message: 'File moved successfully',
      file: {
        id: file._id,
        folder: file.folder,
        folderPath: file.folderPath,
        path: file.path
      }
    });
  } catch (error) {
    console.error('Move file error:', error);
    res.status(500).json({ error: 'Failed to move file' });
  }
};

module.exports = {
  createFolder,
  getFolders,
  deleteFolder,
  moveFile
};
