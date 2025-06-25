const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['images', 'videos', 'gifs', 'music'],
    required: true
  },
  path: {
    type: String,
    required: true
  },
  thumbnailPath: {
    type: String
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Nieuwe folder ondersteuning
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  folderPath: {
    type: String,
    default: ''
  },
  // Extra metadata
  metadata: {
    duration: Number, // Voor video/audio
    width: Number,    // Voor afbeeldingen/video
    height: Number,   // Voor afbeeldingen/video
    bitrate: Number   // Voor audio/video
  }
}, {
  timestamps: true
});

// Indexen voor betere prestaties
fileSchema.index({ category: 1, folder: 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ isPublic: 1 });

module.exports = mongoose.model('File', fileSchema);
