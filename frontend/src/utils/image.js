/**
 * Helper to get optimized Unsplash image URLs by stripping existing size params
 * and appending high-performance format (webp) and compression parameters.
 */
export const getOptimizedImageUrl = (imgUrl, width = 300, quality = 60, format = 'webp') => {
  if (!imgUrl) {
    return `https://images.unsplash.com/photo-1542838132-92c53300491e?w=${width}&q=${quality}&fm=${format}&fit=crop&auto=format`;
  }
  if (imgUrl.startsWith('https://images.unsplash.com')) {
    const baseUrl = imgUrl.split('?')[0];
    return `${baseUrl}?w=${width}&q=${quality}&fm=${format}&fit=crop&auto=format`;
  }
  if (imgUrl.startsWith('/uploads/') || imgUrl.startsWith('uploads/')) {
    const relativePath = imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`;
    const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hostelkart-backend.onrender.com');
    const backendBase = apiURL.replace(/\/api\/?$/, '');
    return `${backendBase}${relativePath}`;
  }
  return imgUrl;
};

/**
 * Helper to generate responsive srcset string for Unsplash images
 */
export const getSrcSet = (imgUrl, widths = [150, 300, 450, 600], quality = 60, format = 'webp') => {
  if (!imgUrl || !imgUrl.startsWith('https://images.unsplash.com')) {
    return undefined;
  }
  const baseUrl = imgUrl.split('?')[0];
  return widths
    .map((w) => `${baseUrl}?w=${w}&q=${quality}&fm=${format}&fit=crop&auto=format ${w}w`)
    .join(', ');
};

/**
 * Get optimized image url based on requested type (original, medium, thumb)
 */
export const getOptimizedImage = (product, type = 'medium') => {
  if (!product) {
    return getOptimizedImageUrl(null, 300);
  }

  // Handle case where product is a string URL
  if (typeof product === 'string') {
    const width = type === 'original' ? 800 : type === 'medium' ? 300 : 100;
    return getOptimizedImageUrl(product, width);
  }

  if (type === 'original' && product.imageOriginal) return product.imageOriginal;
  if (type === 'medium' && product.imageMedium) return product.imageMedium;
  if (type === 'thumb' && product.imageThumb) return product.imageThumb;

  // Fallback to original raw image field
  const width = type === 'original' ? 800 : type === 'medium' ? 300 : 100;
  return getOptimizedImageUrl(product.image, width);
};

/**
 * Get responsive srcset for a product image
 */
export const getResponsiveSrcSet = (product) => {
  if (!product) return undefined;
  const imgUrl = typeof product === 'string' ? product : product.image;
  return getSrcSet(imgUrl);
};

/**
 * Get small 100px thumbnail
 */
export const getThumbnail = (product) => {
  return getOptimizedImage(product, 'thumb');
};

/**
 * Get extra-small 80px thumbnail for admin table views
 */
export const getAdminThumbnail = (product) => {
  if (!product) return getOptimizedImageUrl(null, 80);
  
  if (typeof product === 'string') {
    return getOptimizedImageUrl(product, 80);
  }

  if (product.imageThumb) return product.imageThumb;
  return getOptimizedImageUrl(product.image, 80);
};
