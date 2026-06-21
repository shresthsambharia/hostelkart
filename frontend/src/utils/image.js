/**
 * Helper to get optimized Unsplash image URLs by stripping existing size params
 * and appending high-performance format (webp) and compression parameters.
 */
export const getOptimizedImageUrl = (imgUrl, width = 300, quality = 75, format = 'webp') => {
  if (!imgUrl) {
    return `https://images.unsplash.com/photo-1542838132-92c53300491e?w=${width}&q=${quality}&fm=${format}&fit=crop&auto=format`;
  }
  if (imgUrl.startsWith('https://images.unsplash.com')) {
    // Remove query parameters like ?w=400 to apply our optimized parameters cleanly
    const baseUrl = imgUrl.split('?')[0];
    return `${baseUrl}?w=${width}&q=${quality}&fm=${format}&fit=crop&auto=format`;
  }
  return imgUrl;
};

/**
 * Helper to generate responsive srcset string for Unsplash images
 */
export const getSrcSet = (imgUrl, widths = [150, 300, 450, 600], quality = 75, format = 'webp') => {
  if (!imgUrl || !imgUrl.startsWith('https://images.unsplash.com')) {
    return undefined;
  }
  const baseUrl = imgUrl.split('?')[0];
  return widths
    .map((w) => `${baseUrl}?w=${w}&q=${quality}&fm=${format}&fit=crop&auto=format ${w}w`)
    .join(', ');
};
