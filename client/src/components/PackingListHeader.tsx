import { Share2, Download, Plus, Edit3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SearchBar from "@/components/SearchBar";
import { ConnectionStatus } from "@/components/ConnectionStatus";

interface PackingListHeaderProps {
  packingList: {
    id: number;
    name: string;
    dateRange?: string;
    itemCount: number;
    progress: number;
  };
  viewMode: 'category' | 'bag' | 'traveler' | 'filters';
  onChangeViewMode: (mode: 'category' | 'bag' | 'traveler' | 'filters') => void;
  onExport?: () => void;
  onShare?: () => void;
  onEditList?: () => void;
  onDeleteList?: () => void;
  onSearchResultSelect?: (itemId: number) => void;
  onAddItem?: () => void;
  onToggleMultiEditMode?: () => void;
  showQuickAdd?: boolean;
  quickAddForm?: React.ReactNode;
  connectionStatus?: {
    isOnline: boolean;
    lastSuccessfulFetch?: Date | null;
    dataAge?: number | null;
    isDataStale?: boolean;
  };
}

export default function PackingListHeader({ 
  packingList, 
  viewMode,
  onChangeViewMode,
  onExport,
  onShare,
  onEditList,
  onDeleteList,
  onSearchResultSelect,
  onAddItem,
  onToggleMultiEditMode,
  showQuickAdd,
  quickAddForm,
  connectionStatus
}: PackingListHeaderProps) {
  return (
    <div className="bg-white p-4 border-b border-gray-200">
      {/* Title and Progress Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{packingList.name}</h1>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <span>{packingList.itemCount} items</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Connection Status */}
          {connectionStatus && (
            <ConnectionStatus
              isOnline={connectionStatus.isOnline}
              lastSuccessfulFetch={connectionStatus.lastSuccessfulFetch}
              dataAge={connectionStatus.dataAge}
              isDataStale={connectionStatus.isDataStale}
            />
          )}
          
          {/* Progress bar on the right side */}
          <div className="text-right">
            <Progress value={packingList.progress} className="h-2.5 w-48" />
            <div className="flex items-center justify-between mt-1 text-sm">
              <span className="text-gray-500">Progress</span>
              <span className="font-medium">{packingList.progress}% packed</span>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="hidden md:flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
              onClick={onShare}
            >
              <Share2 className="h-4 w-4 mr-1" />
              <span>Share</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
              onClick={onExport}
            >
              <Download className="h-4 w-4 mr-1" />
              <span>Export</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Action buttons and Search bar */}
      <div className="mt-4 flex items-center space-x-4">
        {/* Add Item and Edit Multiple buttons */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={onAddItem}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 shadow-md"
            size="default"
          >
            <Plus className="h-5 w-5" />
            <span>Add Item</span>
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={onToggleMultiEditMode}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            <span>Edit Multiple</span>
          </Button>
        </div>
        
        {/* Search bar */}
        <div className="flex-1">
          <SearchBar 
            packingListId={packingList.id}
            onSelectResult={onSearchResultSelect || (() => {})}
            className="max-w-md"
          />
        </div>
      </div>
      
      {/* Quick Add Form */}
      {showQuickAdd && quickAddForm && (
        <div className="mt-4 border border-gray-200 rounded-lg bg-gray-50 p-4">
          {quickAddForm}
        </div>
      )}
      
      {/* Tabs at the bottom */}
      <Tabs value={viewMode} className="mt-4" onValueChange={(value) => onChangeViewMode(value as any)}>
        <TabsList className="w-full flex border-b border-gray-200 [&>*]:flex-1 [&>*]:rounded-none [&>*]:border-b-2 [&>*]:border-transparent">
          <TabsTrigger value="category" className="py-2 data-[state=active]:text-primary data-[state=active]:border-primary">
            By Category
          </TabsTrigger>
          <TabsTrigger value="bag" className="py-2 data-[state=active]:text-primary data-[state=active]:border-primary">
            By Bag
          </TabsTrigger>
          <TabsTrigger value="traveler" className="py-2 data-[state=active]:text-primary data-[state=active]:border-primary">
            By Traveler
          </TabsTrigger>
          <TabsTrigger value="filters" className="py-2 data-[state=active]:text-primary data-[state=active]:border-primary">
            Filters
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
