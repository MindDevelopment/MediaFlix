// Image viewer with better cleanup for mobile devices

class MediaViewer {
    constructor() {
        this.currentIndex = 0;
        this.mediaItems = [];
        this.isOpen = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.swipeThreshold = 100; // Minimum distance for swipe
        this.eventListeners = []; // Track event listeners for cleanup
        
        // Create viewer elements
        this.createViewerElements();
    }
    
    createViewerElements() {
        // Create container
        this.container = document.createElement('div');
        this.container.classList.add('media-viewer-container');
        
        // Create close button
        this.closeButton = document.createElement('button');
        this.closeButton.classList.add('media-viewer-close');
        this.closeButton.innerHTML = '&times;';
        this.closeButton.setAttribute('aria-label', 'Close viewer');
        
        // Create navigation buttons
        this.prevButton = document.createElement('button');
        this.prevButton.classList.add('media-viewer-nav', 'media-viewer-prev');
        this.prevButton.innerHTML = '&#10094;';
        this.prevButton.setAttribute('aria-label', 'Previous image');
        
        this.nextButton = document.createElement('button');
        this.nextButton.classList.add('media-viewer-nav', 'media-viewer-next');
        this.nextButton.innerHTML = '&#10095;';
        this.nextButton.setAttribute('aria-label', 'Next image');
        
        // Create content container
        this.content = document.createElement('div');
        this.content.classList.add('media-viewer-content');
        
        // Assemble elements
        this.container.appendChild(this.closeButton);
        this.container.appendChild(this.prevButton);
        this.container.appendChild(this.nextButton);
        this.container.appendChild(this.content);
        
        // Not adding to DOM yet - will be added when opening
    }
    
    open(mediaItems, startIndex = 0) {
        if (this.isOpen) {
            this.close(); // Close first if already open
        }
        
        this.mediaItems = mediaItems;
        this.currentIndex = startIndex;
        this.isOpen = true;
        
        // Add to DOM
        document.body.appendChild(this.container);
        
        // Lock body scroll
        this.originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        
        // Show first item
        this.showMedia(this.currentIndex);
        
        // Add event listeners
        this.addEventListeners();
        
        // Add visible class after a small delay for transitions
        setTimeout(() => {
            this.container.classList.add('visible');
        }, 10);
    }
    
    close() {
        if (!this.isOpen) return;
        
        // Start the closing transition
        this.container.classList.remove('visible');
        
        // Wait for the transition to finish before removing
        setTimeout(() => {
            // Clean up event listeners
            this.removeEventListeners();
            
            // Remove from DOM
            if (this.container.parentNode) {
                document.body.removeChild(this.container);
            }
            
            // Reset body scroll
            document.body.style.overflow = this.originalBodyOverflow || '';
            
            // Reset state
            this.isOpen = false;
            this.mediaItems = [];
            this.currentIndex = 0;
            
            // Remove any touch-action styles that might have been added
            document.documentElement.style.touchAction = '';
            document.body.style.touchAction = '';
            
            // Clear content to free memory
            this.content.innerHTML = '';
            
            // Force layout recalculation
            window.requestAnimationFrame(() => {
                document.body.style.pointerEvents = 'none';
                window.requestAnimationFrame(() => {
                    document.body.style.pointerEvents = '';
                });
            });
        }, 300); // Adjust timing based on your CSS transition duration
    }
    
    addEventListeners() {
        // Helper to track and add listeners for easy removal
        const addTrackedListener = (element, event, handler, options) => {
            element.addEventListener(event, handler, options);
            this.eventListeners.push({ element, event, handler });
        };
        
        // Close button
        addTrackedListener(this.closeButton, 'click', () => this.close());
        
        // Navigation buttons
        addTrackedListener(this.prevButton, 'click', () => this.showPrevious());
        addTrackedListener(this.nextButton, 'click', () => this.showNext());
        
        // Keyboard navigation
        addTrackedListener(document, 'keydown', (e) => {
            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowLeft') this.showPrevious();
            if (e.key === 'ArrowRight') this.showNext();
        });
        
        // Touch events for swiping
        addTrackedListener(this.content, 'touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        addTrackedListener(this.content, 'touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe();
        }, { passive: true });
        
        // Tap to close
        addTrackedListener(this.container, 'click', (e) => {
            // Close only if clicking the background, not the content
            if (e.target === this.container) {
                this.close();
            }
        });
    }
    
    removeEventListeners() {
        // Remove all tracked event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        
        // Clear the tracking array
        this.eventListeners = [];
    }
    
    handleSwipe() {
        const horizontalDistance = this.touchEndX - this.touchStartX;
        const verticalDistance = this.touchEndY - this.touchStartY;
        
        // Only process horizontal swipes (ignore mostly vertical swipes)
        if (Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
            if (horizontalDistance > this.swipeThreshold) {
                this.showPrevious(); // Swipe right
            } else if (horizontalDistance < -this.swipeThreshold) {
                this.showNext(); // Swipe left
            }
        }
    }
    
    showPrevious() {
        if (this.currentIndex > 0) {
            this.showMedia(this.currentIndex - 1);
        }
    }
    
    showNext() {
        if (this.currentIndex < this.mediaItems.length - 1) {
            this.showMedia(this.currentIndex + 1);
        }
    }
    
    showMedia(index) {
        if (index < 0 || index >= this.mediaItems.length) return;
        
        this.currentIndex = index;
        const item = this.mediaItems[index];
        
        // Clear current content
        this.content.innerHTML = '';
        
        if (item.type === 'image' || item.type === 'gif') {
            const img = document.createElement('img');
            img.src = item.url;
            img.alt = item.caption || '';
            img.classList.add('media-viewer-image');
            
            // Improved mobile handling
            img.style.touchAction = 'pinch-zoom';
            img.style.userSelect = 'none';
            img.style.webkitUserSelect = 'none';
            img.style.webkitTouchCallout = 'none';
            
            // Add load event listener for better performance
            img.addEventListener('load', () => {
                // Image loaded successfully
                console.log('Image loaded:', item.url);
            });
            
            img.addEventListener('error', () => {
                // Fallback for broken images
                img.alt = 'Failed to load image';
                console.error('Failed to load image:', item.url);
            });
            
            this.content.appendChild(img);
        } else if (item.type === 'video') {
            const video = document.createElement('video');
            video.src = item.url;
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true; // Important for iOS
            video.classList.add('media-viewer-video');
            video.style.touchAction = 'manipulation';
            this.content.appendChild(video);
        }
        
        // Update navigation buttons visibility
        this.prevButton.style.display = this.currentIndex > 0 ? 'block' : 'none';
        this.nextButton.style.display = this.currentIndex < this.mediaItems.length - 1 ? 'block' : 'none';
    }
}

// Fullscreen image viewer class
class ImageViewer {
    constructor() {
        // Main elements
        this.viewer = document.getElementById('fullscreen-image-viewer');
        this.image = document.getElementById('fullscreen-image');
        this.caption = document.getElementById('fullscreen-caption');
        this.counter = document.getElementById('fullscreen-counter');
        
        // Buttons
        this.closeBtn = document.getElementById('fullscreen-close');
        this.prevBtn = document.getElementById('fullscreen-prev');
        this.nextBtn = document.getElementById('fullscreen-next');
        
        // Gallery data
        this.images = [];
        this.currentIndex = 0;
        
        // Bind event handlers
        this.bindEvents();
        this.collectImages();
    }
    
    bindEvents() {
        // Button click handlers - with null checks
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.showPrevious());
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.showNext());
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Click handler for gallery images
        document.addEventListener('DOMContentLoaded', () => {
            this.collectImages();
        });
    }
    
    collectImages() {
        // Find all images that should be part of the gallery
        const imageElements = document.querySelectorAll('.gallery-image');
        
        this.images = Array.from(imageElements).map(img => {
            // Add click handler to each image
            img.addEventListener('click', () => this.open(img.dataset.id));
            
            return {
                id: img.dataset.id,
                src: img.dataset.fullsize || img.src,
                alt: img.alt || 'Image',
                title: img.dataset.title || img.alt || 'Image'
            };
        });
    }
    
    open(imageId) {
        // Find the image index
        this.currentIndex = this.images.findIndex(img => img.id === imageId);
        if (this.currentIndex === -1) return;
        
        this.showImage(this.currentIndex);
        this.viewer.classList.add('active');
        
        // Prevent body scrolling when fullscreen is active
        document.body.style.overflow = 'hidden';
    }
    
    close() {
        this.viewer.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    showImage(index) {
        if (index < 0 || index >= this.images.length) return;
        
        const img = this.images[index];
        this.currentIndex = index;
        
        // Apply zoom-in animation
        this.image.classList.remove('zoom-in');
        void this.image.offsetWidth; // Trigger reflow
        this.image.classList.add('zoom-in');
        
        this.image.src = img.src;
        this.image.alt = img.alt;
        this.caption.textContent = img.title;
        this.counter.textContent = `${index + 1} / ${this.images.length}`;
        
        // Update navigation buttons
        this.updateNavButtons();
    }
    
    showNext() {
        let nextIndex = this.currentIndex + 1;
        if (nextIndex >= this.images.length) {
            nextIndex = 0; // Loop back to the first image
        }
        this.showImage(nextIndex);
    }
    
    showPrevious() {
        let prevIndex = this.currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = this.images.length - 1; // Loop to the last image
        }
        this.showImage(prevIndex);
    }
    
    updateNavButtons() {
        // Enable both buttons by default (for looping)
        this.prevBtn.disabled = false;
        this.nextBtn.disabled = false;
    }
    
    handleKeyPress(event) {
        // Only respond to key events when the viewer is active
        if (!this.viewer.classList.contains('active')) return;
        
        switch(event.key) {
            case 'Escape':
                this.close();
                break;
            case 'ArrowLeft':
                this.showPrevious();
                break;
            case 'ArrowRight':
                this.showNext();
                break;
        }
    }
}

// Initialize the viewers
document.addEventListener('DOMContentLoaded', () => {
    // Create a single global instance for MediaViewer
    window.mediaViewer = new MediaViewer();
    
    // Set up click handlers for media thumbnails
    document.querySelectorAll('.media-thumbnail').forEach((thumbnail, index) => {
        thumbnail.addEventListener('click', function() {
            const mediaItems = Array.from(document.querySelectorAll('.media-thumbnail')).map(thumb => {
                return {
                    type: thumb.dataset.type || 'image',
                    url: thumb.dataset.fullsize || thumb.src,
                    caption: thumb.alt || ''
                };
            });
            
            window.mediaViewer.open(mediaItems, index);
        });
    });
    
    // Create a single global instance for ImageViewer
    window.imageViewer = new ImageViewer();
});
