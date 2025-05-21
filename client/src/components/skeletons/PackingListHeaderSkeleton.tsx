import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for the packing list header
 */
const PackingListHeaderSkeleton = () => {
  return (
    <div className="bg-white p-4 border-b border-gray-200">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-48 mb-4" />
      <Skeleton className="h-2 w-full mb-2" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
};

export default PackingListHeaderSkeleton;