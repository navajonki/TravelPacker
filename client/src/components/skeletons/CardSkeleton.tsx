import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  hasHeader?: boolean;
  headerHeight?: number;
  contentItems?: number;
  contentItemHeight?: number;
  className?: string;
}

/**
 * Reusable skeleton for card components
 */
const CardSkeleton: React.FC<CardSkeletonProps> = ({
  hasHeader = true,
  headerHeight = 24,
  contentItems = 3,
  contentItemHeight = 16,
  className = "",
}) => {
  return (
    <Card className={`overflow-hidden ${className}`}>
      {hasHeader && (
        <CardHeader className="pb-2">
          <Skeleton className={`h-${headerHeight} w-3/4 mb-2`} />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
      )}
      <CardContent className="pt-4">
        {Array.from({ length: contentItems }).map((_, i) => (
          <div key={i} className="mb-3">
            <Skeleton className={`h-${contentItemHeight} w-full`} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CardSkeleton;