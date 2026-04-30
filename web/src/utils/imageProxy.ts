/**
 * Utility functions for handling image URLs with proxy support
 */

/**
 * Transforms Deezer CDN URLs to use the local proxy to avoid SSL certificate issues
 * @param url - The original image URL
 * @returns The proxied URL or original URL if not a Deezer CDN URL
 */
export function proxyDeezerImage(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Check if it's a Deezer CDN URL
  if (url.startsWith('https://cdn-images.dzcdn.net/')) {
    // Transform to use our proxy: https://cdn-images.dzcdn.net/... -> /cdn-images/...
    return url.replace('https://cdn-images.dzcdn.net', '/cdn-images');
  }
  
  // Return original URL for non-Deezer images
  return url;
}

/**
 * Transforms any image URL to use appropriate proxy if needed
 * Currently only handles Deezer CDN URLs, but can be extended for other CDNs
 */
export function proxyImageUrl(url: string | null | undefined): string | null {
  return proxyDeezerImage(url);
}