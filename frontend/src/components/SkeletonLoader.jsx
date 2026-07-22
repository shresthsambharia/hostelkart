import React from 'react';

export const Skeleton = ({ className = '', ...props }) => (
  <div 
    className={`bg-slate-200/80 animate-pulse rounded-xl ${className}`} 
    {...props} 
  />
);

export const ProductCardSkeleton = () => (
  <div className="bg-white border border-slate-100 rounded-3xl p-4 space-y-4 shadow-sm w-full">
    {/* Image Placeholder */}
    <Skeleton className="aspect-square w-full rounded-2xl" />
    
    {/* Category & Title */}
    <div className="space-y-2">
      <Skeleton className="h-3 w-1/4" />
      <Skeleton className="h-4 w-3/4" />
    </div>

    {/* Price & Add to Cart button */}
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ cols = 5 }) => (
  <div className="grid grid-cols-12 gap-4 py-4 px-6 border-b border-slate-100 items-center">
    <Skeleton className="col-span-1 h-8 rounded-lg" />
    <Skeleton className="col-span-4 h-6" />
    <Skeleton className="col-span-3 h-6" />
    <Skeleton className="col-span-2 h-6" />
    <Skeleton className="col-span-2 h-6" />
  </div>
);

export const DashboardCardSkeleton = () => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-premium space-y-4 flex items-center justify-between">
    <div className="space-y-2 flex-1">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
    </div>
    <Skeleton className="h-10 w-10 rounded-xl" />
  </div>
);

export default Skeleton;
