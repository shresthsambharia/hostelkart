import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { getOptimizedImageUrl, getSrcSet } from '../utils/image';

describe('HostelKart Frontend Component & Utility Tests', () => {
  it('should correctly optimize unsplash images', () => {
    const unsplashUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format';
    const opt = getOptimizedImageUrl(unsplashUrl, 300);
    expect(opt).toContain('w=300');
    expect(opt).toContain('fm=webp');
  });

  it('should fallback to default image if imgUrl is empty', () => {
    const fallback = getOptimizedImageUrl(null, 300);
    expect(fallback).toContain('unsplash.com');
    expect(fallback).toContain('w=300');
  });

  it('should render correct sizes and formats for Cloudinary images', () => {
    const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v123/product.png';
    const opt = getOptimizedImageUrl(cloudinaryUrl, 500);
    expect(opt).toContain('w_500');
    expect(opt).toContain('fl_progressive');
    expect(opt).toContain('f_auto');
  });

  it('should produce appropriate srcset breakpoints list', () => {
    const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/product.png';
    const srcSet = getSrcSet(cloudinaryUrl);
    expect(srcSet).toContain('150w');
    expect(srcSet).toContain('1600w');
  });
});
