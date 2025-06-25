+class MusicPlayer {
    constructor() {
        // Player elements
        this.player = document.getElementById('music-player');
        this.albumArt = document.getElementById('album-art');
        this.trackTitle = document.getElementById('track-title');
        this.trackArtist = document.getElementById('track-artist');
        this.playButton = document.getElementById('play-button');
        this.prevButton = document.getElementById('prev-button');
        this.nextButton = document.getElementById('next-button');
        this.progressBar = document.getElementById('progress-bar');
        this.progressContainer = document.querySelector('.progress-container');
        this.currentTimeDisplay = document.getElementById('current-time');
        this.totalTimeDisplay = document.getElementById('total-time');
        this.volumeSlider = document.getElementById('volume-slider');
        this.playlistContainer = document.getElementById('playlist');
        this.playlistItems = document.getElementById('playlist-items');
        
        // Audio element
        this.audio = new Audio();
        
        // Player state
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        
        // Initialize
        this.bindEvents();
    }
    
    bindEvents() {
        // Play/Pause button
        this.playButton.addEventListener('click', () => this.togglePlay());
        
        // Previous/Next buttons
        this.prevButton.addEventListener('click', () => this.playPrevious());
        this.nextButton.addEventListener('click', () => this.playNext());
        
        // Progress bar
        this.progressContainer.addEventListener('click', (e) => this.setProgress(e));
        
        // Volume slider
        this.volumeSlider.addEventListener('input', () => {
            this.audio.volume = this.volumeSlider.value;
        });
        
        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.playNext());
        this.audio.addEventListener('loadedmetadata', () => {
            this.totalTimeDisplay.textContent = this.formatTime(this.audio.duration);
        });
        
        // Toggle playlist visibility
        this.trackTitle.addEventListener('click', () => {
            this.playlistContainer.classList.toggle('active');
        });
        
        // Enable keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault(); // Prevent page scrolling
                this.togglePlay();
            } else if (e.code === 'ArrowRight' && e.ctrlKey) {
                this.playNext();
            } else if (e.code === 'ArrowLeft' && e.ctrlKey) {
                this.playPrevious();
            }
        });
    }
    
    loadPlaylist(audioFiles) {
        this.playlist = audioFiles.map(file => {
            return {
                id: file.id,
                title: file.title,
                artist: file.artist || 'Unknown Artist',
                url: file.url,
                thumbnail: file.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyUzYuNDggMjIgMTIgMjIgMjIgMTcuNTIgMjIgMTJTMTcuNTIgMiAxMiAyWk0xMCAxNi41VjcuNUwxNiAxMkwxMCAxNi41WiIgZmlsbD0iIzMzMzMzMyIvPgo8L3N2Zz4K',
                duration: file.duration || '0:00'
            };
        });
        
        this.renderPlaylist();
        this.showPlayer(); // Make player visible
    }
    
    renderPlaylist() {
        this.playlistItems.innerHTML = '';
        
        this.playlist.forEach((track, index) => {
            const item = document.createElement('li');
            item.className = 'playlist-item';
            if (index === this.currentTrackIndex) {
                item.classList.add('active');
            }
            
            item.innerHTML = `
                <div class="playlist-item-title">${track.title}</div>
                <div class="playlist-item-duration">${track.duration}</div>
            `;
            
            item.addEventListener('click', () => {
                this.currentTrackIndex = index;
                this.loadTrack();
                this.play();
            });
            
            this.playlistItems.appendChild(item);
        });
    }
    
    loadTrack() {
        if (this.playlist.length === 0) return;
        
        const track = this.playlist[this.currentTrackIndex];
        this.audio.src = track.url;
        this.albumArt.src = track.thumbnail;
        this.trackTitle.textContent = track.title;
        this.trackArtist.textContent = track.artist;
        
        // Update playlist active item
        const items = this.playlistItems.querySelectorAll('.playlist-item');
        items.forEach((item, index) => {
            if (index === this.currentTrackIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    play() {
        this.audio.play();
        this.isPlaying = true;
        this.playButton.innerHTML = '<i class="fas fa-pause"></i>';
        document.body.classList.add('music-player-active');
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playButton.innerHTML = '<i class="fas fa-play"></i>';
    }
    
    togglePlay() {
        if (this.playlist.length === 0) return;
        
        if (this.audio.src === '') {
            this.loadTrack();
        }
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    playNext() {
        if (this.playlist.length === 0) return;
        
        this.currentTrackIndex++;
        if (this.currentTrackIndex >= this.playlist.length) {
            this.currentTrackIndex = 0;
        }
        
        this.loadTrack();
        
        if (this.isPlaying) {
            this.play();
        }
    }
    
    playPrevious() {
        if (this.playlist.length === 0) return;
        
        if (this.audio.currentTime > 3) {
            // If track has played more than 3 seconds, restart it
            this.audio.currentTime = 0;
            return;
        }
        
        this.currentTrackIndex--;
        if (this.currentTrackIndex < 0) {
            this.currentTrackIndex = this.playlist.length - 1;
        }
        
        this.loadTrack();
        
        if (this.isPlaying) {
            this.play();
        }
    }
    
    updateProgress() {
        const { currentTime, duration } = this.audio;
        if (isNaN(duration)) return;
        
        const progressPercent = (currentTime / duration) * 100;
        this.progressBar.style.width = `${progressPercent}%`;
        this.currentTimeDisplay.textContent = this.formatTime(currentTime);
    }
    
    setProgress(e) {
        const width = this.progressContainer.clientWidth;
        const clickX = e.offsetX;
        const duration = this.audio.duration;
        
        this.audio.currentTime = (clickX / width) * duration;
    }
    
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
    
    showPlayer() {
        this.player.classList.add('active');
        document.body.classList.add('music-player-active');
    }
    
    hidePlayer() {
        this.player.classList.remove('active');
        document.body.classList.remove('music-player-active');
    }
}

// Global function to play a music track
function playMusic(fileId, fileUrl, fileName, thumbnail, artist, duration) {
    // Initialize player if not already done
    if (!window.musicPlayer) {
        window.musicPlayer = new MusicPlayer();
    }
    
    // Create audio file object
    const audioFile = {
        id: fileId,
        title: fileName,
        artist: artist || 'Unknown Artist',
        url: fileUrl,
        thumbnail: thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyUzYuNDggMjIgMTIgMjIgMjIgMTcuNTIgMjIgMTJTMTcuNTIgMiAxMiAyWk0xMCAxNi41VjcuNUwxNiAxMkwxMCAxNi41WiIgZmlsbD0iIzMzMzMzMyIvPgo8L3N2Zz4K',
        duration: duration || '0:00'
    };
    
    // Check if track is already in playlist
    let trackExists = false;
    let trackIndex = -1;
    
    if (window.musicPlayer.playlist) {
        window.musicPlayer.playlist.forEach((track, index) => {
            if (track.id === fileId) {
                trackExists = true;
                trackIndex = index;
            }
        });
    }
    
    // If not in playlist, add it
    if (!trackExists) {
        window.musicPlayer.playlist.push(audioFile);
        trackIndex = window.musicPlayer.playlist.length - 1;
        window.musicPlayer.renderPlaylist();
    }
    
    // Play the track
    window.musicPlayer.currentTrackIndex = trackIndex;
    window.musicPlayer.loadTrack();
    window.musicPlayer.play();
    window.musicPlayer.showPlayer();
}

// Initialize player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if music player elements exist
    if (document.getElementById('music-player')) {
        try {
            window.musicPlayer = new MusicPlayer();
            console.log('✅ MusicPlayer initialized');
        } catch (error) {
            console.log('⚠️ MusicPlayer initialization skipped:', error.message);
        }
    }
});
