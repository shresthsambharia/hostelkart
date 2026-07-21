import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { getOptimizedImageUrl, getSrcSet } from '../utils/image';

describe('HostelKart Frontend Component & Utility Tests', () => {
  it('should correctly optimize Cloudinary images', () => {
    const cloudUrl = 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000000/sample.jpg';
    const opt = getOptimizedImageUrl(cloudUrl, 300);
    expect(opt).toContain('w_300');
    expect(opt).toContain('f_auto');
  });

  it('should fallback to default image if imgUrl is empty', () => {
    const fallback = getOptimizedImageUrl(null, 300);
    expect(fallback).toContain('res.cloudinary.com');
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
