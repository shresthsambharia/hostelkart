/**
 * Helper to get optimized image URLs by applying high-performance parameters
 * for both Unsplash and Cloudinary images.
 */
export const getOptimizedImageUrl = (imgUrl, width = 300, quality = 60, format = 'webp') => {
  if (!imgUrl) {
    return `https://images.unsplash.com/photo-1542838132-92c53300491e?w=${width}&q=${quality}&fm=${format}&fit=crop&auto=format`;
  }
  
  // Cloudinary Optimization with progressive & auto parameters
  if (imgUrl.includes('res.cloudinary.com')) {
    const parts = imgUrl.split('image/upload/');
    if (parts.length === 2) {
      let rest = parts[1];
      const pathSegments = rest.split('/');
      const cleanedSegments = [];
      let foundVersionOrPublicId = false;

      for (const segment of pathSegments) {
        if (foundVersionOrPublicId) {
          cleanedSegments.push(segment);
        } else {
          const isVersion = /^v\d+$/.test(segment);
          const isTransformation = segment.includes('_') || segment.includes(',');
          if (isVersion || !isTransformation) {
            foundVersionOrPublicId = true;
            cleanedSegments.push(segment);
          }
        }
      }
      
      const cleanPath = cleanedSegments.join('/');
      return `${parts[0]}image/upload/w_${width},f_auto,q_auto,dpr_auto,c_fill,g_auto,fl_progressive/${cleanPath}`;
    }
  }

  // Unsplash Optimization
  if (imgUrl.startsWith('https://images.unsplash.com')) {
    const baseUrl = imgUrl.split('?')[0];
    return `${baseUrl}?w=${width}&q=${quality}&fm=${format}&fit=crop&auto=format`;
  }

  // Local Uploads fallback
  if (imgUrl.startsWith('/uploads/') || imgUrl.startsWith('uploads/')) {
    const relativePath = imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`;
    const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hostelkart-backend.onrender.com');
    const backendBase = apiURL.replace(/\/api\/?$/, '');
    return `${backendBase}${relativePath}`;
  }

  return imgUrl;
};

/**
 * Helper to generate responsive srcset string for Unsplash and Cloudinary images
 */
export const getSrcSet = (imgUrl, widths = [150, 300, 500, 800, 1200, 1600], quality = 60, format = 'webp') => {
  if (!imgUrl) {
    return undefined;
  }

  // Cloudinary SrcSet
  if (imgUrl.includes('res.cloudinary.com')) {
    const parts = imgUrl.split('image/upload/');
    if (parts.length === 2) {
      let rest = parts[1];
      const pathSegments = rest.split('/');
      const cleanedSegments = [];
      let foundVersionOrPublicId = false;

      for (const segment of pathSegments) {
        if (foundVersionOrPublicId) {
          cleanedSegments.push(segment);
        } else {
          const isVersion = /^v\d+$/.test(segment);
          const isTransformation = segment.includes('_') || segment.includes(',');
          if (isVersion || !isTransformation) {
            foundVersionOrPublicId = true;
            cleanedSegments.push(segment);
          }
        }
      }
      
      const cleanPath = cleanedSegments.join('/');
      return widths
        .map((w) => `${parts[0]}image/upload/w_${w},f_auto,q_auto,dpr_auto,c_fill,g_auto,fl_progressive/${cleanPath} ${w}w`)
        .join(', ');
    }
  }

  // Unsplash SrcSet
  if (imgUrl.startsWith('https://images.unsplash.com')) {
    const baseUrl = imgUrl.split('?')[0];
    return widths
      .map((w) => `${baseUrl}?w=${w}&q=${quality}&fm=${format}&fit=crop&auto=format ${w}w`)
      .join(', ');
  }

  return undefined;
};

/**
 * Get optimized image url based on requested type (original, medium, thumb)
 */
export const getOptimizedImage = (product, type = 'medium') => {
  if (!product) {
    return getOptimizedImageUrl(null, 300);
  }

  if (typeof product === 'string') {
    const width = type === 'original' ? 1600 : type === 'medium' ? 500 : 150;
    return getOptimizedImageUrl(product, width);
  }

  if (type === 'original' && product.imageOriginal) return product.imageOriginal;
  if (type === 'medium' && product.imageMedium) return product.imageMedium;
  if (type === 'thumb' && product.imageThumb) return product.imageThumb;

  const width = type === 'original' ? 1600 : type === 'medium' ? 500 : 150;
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
 * Get small 150px thumbnail
 */
export const getThumbnail = (product) => {
  return getOptimizedImage(product, 'thumb');
};

/**
 * Get extra-small 150px thumbnail for admin table views
 */
export const getAdminThumbnail = (product) => {
  if (!product) return getOptimizedImageUrl(null, 150);
  
  if (typeof product === 'string') {
    return getOptimizedImageUrl(product, 150);
  }

  if (product.imageThumb) return product.imageThumb;
  return getOptimizedImageUrl(product.image, 150);
};

/**
 * Helper to get a tiny blurred placeholder URL for the blur-up load effect
 */
export const getBlurPlaceholderUrl = (product) => {
  if (!product) return getOptimizedImageUrl(null, 20, 5, 'webp');
  const imgUrl = typeof product === 'string' ? product : product.image;
  return getOptimizedImageUrl(imgUrl, 20, 5, 'webp');
};
