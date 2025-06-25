const File = require('../models/File');
const Folder = require('../models/Folder');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');

// Configure ffmpeg paths
try {
  const ffmpegStatic = require('ffmpeg-static');
  const ffprobeStatic = require('ffprobe-static');
  ffmpeg.setFfmpegPath(ffmpegStatic);
  ffmpeg.setFfprobePath(ffprobeStatic.path);
} catch (error) {
  console.log('Using system ffmpeg/ffprobe installation');
}

const generateThumbnail = async (filePath, category, filename) => {
  const thumbnailDir = path.join(__dirname, '../uploads/thumbnails');
  await fs.ensureDir(thumbnailDir);
  
  const thumbnailName = `thumb_${path.parse(filename).name}.jpg`;
  const thumbnailPath = path.join(thumbnailDir, thumbnailName);

  try {
    if (category === 'images' || category === 'gifs') {
      await sharp(filePath)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      return thumbnailPath;
    } else if (category === 'videos') {
      return new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .on('end', () => {
            console.log('Video thumbnail generated successfully');
            resolve(thumbnailPath);
          })
          .on('error', (err) => {
            console.error('Video thumbnail generation failed:', err);
            resolve(null);
          })
          .screenshots({
            count: 1,
            folder: thumbnailDir,
            filename: thumbnailName,
            size: '300x300'
          });
      });
    }
    return null;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
  }
};

const getMediaMetadata = async (filePath, category) => {
  const metadata = {};
  
  try {
    if (category === 'images' || category === 'gifs') {
      const imageInfo = await sharp(filePath).metadata();
      metadata.width = imageInfo.width;
      metadata.height = imageInfo.height;
    } else if (category === 'videos' || category === 'music') {
      return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.error('Error getting media metadata:', err);
            resolve({});
            return;
          }
          
          const result = {};
          if (metadata.format && metadata.format.duration) {
            result.duration = Math.round(metadata.format.duration);
          }
          if (metadata.format && metadata.format.bit_rate) {
            result.bitrate = metadata.format.bit_rate;
          }
          
          if (metadata.streams) {
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            if (videoStream) {
              result.width = videoStream.width;
              result.height = videoStream.height;
            }
          }
          
          resolve(result);
        });
      });
    }
  } catch (error) {
    console.error('Error getting metadata:', error);
  }
  
  return metadata;
};

const uploadFile = async (req, res) => {
  try {
    // Controleer of er bestanden zijn (meerdere uploads ondersteuning)
    const files = req.files || (req.file ? [req.file] : []);
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const category = req.params.category;
    const { isPublic, folderId } = req.body;
    
    // Valideer folder als opgegeven
    let targetFolder = null;
    if (folderId) {
      targetFolder = await Folder.findById(folderId);
      if (!targetFolder) {
        return res.status(404).json({ error: 'Target folder not found' });
      }
      if (targetFolder.category !== category) {
        return res.status(400).json({ error: 'Folder category does not match upload category' });
      }
    }

    const results = [];
    const errors = [];

    // Verwerk elk bestand
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Genereer thumbnail
        const thumbnailPath = await generateThumbnail(
          file.path,
          category,
          file.filename
        );

        // Haal metadata op
        const metadata = await getMediaMetadata(file.path, category);

        // Maak database entry
        const fileDoc = new File({
          filename: file.filename,
          originalName: file.originalname,
          category,
          path: file.path,
          thumbnailPath,
          size: file.size,
          mimeType: file.mimetype,
          isPublic: isPublic === 'true',
          uploadedBy: req.session.userId,
          folder: folderId || null,
          folderPath: targetFolder ? targetFolder.path : category,
          metadata
        });

        await fileDoc.save();

        results.push({
          id: fileDoc._id,
          filename: fileDoc.filename,
          originalName: fileDoc.originalName,
          category: fileDoc.category,
          size: fileDoc.size,
          isPublic: fileDoc.isPublic,
          thumbnailPath: thumbnailPath ? `/uploads/thumbnails/thumb_${path.parse(file.filename).name}.jpg` : null,
          downloadUrl: `/api/files/download/${fileDoc._id}`,
          metadata: fileDoc.metadata
        });

      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
        
        // Cleanup failed file
        try {
          await fs.remove(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up failed file:', cleanupError);
        }
      }
    }

    // Stuur response
    if (results.length === 0) {
      return res.status(400).json({ 
        error: 'No files were processed successfully',
        errors 
      });
    }

    const response = {
      message: `${results.length} file(s) uploaded successfully`,
      files: results
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.message += ` (${errors.length} failed)`;
    }

    res.status(201).json(response);
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};

const getFiles = async (req, res) => {
  try {
    const { category } = req.params;
    const { type, folderId } = req.query;
    
    console.log(`Getting files - Category: ${category}, Type: ${type}, Folder: ${folderId}`);
    
    let query = {};
    
    // Handle category filtering
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter by folder
    if (folderId === 'null' || !folderId) {
      query.folder = null;
    } else {
      query.folder = folderId;
    }

    // Handle type filtering
    if (type === 'public') {
      query.isPublic = true;
    } else if (type === 'private') {
      query.isPublic = false;
      query.uploadedBy = req.session.userId;
    } else if (type === 'all') {
      if (req.user && req.user.role === 'viewer') {
        query.isPublic = true;
      }
    }

    console.log('Query:', query);

    const files = await File.find(query)
      .populate('uploadedBy', 'username')
      .populate('folder', 'name path')
      .sort({ createdAt: -1 });

    console.log(`Found ${files.length} files`);

    const formattedFiles = files.map(file => ({
      id: file._id,
      filename: file.filename,
      originalName: file.originalName,
      category: file.category,
      size: file.size,
      isPublic: file.isPublic,
      uploadedBy: file.uploadedBy.username,
      uploadedAt: file.createdAt,
      folder: file.folder ? {
        id: file.folder._id,
        name: file.folder.name,
        path: file.folder.path
      } : null,
      thumbnailUrl: file.thumbnailPath ? `/uploads/thumbnails/thumb_${path.parse(file.filename).name}.jpg` : null,
      fileUrl: `/uploads/${file.category}/${file.filename}`,
      downloadUrl: `/api/files/download/${file._id}`,
      metadata: file.metadata || {}
    }));

    res.json({ files: formattedFiles });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

const downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!file.isPublic && file.uploadedBy.toString() !== req.session.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check delete permissions
    const isOwner = file.uploadedBy.toString() === req.session.userId;
    const isAdmin = req.session.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await fs.remove(file.path);
    if (file.thumbnailPath) {
      await fs.remove(file.thumbnailPath);
    }

    await File.findByIdAndDelete(req.params.id);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
};

module.exports = {
  uploadFile,
  getFiles,
  downloadFile,
  deleteFile
};
