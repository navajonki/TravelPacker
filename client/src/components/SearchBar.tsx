import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { useQuery } from '@tanstack/react-query';
import { Item, Category as SchemaCategory, Bag, Traveler } from '@shared/schema';

// Extended Category type that includes items
interface Category extends SchemaCategory {
  items: Item[];
  totalItems: number;
  packedItems: number;
}

interface SearchBarProps {
  packingListId: number;
  onSelectResult: (itemId: number) => void;
  className?: string;
}

interface SearchResult {
  id: number;
  name: string;
  categoryName: string;
  bagName: string | null;
  travelerName: string | null;
  packed: boolean;
}

export default function SearchBar({ packingListId, onSelectResult, className }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { isPending } = useSyncStatus();

  // Use React Query to get all the necessary data
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: !!packingListId
  });
  
  const { data: bags = [] } = useQuery<Bag[]>({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: !!packingListId
  });
  
  const { data: travelers = [] } = useQuery<Traveler[]>({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: !!packingListId
  });
  
  // Get all items from all categories (already in the client-side store)
  const allItems = categories.flatMap(category => 
    category.items || []
  );
  
  // Define the search function to use local data instead of API calls
  const searchItems = useCallback(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      // Filter items locally that match the search term
      const matchedItems = allItems.filter(item => 
        item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
      
      // Transform items into the search result format
      const searchResults: SearchResult[] = matchedItems.map(item => {
        const category = categories.find(c => c.id === item.categoryId);
        const bag = item.bagId ? bags.find(b => b.id === item.bagId) : null;
        const traveler = item.travelerId ? travelers.find(t => t.id === item.travelerId) : null;
        
        return {
          id: item.id,
          name: item.name,
          categoryName: category?.name || 'Unknown',
          bagName: bag?.name || null,
          travelerName: traveler?.name || null,
          packed: item.packed
        };
      });
      
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching items:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, allItems, categories, bags, travelers]);

  // Search when the search term or any related data changes
  useEffect(() => {
    searchItems();
  }, [searchItems]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleResultClick = (itemId: number) => {
    onSelectResult(itemId);
    
    // Force a search refresh after a brief delay to allow the item update to complete
    setTimeout(() => {
      if (debouncedSearchTerm.length >= 2) {
        searchItems();
      }
    }, 300);
    
    // Keep the search term and results visible after clicking
    // so the user can see the updated status
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search items..."
          className="pl-8 pr-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
        />
        {searchTerm && (
          <div className="absolute right-2.5 flex items-center">
            {isLoading ? (
              <Spinner size="sm" className="text-gray-400" />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => {
                  setSearchTerm('');
                  setShowResults(false);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg overflow-hidden max-h-60 overflow-y-auto border border-gray-200"
        >
          <ul className="divide-y divide-gray-100">
            {results.map((result: SearchResult) => (
              <li
                key={result.id}
                className="p-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleResultClick(result.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${result.packed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {result.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {result.categoryName}
                      {result.bagName && ` • ${result.bagName}`}
                      {result.travelerName && ` • ${result.travelerName}`}
                    </p>
                  </div>
                  <div className={`h-2 w-2 rounded-full ${result.packed ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showResults && debouncedSearchTerm && results.length === 0 && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg p-4 text-center border border-gray-200">
          <p className="text-gray-500">No results found</p>
        </div>
      )}
    </div>
  );
}