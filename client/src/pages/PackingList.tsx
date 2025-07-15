import { useState, useCallback, useMemo, useEffect } from "react";
import { usePackingList } from "@/contexts/PackingListContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams, Link, useLocation } from "wouter";
import Header from "@/components/Header";
import { MultiSelectDropdown } from "@/components/custom/MultiSelectDropdown";
import { Item } from "@shared/schema";
import { useWebSocket } from "@/services/websocket";
import { useAuth } from "@/hooks/use-auth";
import { useRealTimeSync } from "@/hooks/useRealTimeSync";

import MobileNav from "@/components/MobileNav";
import PackingListHeader from "@/components/PackingListHeader";
import { CollaborationView } from "@/features/collaboration";
import QuickAddForm from "@/components/QuickAddForm";
import SearchBar from "@/components/SearchBar";
import ActionBar from "@/components/ActionBar";
import CategoryCard from "@/components/CategoryCard";
import AddCategoryCard from "@/components/AddCategoryCard";
import BagCard from "@/components/BagCard";
import AddBagCard from "@/components/AddBagCard";
import TravelerCard from "@/components/TravelerCard";
import AddTravelerCard from "@/components/AddTravelerCard";
import { UnassignedItemsContainer } from "@/features/items";

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
import EditListModal from "@/components/modals/EditListModal";
import BulkEditItemsModal from "@/components/modals/BulkEditItemsModal";
import ShareModal from "@/components/modals/ShareModal";
import { useToast } from "@/hooks/use-toast";
import { PackingListHeaderSkeleton, CategoryCardSkeleton } from "@/components/skeletons";
import { useLoadingState } from "@/hooks/use-loading-state";
import { Button } from "@/components/ui/button";
import { useBatchedInvalidation, getQueryKeysForOperation } from "@/lib/batchedInvalidation";
import { useFilteredItems, useFilterOptions } from "@/hooks/useFilteredItems";
import { useOptimizedData } from "@/hooks/useOptimizedData";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [, setLocation] = useLocation();
  const { activeList } = usePackingList();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { connect, disconnect, subscribe } = useWebSocket();
  const { user } = useAuth();
  const { batchInvalidate } = useBatchedInvalidation();
  
  const [viewMode, setViewMode] = useState<'category' | 'bag' | 'traveler' | 'filters'>('category');
  const [advancedAddOpen, setAdvancedAddOpen] = useState(false);
  
  // Add item states for UnassignedItemsContainer
  const [showAddItemCategory, setShowAddItemCategory] = useState(false);
  const [showAddItemBag, setShowAddItemBag] = useState(false);
  const [showAddItemTraveler, setShowAddItemTraveler] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  
  // Set up real-time collaboration for instant sync between users
  const { sendUpdate } = useRealTimeSync(packingListId, user);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addBagOpen, setAddBagOpen] = useState(false);
  const [addTravelerOpen, setAddTravelerOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [editListOpen, setEditListOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false);
  
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
  
  // Advanced add modal initial values
  const [advancedAddInitialValues, setAdvancedAddInitialValues] = useState<{
    categoryId?: string;
    bagId?: string;
    travelerId?: string;
  }>({});
  
  // Quick add form state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedBags, setSelectedBags] = useState<number[]>([]);
  const [selectedTravelers, setSelectedTravelers] = useState<number[]>([]);
  const [showPacked, setShowPacked] = useState<boolean>(true);
  const [showUnpacked, setShowUnpacked] = useState<boolean>(true);
  const [groupBy, setGroupBy] = useState<'none' | 'category' | 'bag' | 'traveler'>('none');
  
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

  // Get all items for filter view (includes unassigned items)
  const { data: allItemsForFilter } = useQuery<Item[]>({
    queryKey: [`/api/packing-lists/${packingListId}/all-items`],
  });

  // Use optimized filtering logic
  const { filteredItems, sortedGroups, totalFilteredItems } = useFilteredItems({
    allItems: allItemsForFilter || [],
    categories: categories || [],
    bags: bags || [],
    travelers: travelers || [],
    filters: {
      selectedCategories,
      selectedBags,
      selectedTravelers,
      showPacked,
      showUnpacked,
      groupBy
    }
  });

  // Get optimized filter options
  const { categoryOptions, bagOptions, travelerOptions } = useFilterOptions({
    categories: categories || [],
    bags: bags || [],
    travelers: travelers || [],
    allItems: allItemsForFilter || []
  });
  
  // Use optimized data calculations
  const {
    allItemsFromCategories,
    itemsWithoutBag,
    itemsWithoutTraveler,
    itemsWithoutCategory,
    categoryMap,
    bagMap,
    travelerMap,
    itemCounts,
    categoryStats,
    bagStats,
    travelerStats
  } = useOptimizedData({
    categories: categories || [],
    bags: bags || [],
    travelers: travelers || []
  });
  
  const { send } = useWebSocket();

  const addItemMutation = useMutation({
    mutationFn: async (item: any) => {
      console.log("DEBUG: Original item data:", item);
      console.log("DEBUG: Current packingListId:", packingListId);
      console.log("DEBUG: packingListId type:", typeof packingListId);
      
      // Ensure all required fields are present and valid
      const itemToCreate = {
        ...item,
        packingListId: packingListId, // Force this to be the current packing list ID
        quantity: item.quantity || 1,
        packed: item.packed || false
      };
      
      console.log("DEBUG: Final itemToCreate:", itemToCreate);
      console.log("API Request: POST /api/items", itemToCreate);
      const response = await apiRequest('POST', '/api/items', itemToCreate);
      return response;
    },
    onSuccess: (data, variables) => {
      // Use batched invalidation for better performance
      batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'item'));
      
      // Send real-time update to other collaborators
      try {
        sendUpdate('item_create', data);
      } catch (error) {
        console.error('Failed to send real-time update:', error);
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
      batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'category'));
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
    console.log("handleAddItem called with:", item);
    console.log("handleAddItem packingListId:", packingListId);
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
      batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'bag'));
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
      batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'traveler'));
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
  
  // Handler to open the share/invite dialog
  const handleOpenShareDialog = () => {
    setShareModalOpen(true);
  };

  const handleDeleteList = () => {
    setDeleteListDialogOpen(true);
  };

  const deletePackingListMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/packing-lists/${packingListId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists'] });
      toast({
        title: "Success",
        description: "Packing list deleted successfully",
      });
      setLocation('/');
    },
    onError: (error: unknown) => {
      console.error("Error deleting packing list:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: `Failed to delete packing list: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });
  
  const handleCreateNewList = async (data: { name: string, theme?: string, dateRange?: string }) => {
    await createPackingListMutation.mutate({
      ...data,
      userId: 1 // Using the default user ID
    });
  };

  const handleDeleteCategory = async (categoryId: number) => {
    try {
      await apiRequest('DELETE', `/api/categories/${categoryId}`);
      
      // Use batched invalidation for better performance
      batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'category'));
      
      // Dispatch a custom event to notify components that a container was deleted
      window.dispatchEvent(new CustomEvent('item-container-deleted', {
        detail: { type: 'category', id: categoryId }
      }));
      
      console.log("Batch invalidated queries after category deletion");
      
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
      
      // Use batched invalidation for better performance
      batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'bag'));
      
      // Dispatch a custom event to notify components that a container was deleted
      window.dispatchEvent(new CustomEvent('item-container-deleted', {
        detail: { type: 'bag', id: bagId }
      }));
      
      console.log("Batch invalidated queries after bag deletion");
      
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
      
      // Use batched invalidation for better performance
      batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'traveler'));
      
      // Dispatch a custom event to notify components that a container was deleted
      window.dispatchEvent(new CustomEvent('item-container-deleted', {
        detail: { type: 'traveler', id: travelerId }
      }));
      
      console.log("Batch invalidated queries after traveler deletion");
      
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

  const isLoadingAny = isLoadingList || isLoadingCategories || isLoadingBags || isLoadingTravelers;
  
  const { isLoading } = useLoadingState({
    isLoading: isLoadingAny,
    delay: 200,
    minDuration: 600
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        showPackingListMenu={true}
        onShare={handleOpenShareDialog}
        onExport={handleExportList}
        onEditList={() => setEditListOpen(true)}
        onDeleteList={handleDeleteList}
      />
      
      <div className="flex flex-1 flex-col">
        
        <div className="flex-1 flex flex-col">
          {isLoadingList ? (
            <PackingListHeaderSkeleton />
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
              onShare={handleOpenShareDialog}
              onEditList={() => setEditListOpen(true)}
              onDeleteList={handleDeleteList}
              onSearchResultSelect={handleEditItem}
              onAddItem={() => setShowQuickAdd(!showQuickAdd)}
              onToggleMultiEditMode={() => setIsMultiEditMode(true)}
              showQuickAdd={showQuickAdd}
              quickAddForm={showQuickAdd ? (
                <QuickAddForm 
                  packingListId={packingListId}
                  onAddItem={handleAddItem}
                  onOpenAdvancedAdd={() => setAdvancedAddOpen(true)}
                  isInline={true}
                  onClose={() => setShowQuickAdd(false)}
                />
              ) : null}
            />
          ) : null}
          
          <ActionBar 
            isMultiEditMode={isMultiEditMode}
            selectedItemIds={selectedItemIds}
            onToggleMultiEditMode={(enabled) => {
              setIsMultiEditMode(enabled);
              if (!enabled) {
                setSelectedItemIds([]);
              }
            }}
            onOpenBulkEdit={() => setBulkEditModalOpen(true)}
          />
          
          <div className="bg-background p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <CategoryCardSkeleton key={i} />
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
                                  onEditItem={handleEditItem}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <CategoryCard 
                            category={category}
                            onEditCategory={handleEditCategory}
                            onDeleteCategory={handleDeleteCategory}
                            onEditItem={handleEditItem}
                          />
                        )}
                      </div>
                    ))}
                    {/* Use the same component style as other views */}
                    <UnassignedItemsContainer
                      key="unassigned-category"
                      packingListId={packingListId}
                      onEditItem={handleEditItem}
                      viewContext="category"
                      onAddItem={() => {
                        setAdvancedAddInitialValues({});
                        setAdvancedAddOpen(true);
                      }}
                      isMultiEditMode={isMultiEditMode}
                      selectedItemIds={selectedItemIds}
                      onSelectChange={handleItemSelection}
                      showAddItem={showAddItemCategory}
                      setShowAddItem={setShowAddItemCategory}
                      newItemName={newItemName}
                      setNewItemName={setNewItemName}
                    />
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
                                  onEditItem={handleEditItem}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <BagCard 
                            bag={bag}
                            onEditBag={handleEditBag}
                            onDeleteBag={handleDeleteBag}
                            onAddItem={(bagId) => {
                              setAdvancedAddInitialValues({ bagId: bagId.toString() });
                              setAdvancedAddOpen(true);
                            }}
                            onEditItem={handleEditItem}
                          />
                        )}
                      </div>
                    ))}
                    {/* Unassigned Items Card for Bag View */}
                    {/* Use only one component for unassigned bag items */}
                    <UnassignedItemsContainer
                      key="unassigned-bag"
                      packingListId={packingListId}
                      onEditItem={handleEditItem}
                      viewContext="bag"
                      onAddItem={() => {
                        setAdvancedAddInitialValues({});
                        setAdvancedAddOpen(true);
                      }}
                      isMultiEditMode={isMultiEditMode}
                      selectedItemIds={selectedItemIds}
                      onSelectChange={handleItemSelection}
                      showAddItem={showAddItemBag}
                      setShowAddItem={setShowAddItemBag}
                      newItemName={newItemName}
                      setNewItemName={setNewItemName}
                    />
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
                                  onEditItem={handleEditItem}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <TravelerCard 
                            traveler={traveler}
                            onEditTraveler={handleEditTraveler}
                            onDeleteTraveler={handleDeleteTraveler}
                            onAddItem={(travelerId) => {
                              setAdvancedAddInitialValues({ travelerId: travelerId.toString() });
                              setAdvancedAddOpen(true);
                            }}
                            onEditItem={handleEditItem}
                          />
                        )}
                      </div>
                    ))}
                    {/* Unassigned Items Card for Traveler View */}
                    {/* Use only one component for unassigned traveler items */}
                    <UnassignedItemsContainer
                      key="unassigned-traveler"
                      packingListId={packingListId}
                      onEditItem={handleEditItem}
                      viewContext="traveler"
                      onAddItem={() => {
                        setAdvancedAddInitialValues({});
                        setAdvancedAddOpen(true);
                      }}
                      isMultiEditMode={isMultiEditMode}
                      selectedItemIds={selectedItemIds}
                      onSelectChange={handleItemSelection}
                      showAddItem={showAddItemTraveler}
                      setShowAddItem={setShowAddItemTraveler}
                      newItemName={newItemName}
                      setNewItemName={setNewItemName}
                    />
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
                            items={categoryOptions}
                            selectedIds={selectedCategories}
                            onSelectionChange={setSelectedCategories}
                          />
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Bags</h4>
                          <MultiSelectDropdown
                            title="Bags"
                            items={bagOptions}
                            selectedIds={selectedBags}
                            onSelectionChange={setSelectedBags}
                          />
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Travelers</h4>
                          <MultiSelectDropdown
                            title="Travelers"
                            items={travelerOptions}
                            selectedIds={selectedTravelers}
                            onSelectionChange={setSelectedTravelers}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col space-y-4 my-6">
                        <div>
                          <Label htmlFor="group-by" className="text-sm font-medium mb-2 block">
                            Group By
                          </Label>
                          <Select value={groupBy} onValueChange={(value: 'none' | 'category' | 'bag' | 'traveler') => setGroupBy(value)}>
                            <SelectTrigger id="group-by" className="w-full">
                              <SelectValue placeholder="Select grouping" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Grouping</SelectItem>
                              <SelectItem value="category">Category</SelectItem>
                              <SelectItem value="bag">Bag</SelectItem>
                              <SelectItem value="traveler">Traveler</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
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
                        {/* Optimized filtered items rendering */}
                        {groupBy !== 'none' && sortedGroups ? (
                          // Render grouped items
                          sortedGroups.map(([groupId, group]) => (
                            <div key={groupId} className="mb-6">
                              <h4 className="font-medium text-sm text-gray-700 px-4 py-2 bg-gray-50 border-b">
                                {group.groupName} ({group.items.length} items)
                              </h4>
                              <div className="divide-y divide-gray-100">
                                {group.items.map(item => {
                                  if (isMultiEditMode) {
                                    return (
                                      <SelectableItemRow
                                        key={item.id}
                                        item={item}
                                        packingListId={packingListId}
                                        isMultiEditMode={isMultiEditMode}
                                        onEditItem={handleEditItem}
                                        isSelected={selectedItemIds.includes(item.id)}
                                        onSelectChange={(itemId, isSelected) => handleItemSelection(itemId, isSelected)}
                                      />
                                    );
                                  } else {
                                    return (
                                      <ItemRow 
                                        key={item.id} 
                                        item={item} 
                                        packingListId={packingListId} 
                                        onEditItem={handleEditItem} 
                                      />
                                    );
                                  }
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          // Render flat list
                          filteredItems.map(item => {
                            if (isMultiEditMode) {
                              return (
                                <SelectableItemRow
                                  key={item.id}
                                  item={item}
                                  packingListId={packingListId}
                                  isMultiEditMode={isMultiEditMode}
                                  onEditItem={handleEditItem}
                                  isSelected={selectedItemIds.includes(item.id)}
                                  onSelectChange={(itemId, isSelected) => handleItemSelection(itemId, isSelected)}
                                />
                              );
                            } else {
                              return (
                                <ItemRow 
                                  key={item.id} 
                                  item={item} 
                                  packingListId={packingListId} 
                                  onEditItem={handleEditItem} 
                                />
                              );
                            }
                          })
                        )}
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
        onClose={() => {
          setAdvancedAddOpen(false);
          setAdvancedAddInitialValues({});
        }}
        packingListId={packingListId}
        onAddItem={handleAddItem}
        initialValues={advancedAddInitialValues}
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
        onClearSelection={() => setSelectedItemIds([])}
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
      
      {/* Share Modal */}
      <ShareModal
        packingListId={packingListId}
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
      
      {/* Edit List Modal */}
      {packingList && (
        <EditListModal
          open={editListOpen}
          onClose={() => setEditListOpen(false)}
          packingList={{
            id: packingList.id,
            name: packingList.name,
            theme: packingList.theme,
            dateRange: packingList.dateRange,
          }}
        />
      )}
      
      {/* Delete List Confirmation Dialog */}
      <AlertDialog open={deleteListDialogOpen} onOpenChange={setDeleteListDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Packing List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this packing list? This action cannot be undone and will permanently delete all items, categories, bags, and travelers associated with this list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                deletePackingListMutation.mutate();
                setDeleteListDialogOpen(false);
              }}
              className="bg-red-500 hover:bg-red-600"
              disabled={deletePackingListMutation.isPending}
            >
              {deletePackingListMutation.isPending ? "Deleting..." : "Delete List"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
