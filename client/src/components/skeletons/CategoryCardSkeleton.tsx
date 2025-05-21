import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for category cards
 */
const CategoryCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex items-center space-x-1">
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
      
      <div className="p-3 space-y-3">
        {[1, 2, 3].map((index) => (
          <div key={index} className="flex items-center justify-between p-2 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="flex space-x-1">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryCardSkeleton;