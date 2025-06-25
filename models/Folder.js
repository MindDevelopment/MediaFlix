const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  path: {
    type: String,
    required: true,
    unique: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  category: {
    type: String,
    enum: ['images', 'videos', 'gifs', 'music'],
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index voor betere prestaties
folderSchema.index({ category: 1, parent: 1 });
folderSchema.index({ path: 1 });
folderSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Folder', folderSchema);
