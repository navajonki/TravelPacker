import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, RefreshCw, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Debug component that shows detailed information about item assignments and nulls
 */
export default function ItemDebugger({ packingListId }: { packingListId: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  
  const { data: packingList, isLoading, refetch } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}`],
    enabled: !!packingListId
  });
  
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: !!packingListId
  });
  
  const { data: bags } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: !!packingListId
  });
  
  const { data: travelers } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: !!packingListId
  });
  
  // Fetch unassigned items from each specialized endpoint for accuracy
  const { data: nullCategoryItems = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`],
    enabled: !!packingListId
  });
  
  const { data: nullBagItems = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/unassigned/bag`],
    enabled: !!packingListId
  });
  
  const { data: nullTravelerItems = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/unassigned/traveler`],
    enabled: !!packingListId
  });
  
  // Get all items for the packing list (for total count)
  const { data: allItems = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/all-items`],
    enabled: !!packingListId
  });
  
  console.log('ItemDebugger - Items count:', {
    total: allItems.length,
    nullCategory: nullCategoryItems.length,
    nullBag: nullBagItems.length,
    nullTraveler: nullTravelerItems.length
  });
  
  // Count how many times each item appears in the list
  const itemCounts = new Map();
  packingList?.items?.forEach(item => {
    if (itemCounts.has(item.id)) {
      itemCounts.set(item.id, itemCounts.get(item.id) + 1);
    } else {
      itemCounts.set(item.id, 1);
    }
  });
  
  // Check for duplicate items (possible error state)
  const duplicateItems = Array.from(itemCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([id]) => packingList?.items.find(item => item.id === id));
    
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Item data has been refreshed",
    });
  };
  
  if (isLoading || categoriesLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-dashed border-2 border-amber-300 bg-amber-50 mt-4">
      <CardHeader className="p-4 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bug className="h-5 w-5 text-amber-600" />
            <h3 className="font-medium text-amber-800">Item Debugger</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              className="text-amber-600 hover:text-amber-800"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-amber-600 hover:text-amber-800"
            >
              {isExpanded ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Show Details
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-4 text-sm">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">Item Counts</h4>
              <ul className="list-disc pl-5">
                <li>Total items: {packingList?.items?.length || 0}</li>
                <li>Items with null category: {nullCategoryItems.length}</li>
                <li>Items with null bag: {nullBagItems.length}</li>
                <li>Items with null traveler: {nullTravelerItems.length}</li>
              </ul>
            </div>
            
            {nullCategoryItems.length > 0 && (
              <div>
                <h4 className="font-semibold mb-1">Items with Null Category ({nullCategoryItems.length})</h4>
                <ul className="list-disc pl-5">
                  {nullCategoryItems.map(item => (
                    <li key={`cat-${item.id}`}>ID: {item.id}, Name: {item.name}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {nullBagItems.length > 0 && (
              <div>
                <h4 className="font-semibold mb-1">Items with Null Bag ({nullBagItems.length})</h4>
                <ul className="list-disc pl-5">
                  {nullBagItems.map(item => (
                    <li key={`bag-${item.id}`}>ID: {item.id}, Name: {item.name}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {duplicateItems.length > 0 && (
              <div className="bg-red-100 p-3 rounded border border-red-300">
                <h4 className="font-semibold mb-1 text-red-800">Duplicate Items Detected!</h4>
                <ul className="list-disc pl-5">
                  {duplicateItems.map(item => (
                    <li key={`dup-${item.id}`}>ID: {item.id}, Name: {item.name}, Appears {itemCounts.get(item.id)} times</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <h4 className="font-semibold mb-1">Entity Counts</h4>
              <ul className="list-disc pl-5">
                <li>Categories: {categories?.length || 0}</li>
                <li>Bags: {bags?.length || 0}</li>
                <li>Travelers: {travelers?.length || 0}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      )}
      
      <CardFooter className="bg-amber-100 p-2 text-xs text-amber-700 border-t border-amber-200">
        <p>Diagnostic tool for packing list data integrity issues</p>
      </CardFooter>
    </Card>
  );
}