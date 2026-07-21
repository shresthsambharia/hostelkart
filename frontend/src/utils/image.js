/**
 * Helper to get optimized image URLs by applying high-performance parameters
 * for both Unsplash and Cloudinary images.
 */
export const getOptimizedImageUrl = (imgUrl, width = 300, quality = 60, format = 'webp') => {
  const targetUrl = imgUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e';
  
  if (targetUrl.includes('res.cloudinary.com')) {
    const parts = targetUrl.split('image/upload/');
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

  if (targetUrl.startsWith('https://images.unsplash.com')) {
    const baseUrl = targetUrl.split('?')[0];
    return `${baseUrl}?w=${width}&q=${quality}&fm=${format}&fit=crop&auto=format`;
  }

  if (targetUrl.startsWith('/uploads/') || targetUrl.startsWith('uploads/')) {
    const relativePath = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
    const apiURL = import.meta.env.VITE_API_URL || 'https://hostelkart-backend.onrender.com';
    const backendBase = apiURL.replace(/\/api\/?$/, '');
    return `${backendBase}${relativePath}`;
  }

  return targetUrl;
};

/**
 * Helper to generate responsive srcset string for Unsplash and Cloudinary images
 */
export const getSrcSet = (imgUrl, widths = [256, 384, 512, 640, 750, 828, 1080], quality = 60, format = 'webp') => {
  if (!imgUrl) {
    return undefined;
  }

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
    const width = type === 'original' ? 1080 : type === 'medium' ? 512 : 256;
    return getOptimizedImageUrl(product, width);
  }

  if (type === 'original' && product.imageOriginal) return getOptimizedImageUrl(product.imageOriginal, 1080);
  if (type === 'medium' && product.imageMedium) return getOptimizedImageUrl(product.imageMedium, 512);
  if (type === 'thumb' && product.imageThumb) return getOptimizedImageUrl(product.imageThumb, 256);

  const width = type === 'original' ? 1080 : type === 'medium' ? 512 : 256;
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
 * Get small 256px thumbnail
 */
export const getThumbnail = (product) => {
  return getOptimizedImage(product, 'thumb');
};

/**
 * Get extra-small 256px thumbnail for admin table views
 */
export const getAdminThumbnail = (product) => {
  if (!product) return getOptimizedImageUrl(null, 256);
  
  if (typeof product === 'string') {
    return getOptimizedImageUrl(product, 256);
  }

  if (product.imageThumb) return product.imageThumb;
  return getOptimizedImageUrl(product.image, 256);
};

/**
 * Helper to get a tiny blurred placeholder URL for the blur-up load effect
 */
export const getBlurPlaceholderUrl = (product) => {
  if (!product) return getOptimizedImageUrl(null, 256, 5, 'webp');
  const imgUrl = typeof product === 'string' ? product : product.image;
  return getOptimizedImageUrl(imgUrl, 256, 5, 'webp');
};
