/**
 * Video Optimization Utilities
 * Client-side video processing and thumbnail generation
 */

/**
 * Generate video thumbnail at specific time
 * @param {string} videoUrl - Video URL or blob URL
 * @param {number} timeInSeconds - Time to capture thumbnail (default: 1s)
 * @returns {Promise<string>} - Base64 data URL of thumbnail
 */
export async function generateVideoThumbnail(videoUrl, timeInSeconds = 1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.src = videoUrl;

    video.addEventListener('loadeddata', () => {
      // Seek to the desired time
      video.currentTime = Math.min(timeInSeconds, video.duration - 0.1);
    });

    video.addEventListener('seeked', () => {
      try {
        // Create canvas and draw video frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to data URL (compressed JPEG)
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Cleanup
        URL.revokeObjectURL(videoUrl);
        
        resolve(thumbnailUrl);
      } catch (error) {
        reject(error);
      }
    });

    video.addEventListener('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Get video metadata (duration, dimensions, format)
 * @param {File} videoFile - Video file object
 * @returns {Promise<object>} - Video metadata
 */
export async function getVideoMetadata(videoFile) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.addEventListener('loadedmetadata', () => {
      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: (video.videoWidth / video.videoHeight).toFixed(2),
        size: videoFile.size,
        type: videoFile.type,
        name: videoFile.name,
      };

      URL.revokeObjectURL(url);
      resolve(metadata);
    });

    video.addEventListener('error', (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    });
  });
}

/**
 * Check if video is portrait (9:16) or close to it
 * @param {number} width - Video width
 * @param {number} height - Video height
 * @returns {boolean} - True if portrait/vertical
 */
export function isPortraitVideo(width, height) {
  const aspectRatio = width / height;
  return aspectRatio < 1; // Less than 1 means height > width (portrait)
}

/**
 * Compress video (client-side) - reduces quality for faster upload
 * Note: This requires HTML5 Canvas API and is limited
 * For production, server-side compression is recommended
 * 
 * @param {File} videoFile - Original video file
 * @param {object} options - Compression options
 * @returns {Promise<Blob>} - Compressed video blob
 */
export async function compressVideoFrame(videoFile, options = {}) {
  const {
    maxWidth = 1080,
    maxHeight = 1920,
    quality = 0.8,
  } = options;

  // Note: True video compression requires server-side processing
  // This is a placeholder for the concept
  // In production, use FFmpeg on server or a service like Cloudinary

  console.warn('Client-side video compression is limited. Consider server-side processing.');
  
  // For now, just return the original file
  // In production, you'd upload to a processing service
  return videoFile;
}

/**
 * Validate video file
 * @param {File} file - Video file to validate
 * @param {object} constraints - Validation constraints
 * @returns {object} - { valid: boolean, error?: string, warnings?: string[] }
 */
export async function validateVideo(file, constraints = {}) {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB default
    maxDuration = 180, // 3 minutes default
    acceptedFormats = ['video/mp4', 'video/webm', 'video/quicktime'],
    preferPortrait = true,
  } = constraints;

  const errors = [];
  const warnings = [];

  // Check file type
  if (!acceptedFormats.includes(file.type)) {
    errors.push(`Format ${file.type} not supported. Use MP4, WebM, or MOV.`);
  }

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
  }

  try {
    // Check metadata
    const metadata = await getVideoMetadata(file);

    // Check duration
    if (metadata.duration > maxDuration) {
      errors.push(`Duration ${metadata.duration.toFixed(0)}s exceeds limit of ${maxDuration}s`);
    }

    // Check orientation
    if (preferPortrait && !isPortraitVideo(metadata.width, metadata.height)) {
      warnings.push('Video is landscape. Portrait videos (9:16) work best for social media.');
    }

    // Check resolution
    if (metadata.width > 1920 || metadata.height > 1920) {
      warnings.push('High resolution detected. Video will be optimized for web.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  } catch (error) {
    return {
      valid: false,
      errors: ['Failed to read video metadata'],
    };
  }
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration (e.g., "2:35")
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

