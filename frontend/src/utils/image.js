/**
 * Helper to get optimized image URLs by applying high-performance parameters
 * for both Unsplash and Cloudinary images.
 */
export const getOptimizedImageUrl = (imgUrl, width = 300, quality = 60, format = 'webp') => {
  const targetUrl = imgUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e';
  
  if (import.meta.env.DEV) {
    // Local development fallback
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
      const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const backendBase = apiURL.replace(/\/api\/?$/, '');
      return `${backendBase}${relativePath}`;
    }

    return targetUrl;
  }

  // Production: Route all allowed domains via Vercel edge Image Optimizer
  let absoluteUrl = targetUrl;
  if (targetUrl.startsWith('/uploads/') || targetUrl.startsWith('uploads/')) {
    const relativePath = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
    absoluteUrl = `https://hostelkart-backend.onrender.com${relativePath}`;
  } else if (targetUrl.startsWith('https://images.unsplash.com')) {
    absoluteUrl = targetUrl.split('?')[0];
  }

  return `/_vercel/image?url=${encodeURIComponent(absoluteUrl)}&w=${width}&q=${quality}`;
};

/**
 * Helper to generate responsive srcset string for Unsplash and Cloudinary images
 */
export const getSrcSet = (imgUrl, widths = [256, 384, 512, 640, 750, 828, 1080], quality = 60, format = 'webp') => {
  if (!imgUrl) {
    return undefined;
  }

  if (import.meta.env.DEV) {
    // Development local srcsets
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
  }

  // Production: Route SrcSet widths via Vercel Edge Image Optimizer
  let absoluteUrl = imgUrl;
  if (imgUrl.startsWith('/uploads/') || imgUrl.startsWith('uploads/')) {
    const relativePath = imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`;
    absoluteUrl = `https://hostelkart-backend.onrender.com${relativePath}`;
  } else if (imgUrl.startsWith('https://images.unsplash.com')) {
    absoluteUrl = imgUrl.split('?')[0];
  }

  return widths
    .map((w) => `/_vercel/image?url=${encodeURIComponent(absoluteUrl)}&w=${w}&q=${quality} ${w}w`)
    .join(', ');
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

  if (type === 'original' && product.imageOriginal) return product.imageOriginal;
  if (type === 'medium' && product.imageMedium) return product.imageMedium;
  if (type === 'thumb' && product.imageThumb) return product.imageThumb;

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
