import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import Header from "@/components/Header";
import { MultiSelectDropdown } from "@/components/custom/MultiSelectDropdown";

import MobileNav from "@/components/MobileNav";
import PackingListHeader from "@/components/PackingListHeader";
import QuickAddForm from "@/components/QuickAddForm";
import SearchBar from "@/components/SearchBar";
import ActionBar from "@/components/ActionBar";
import CategoryCard from "@/components/CategoryCard";
import AddCategoryCard from "@/components/AddCategoryCard";
import BagCard from "@/components/BagCard";
import AddBagCard from "@/components/AddBagCard";
import TravelerCard from "@/components/TravelerCard";
import AddTravelerCard from "@/components/AddTravelerCard";
import SelectableItemRow from "@/components/SelectableItemRow";
import ItemRow from "@/components/ItemRow";
import AdvancedAddItemModal from "@/components/modals/AdvancedAddItemModal";
import AddCategoryModal from "@/components/modals/AddCategoryModal";
import EditCategoryModal from "@/components/modals/EditCategoryModal";
import AddBagModal from "@/components/modals/AddBagModal";
import EditBagModal from "@/components/modals/EditBagModal";
import AddTravelerModal from "@/components/modals/AddTravelerModal";
import EditTravelerModal from "@/components/modals/EditTravelerModal";
import EditItemModal from "@/components/modals/EditItemModal";
import CreateListModal from "@/components/modals/CreateListModal";
import BulkEditItemsModal from "@/components/modals/BulkEditItemsModal";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator, 
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Loader2, CheckCircle, ChevronDown } from "lucide-react";

export default function PackingList() {
  const { id } = useParams<{ id: string }>();
  const packingListId = parseInt(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<'category' | 'bag' | 'traveler' | 'filters'>('category');
  const [advancedAddOpen, setAdvancedAddOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addBagOpen, setAddBagOpen] = useState(false);
  const [addTravelerOpen, setAddTravelerOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  
  // Edit modals
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editBagOpen, setEditBagOpen] = useState(false);
  const [editTravelerOpen, setEditTravelerOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(null);
  const [currentBagId, setCurrentBagId] = useState<number | null>(null);
  const [currentTravelerId, setCurrentTravelerId] = useState<number | null>(null);
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  
  // Multi-select edit mode states
  const [isMultiEditMode, setIsMultiEditMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedBags, setSelectedBags] = useState<number[]>([]);
  const [selectedTravelers, setSelectedTravelers] = useState<number[]>([]);
  const [showPacked, setShowPacked] = useState<boolean>(true);
  const [showUnpacked, setShowUnpacked] = useState<boolean>(true);
  
  // Common handler for item selection
  const handleItemSelection = useCallback((itemId: number, isSelected: boolean) => {
    if (isSelected) {
      setSelectedItemIds((prev) => [...prev, itemId]);
    } else {
      setSelectedItemIds((prev) => prev.filter(id => id !== itemId));
    }
  }, []);
  
  // Define interfaces for type safety
  interface PackingListData {
    id: number;
    name: string;
    theme: string;
    dateRange?: string;
    userId: number;
    createdAt: string;
    itemCount: number;
    progress: number;
  }
  
  interface CategoryData {
    id: number;
    name: string;
    packingListId: number;
    position: number;
    createdAt: string;
    items: any[];
    totalItems: number;
    packedItems: number;
  }
  
  interface BagData {
    id: number;
    name: string;
    packingListId: number;
    createdAt: string;
    items: any[];
    totalItems: number;
    packedItems: number;
  }
  
  interface TravelerData {
    id: number;
    name: string;
    packingListId: number;
    createdAt: string;
    items: any[];
    totalItems: number;
    packedItems: number;
  }
  
  const { data: packingList, isLoading: isLoadingList } = useQuery<PackingListData>({
    queryKey: [`/api/packing-lists/${packingListId}`],
  });
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery<CategoryData[]>({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
  });
  
  const { data: bags, isLoading: isLoadingBags } = useQuery<BagData[]>({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
  });
  
  const { data: travelers, isLoading: isLoadingTravelers } = useQuery<TravelerData[]>({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
  });
  
  const addItemMutation = useMutation({
    mutationFn: async (item: any) => {
      return await apiRequest('POST', '/api/items', item);
    },
    onSuccess: (data, variables) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      
      // If item was assigned to a bag, invalidate bags query
      if (variables.bagId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      }
      
      // If item was assigned to a traveler, invalidate travelers query
      if (variables.travelerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      }
      
      toast({
        title: "Success",
        description: "Item added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  });
  
  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      // Get the last position to place new category at the end
      const position = categories?.length || 0;
      
      return await apiRequest('POST', '/api/categories', {
        name,
        position,
        packingListId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      toast({
        title: "Success",
        description: "Category added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    }
  });
  
  const createPackingListMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/packing-lists', {
        ...data,
        userId: 1 // Using the default user ID
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists?userId=1'] });
      toast({
        title: "Success",
        description: "Packing list created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create packing list",
        variant: "destructive",
      });
    }
  });
  
  const handleAddItem = async (item: any) => {
    await addItemMutation.mutate(item);
  };
  
  const addBagMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest('POST', '/api/bags', {
        name,
        packingListId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      toast({
        title: "Success",
        description: "Bag added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add bag",
        variant: "destructive",
      });
    }
  });

  const addTravelerMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest('POST', '/api/travelers', {
        name,
        packingListId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      toast({
        title: "Success",
        description: "Traveler added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add traveler",
        variant: "destructive",
      });
    }
  });

  const handleAddCategory = async (name: string) => {
    await addCategoryMutation.mutate(name);
  };

  const handleAddBag = async (name: string) => {
    await addBagMutation.mutate(name);
  };

  const handleAddTraveler = async (name: string) => {
    await addTravelerMutation.mutate(name);
  };
  
  // Handle the edit functions
  const handleEditCategory = (categoryId: number) => {
    console.log('Edit Category:', categoryId);
    setCurrentCategoryId(categoryId);
    setEditCategoryOpen(true);
  };
  
  const handleEditBag = (bagId: number) => {
    console.log('Edit Bag:', bagId);
    setCurrentBagId(bagId);
    setEditBagOpen(true);
  };
  
  const handleEditTraveler = (travelerId: number) => {
    console.log('Edit Traveler:', travelerId);
    setCurrentTravelerId(travelerId);
    setEditTravelerOpen(true);
  };
  
  // Handle edit item function with enhanced logging and state management
  const handleEditItem = (itemId: number) => {
    // More verbose logging to debug the issue
    console.log('Edit Item called with ID:', itemId);
    console.log('Current state - editItemOpen:', editItemOpen, 'currentItemId:', currentItemId);
    
    // First set the item ID
    setCurrentItemId(itemId);
    
    // Then open the modal with a small delay to ensure state is updated
    setTimeout(() => {
      console.log('Opening edit modal for item:', itemId);
      setEditItemOpen(true);
    }, 50);
  };
  
  // Function to export packing list as CSV
  const handleExportList = () => {
    // Display loading toast
    toast({
      title: "Exporting Data",
      description: "Preparing your CSV download...",
    });
    
    // Create the export URL and trigger the download
    window.location.href = `/api/packing-lists/${packingListId}/export`;
    
    // Show success toast after a brief delay
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: "Your packing list has been exported as CSV",
      });
    }, 1000);
  };
  
  const handleCreateNewList = async (data: { name: string, theme?: string, dateRange?: string }) => {
    await createPackingListMutation.mutate({
      ...data,
      userId: 1 // Using the default user ID
    });
  };

  const handleDeleteCategory = async (categoryId: number) => {
    try {
      await apiRequest('DELETE', `/api/categories/${categoryId}`);
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBag = async (bagId: number) => {
    try {
      await apiRequest('DELETE', `/api/bags/${bagId}`);
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      toast({
        title: "Success",
        description: "Bag deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bag",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTraveler = async (travelerId: number) => {
    try {
      await apiRequest('DELETE', `/api/travelers/${travelerId}`);
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      toast({
        title: "Success",
        description: "Traveler deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete traveler",
        variant: "destructive",
      });
    }
  };

  const isLoading = isLoadingList || isLoadingCategories || isLoadingBags || isLoadingTravelers;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex flex-1 flex-col">
        
        <div className="flex-1 flex flex-col">
          {isLoadingList ? (
            <div className="bg-white p-4 border-b border-gray-200">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48 mb-4" />
              <Skeleton className="h-2 w-full mb-2" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ) : packingList ? (
            <PackingListHeader 
              packingList={{
                id: packingList.id,
                name: packingList.name,
                dateRange: packingList.dateRange,
                itemCount: packingList.itemCount,
                progress: packingList.progress
              }}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              onExport={handleExportList}
            />
          ) : null}
          
          <ActionBar 
            packingListId={packingListId}
            isMultiEditMode={isMultiEditMode}
            selectedItemIds={selectedItemIds}
            onOpenAdvancedAdd={() => setAdvancedAddOpen(true)}
            onAddItem={handleAddItem}
            onToggleMultiEditMode={(enabled) => {
              setIsMultiEditMode(enabled);
              if (!enabled) {
                setSelectedItemIds([]);
              }
            }}
            onOpenBulkEdit={() => setBulkEditModalOpen(true)}
            onExportList={handleExportList}
          />
          
          {/* Search bar */}
          <div className="px-4 py-2 bg-white border-b border-gray-200">
            <SearchBar 
              packingListId={packingListId}
              onSelectResult={handleEditItem}
              className="max-w-md mx-auto"
            />
          </div>
          
          <div className="bg-background p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                    <div className="p-2">
                      <Skeleton className="h-12 w-full mb-2" />
                      <Skeleton className="h-12 w-full mb-2" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {viewMode === 'category' && (
                  <>
                    {categories?.map((category: any) => (
                      <div key={category.id}>
                        {isMultiEditMode ? (
                          <div className="bg-white rounded-lg shadow">
                            <div className="p-4 border-b border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <h3 className="font-medium">{category.name}</h3>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm text-gray-500">{category.packedItems}/{category.totalItems}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="divide-y divide-gray-100">
                              {category.items.map((item: any) => (
                                <SelectableItemRow
                                  key={item.id}
                                  item={item}
                                  packingListId={packingListId}
                                  isMultiEditMode={isMultiEditMode}
                                  isSelected={selectedItemIds.includes(item.id)}
                                  onSelectChange={handleItemSelection}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <CategoryCard 
                            category={category}
                            onEditCategory={handleEditCategory}
                            onDeleteCategory={handleDeleteCategory}
                            onAddItem={() => {
                              setAdvancedAddOpen(true);
                            }}
                            onEditItem={handleEditItem}
                          />
                        )}
                      </div>
                    ))}
                    <AddCategoryCard onClick={() => setAddCategoryOpen(true)} />
                  </>
                )}

                {viewMode === 'bag' && (
                  <>
                    {bags?.map((bag: any) => (
                      <div key={bag.id}>
                        {isMultiEditMode ? (
                          <div className="bg-white rounded-lg shadow">
                            <div className="p-4 border-b border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <h3 className="font-medium">{bag.name}</h3>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm text-gray-500">{bag.packedItems}/{bag.totalItems}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="divide-y divide-gray-100">
                              {bag.items.map((item: any) => (
                                <SelectableItemRow
                                  key={item.id}
                                  item={item}
                                  packingListId={packingListId}
                                  isMultiEditMode={isMultiEditMode}
                                  isSelected={selectedItemIds.includes(item.id)}
                                  onSelectChange={(itemId, isSelected) => {
                                    if (isSelected) {
                                      setSelectedItemIds([...selectedItemIds, itemId]);
                                    } else {
                                      setSelectedItemIds(selectedItemIds.filter(id => id !== itemId));
                                    }
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <BagCard 
                            bag={bag}
                            onEditBag={handleEditBag}
                            onDeleteBag={handleDeleteBag}
                            onAddItem={() => {
                              setAdvancedAddOpen(true);
                            }}
                            onEditItem={handleEditItem}
                          />
                        )}
                      </div>
                    ))}
                    <AddBagCard onClick={() => setAddBagOpen(true)} />
                  </>
                )}

                {viewMode === 'traveler' && (
                  <>
                    {travelers?.map((traveler: any) => (
                      <div key={traveler.id}>
                        {isMultiEditMode ? (
                          <div className="bg-white rounded-lg shadow">
                            <div className="p-4 border-b border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <h3 className="font-medium">{traveler.name}</h3>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm text-gray-500">{traveler.packedItems}/{traveler.totalItems}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="divide-y divide-gray-100">
                              {traveler.items.map((item: any) => (
                                <SelectableItemRow
                                  key={item.id}
                                  item={item}
                                  packingListId={packingListId}
                                  isMultiEditMode={isMultiEditMode}
                                  isSelected={selectedItemIds.includes(item.id)}
                                  onSelectChange={(itemId, isSelected) => {
                                    if (isSelected) {
                                      setSelectedItemIds([...selectedItemIds, itemId]);
                                    } else {
                                      setSelectedItemIds(selectedItemIds.filter(id => id !== itemId));
                                    }
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <TravelerCard 
                            traveler={traveler}
                            onEditTraveler={handleEditTraveler}
                            onDeleteTraveler={handleDeleteTraveler}
                            onAddItem={() => {
                              setAdvancedAddOpen(true);
                            }}
                            onEditItem={handleEditItem}
                          />
                        )}
                      </div>
                    ))}
                    <AddTravelerCard onClick={() => setAddTravelerOpen(true)} />
                  </>
                )}

                {viewMode === 'filters' && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-3">
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                      <h3 className="text-lg font-medium mb-4">Filters</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Categories</h4>
                          <MultiSelectDropdown
                            title="Categories"
                            items={categories?.map(cat => ({ 
                              id: cat.id, 
                              name: cat.name, 
                              count: cat.totalItems 
                            })) || []}
                            selectedIds={selectedCategories}
                            onSelectionChange={setSelectedCategories}
                          />
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Bags</h4>
                          <MultiSelectDropdown
                            title="Bags"
                            items={bags?.map(bag => ({ 
                              id: bag.id, 
                              name: bag.name, 
                              count: bag.totalItems 
                            })) || []}
                            selectedIds={selectedBags}
                            onSelectionChange={setSelectedBags}
                          />
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Travelers</h4>
                          <MultiSelectDropdown
                            title="Travelers"
                            items={travelers?.map(traveler => ({ 
                              id: traveler.id, 
                              name: traveler.name, 
                              count: traveler.totalItems 
                            })) || []}
                            selectedIds={selectedTravelers}
                            onSelectionChange={setSelectedTravelers}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col space-y-4 my-6">
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="show-packed"
                            checked={showPacked}
                            onCheckedChange={setShowPacked}
                          />
                          <Label htmlFor="show-packed" className="text-sm">
                            Show Packed Items
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="show-unpacked"
                            checked={showUnpacked}
                            onCheckedChange={setShowUnpacked}
                          />
                          <Label htmlFor="show-unpacked" className="text-sm">
                            Show Unpacked Items
                          </Label>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCategories([]);
                            setSelectedBags([]);
                            setSelectedTravelers([]);
                            setShowPacked(true);
                            setShowUnpacked(true);
                          }}
                        >
                          Reset Filters
                        </Button>
                      </div>
                    </div>

                    {/* Filtered Items */}
                    <div className="bg-white rounded-lg shadow">
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="font-medium">Filtered Items</h3>
                        <p className="text-sm text-gray-500 mt-1">Showing items matching your selected filters</p>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {/* Filter and display items */}
                        {(() => {
                          // Collect all items from all categories
                          const allItems = categories?.flatMap(category => category.items) || [];
                          
                          // Apply filters
                          const filteredItems = allItems.filter(item => {
                            // Skip if packed status doesn't match filters
                            if (item.packed && !showPacked) return false;
                            if (!item.packed && !showUnpacked) return false;
                            
                            // Always show if no specific filters are selected
                            if (selectedCategories.length === 0 && 
                                selectedBags.length === 0 && 
                                selectedTravelers.length === 0) {
                              return true;
                            }
                            
                            // Check category filter
                            const categoryMatch = selectedCategories.length === 0 || 
                                                selectedCategories.includes(item.categoryId);
                            
                            // Check bag filter
                            const bagMatch = selectedBags.length === 0 || 
                                          (item.bagId && selectedBags.includes(item.bagId));
                            
                            // Check traveler filter
                            const travelerMatch = selectedTravelers.length === 0 || 
                                               (item.travelerId && selectedTravelers.includes(item.travelerId));
                            
                            return categoryMatch && bagMatch && travelerMatch;
                          });
                          
                          // Render filtered items
                          return filteredItems.map(item => (
                            <ItemRow 
                              key={item.id} 
                              item={item} 
                              packingListId={packingListId} 
                              onEditItem={handleEditItem} 
                            />
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <AdvancedAddItemModal
        open={advancedAddOpen}
        onClose={() => setAdvancedAddOpen(false)}
        packingListId={packingListId}
        onAddItem={handleAddItem}
      />
      
      <AddCategoryModal
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
        onAddCategory={handleAddCategory}
      />
      
      <CreateListModal
        open={createListOpen}
        onClose={() => setCreateListOpen(false)}
        onCreateList={handleCreateNewList}
      />

      <AddBagModal
        open={addBagOpen}
        onClose={() => setAddBagOpen(false)}
        onAddBag={handleAddBag}
      />

      <AddTravelerModal
        open={addTravelerOpen}
        onClose={() => setAddTravelerOpen(false)}
        onAddTraveler={handleAddTraveler}
      />
      
      <BulkEditItemsModal
        open={bulkEditModalOpen}
        onClose={() => {
          setBulkEditModalOpen(false);
          // Don't exit multi-edit mode when closing
        }}
        selectedItemIds={selectedItemIds}
        packingListId={packingListId}
      />
      
      {/* Edit modal components */}
      {currentCategoryId && categories && (
        <EditCategoryModal 
          open={editCategoryOpen}
          onClose={() => {
            setEditCategoryOpen(false);
            setCurrentCategoryId(null);
          }}
          categoryId={currentCategoryId}
          categoryName={categories.find(c => c.id === currentCategoryId)?.name || ""}
          packingListId={packingListId}
        />
      )}
      
      {currentBagId && bags && (
        <EditBagModal 
          open={editBagOpen}
          onClose={() => {
            setEditBagOpen(false);
            setCurrentBagId(null);
          }}
          bagId={currentBagId}
          bagName={bags.find(b => b.id === currentBagId)?.name || ""}
          packingListId={packingListId}
        />
      )}
      
      {currentTravelerId && travelers && (
        <EditTravelerModal 
          open={editTravelerOpen}
          onClose={() => {
            setEditTravelerOpen(false);
            setCurrentTravelerId(null);
          }}
          travelerId={currentTravelerId}
          travelerName={travelers.find(t => t.id === currentTravelerId)?.name || ""}
          packingListId={packingListId}
        />
      )}
      
      {/* Edit Item Modal */}
      {currentItemId && (
        <EditItemModal 
          open={editItemOpen}
          onClose={() => {
            setEditItemOpen(false);
            setCurrentItemId(null);
          }}
          packingListId={packingListId}
          itemId={currentItemId}
        />
      )}
    </div>
  );
}
