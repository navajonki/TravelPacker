import { Calendar, Share2, Download, MoreHorizontal, Users } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SearchBar from "@/components/SearchBar";

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
}

export default function PackingListHeader({ 
  packingList, 
  viewMode,
  onChangeViewMode,
  onExport,
  onShare,
  onEditList,
  onDeleteList,
  onSearchResultSelect
}: PackingListHeaderProps) {
  return (
    <div className="bg-white p-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{packingList.name}</h1>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{packingList.dateRange || 'No date set'}</span>
            <span className="mx-2">•</span>
            <span>{packingList.itemCount} items</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="md:hidden" onSelect={onShare}>
                <Share2 className="h-4 w-4 mr-2" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="md:hidden" onSelect={onExport}>
                <Download className="h-4 w-4 mr-2" />
                <span>Export</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEditList}>
                <span>Edit List</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDeleteList}>
                <span>Delete List</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="mt-4">
        <Progress value={packingList.progress} className="h-2.5" />
        <div className="flex items-center justify-between mt-1 text-sm">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium">{packingList.progress}% packed</span>
        </div>
      </div>
      
      {/* Search bar */}
      <div className="mt-4">
        <SearchBar 
          packingListId={packingList.id}
          onSelectResult={onSearchResultSelect || (() => {})}
          className="max-w-md mx-auto"
        />
      </div>
      
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
