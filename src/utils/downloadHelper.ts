/**
 * Universal Video & Media Downloader Helper
 * Handles robust binary download, HTTP response verification,
 * MIME type enforcement (video/mp4), and graceful error handling.
 */

export interface DownloadOptions {
  filename?: string;
  onStart?: () => void;
  onProgress?: (percent: number, message: string) => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export async function downloadVideoFile(
  videoUrl: string,
  options?: DownloadOptions
): Promise<boolean> {
  const { filename, onStart, onProgress, onSuccess, onError } = options || {};

  try {
    onStart?.();
    onProgress?.(10, 'Initiating download request...');

    // If url is empty, reject
    if (!videoUrl || typeof videoUrl !== 'string') {
      throw new Error('Video URL is missing or invalid.');
    }

    // Determine clean filename
    let finalFilename = filename;
    if (!finalFilename) {
      const urlParts = videoUrl.split('/');
      const lastPart = urlParts[urlParts.length - 1].split('?')[0];
      finalFilename = lastPart.endsWith('.mp4') ? lastPart : `${lastPart}.mp4`;
    }
    if (!finalFilename.endsWith('.mp4')) {
      finalFilename += '.mp4';
    }

    onProgress?.(30, 'Fetching binary MP4 stream...');

    // Perform authenticated / binary fetch
    const response = await fetch(videoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'video/mp4,video/*,*/*'
      }
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      let errMsg = `Server responded with status ${response.status} (${response.statusText})`;
      if (contentType.includes('application/json')) {
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
      }
      throw new Error(errMsg);
    }

    onProgress?.(60, 'Verifying media container & bytes...');

    const blob = await response.blob();
    if (!blob || blob.size < 1000) {
      throw new Error('Downloaded video stream is empty or truncated.');
    }

    onProgress?.(85, 'Packaging MP4 for local media player...');

    // Explicitly enforce video/mp4 MIME type on the blob
    const mp4Blob = blob.type === 'video/mp4' ? blob : new Blob([blob], { type: 'video/mp4' });
    const blobUrl = URL.createObjectURL(mp4Blob);

    // Create trigger element
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = finalFilename;
    link.setAttribute('type', 'video/mp4');
    document.body.appendChild(link);
    link.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 15000);

    onProgress?.(100, 'Download complete!');
    onSuccess?.();
    return true;
  } catch (err: any) {
    console.error('[DownloadHelper] Download error:', err);
    const msg = err?.message || 'Failed to download video file';
    onError?.(msg);

    // Fallback: Direct Anchor download
    try {
      console.log('[DownloadHelper] Attempting fallback direct anchor download...');
      const fallbackLink = document.createElement('a');
      fallbackLink.style.display = 'none';
      fallbackLink.href = videoUrl;
      fallbackLink.download = filename || 'shortsforge_video.mp4';
      fallbackLink.target = '_blank';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      setTimeout(() => document.body.removeChild(fallbackLink), 5000);
    } catch (fallbackErr) {
      console.warn('[DownloadHelper] Fallback download failed:', fallbackErr);
    }

    return false;
  }
}
