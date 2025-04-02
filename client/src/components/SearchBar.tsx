import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useSyncStatus } from '@/hooks/use-sync-status';

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

  // Define the search function to be reusable
  const searchItems = useCallback(async () => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/packing-lists/${packingListId}/search?query=${encodeURIComponent(debouncedSearchTerm)}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setResults(data);
        setShowResults(true);
      } else {
        console.error('Invalid search results format:', data);
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching items:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, packingListId]);

  // Initial search and when search term changes
  useEffect(() => {
    searchItems();
  }, [searchItems]);
  
  // Refresh search results when items are updated anywhere in the app
  useEffect(() => {
    // When isPending changes from true to false, it means changes have been saved
    // and we should refresh the search results
    if (!isPending && debouncedSearchTerm.length >= 2 && showResults) {
      searchItems();
    }
  }, [isPending, searchItems, debouncedSearchTerm.length, showResults]);

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
    setSearchTerm('');
    setShowResults(false);
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