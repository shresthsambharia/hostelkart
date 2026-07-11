import { redisClient, isRedisAvailable } from '../config/redis.js';

let cacheHits = 0;
let cacheMisses = 0;

export const getCacheMetrics = () => {
  const total = cacheHits + cacheMisses;
  const ratio = total > 0 ? (cacheHits / total) * 100 : 0;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRatioPct: Number(ratio.toFixed(1)),
  };
};

export const cache = (seconds) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const isUserSpecific = req.originalUrl.includes('/cart') || 
                           req.originalUrl.includes('/wishlist') || 
                           req.originalUrl.includes('/notifications');
    
    const userPrefix = isUserSpecific && req.user ? `user:${req.user._id}:` : '';
    const cacheKey = `cache:${userPrefix}${req.originalUrl}`;

    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        cacheHits++;
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(JSON.parse(cachedData));
      }

      cacheMisses++;
      res.setHeader('X-Cache', 'MISS');

      const originalJson = res.json;
      res.json = function (body) {
        res.json = originalJson;

        if (res.statusCode === 200) {
          redisClient.set(cacheKey, JSON.stringify(body), 'EX', seconds)
            .catch(err => console.error('[Redis Cache Write Error]:', err.message));
        }

        return res.json(body);
      };

      next();
    } catch (err) {
      console.error('[Cache Middleware Error]:', err.message);
      next();
    }
  };
};

export const clearCachePattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`[Cache Invalidation] Cleared ${keys.length} keys matching: ${pattern}`);
    }
  } catch (err) {
    console.error('[Cache Invalidation Error]:', err.message);
  }
};

export const invalidateProductCache = async (productId = null) => {
  try {
    await clearCachePattern('cache:*products*');
    await clearCachePattern('cache:*recommendations*');
    if (productId) {
      await clearCachePattern(`cache:*${productId}*`);
    }
  } catch (err) {
    console.error('Failed to invalidate product cache:', err.message);
  }
};

export const invalidateCategoryCache = async () => {
  try {
    await clearCachePattern('cache:*categories*');
    await clearCachePattern('cache:*products*');
  } catch (err) {
    console.error('Failed to invalidate category cache:', err.message);
  }
};

export const invalidateCouponCache = async () => {
  try {
    await clearCachePattern('cache:*coupons*');
  } catch (err) {
    console.error('Failed to invalidate coupon cache:', err.message);
  }
};

export const invalidateAnalyticsCache = async () => {
  try {
    await clearCachePattern('cache:*analytics*');
  } catch (err) {
    console.error('Failed to invalidate analytics cache:', err.message);
  }
};
