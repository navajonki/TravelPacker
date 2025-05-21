import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ItemListSkeletonProps {
  items?: number;
  className?: string;
}

/**
 * Skeleton loader for a list of items
 */
const ItemListSkeleton: React.FC<ItemListSkeletonProps> = ({
  items = 5,
  className = "",
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div 
          key={i} 
          className="flex items-center justify-between p-3 border rounded-md"
        >
          <div className="flex items-center space-x-3 flex-1">
            <Skeleton className="h-5 w-5 rounded-md" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ItemListSkeleton;