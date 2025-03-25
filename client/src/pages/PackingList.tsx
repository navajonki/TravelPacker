import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import PackingListHeader from "@/components/PackingListHeader";
import QuickAddForm from "@/components/QuickAddForm";
import CategoryCard from "@/components/CategoryCard";
import AddCategoryCard from "@/components/AddCategoryCard";
import BagCard from "@/components/BagCard";
import AddBagCard from "@/components/AddBagCard";
import TravelerCard from "@/components/TravelerCard";
import AddTravelerCard from "@/components/AddTravelerCard";
import SelectableItemRow from "@/components/SelectableItemRow";
import AdvancedAddItemModal from "@/components/modals/AdvancedAddItemModal";
import AddCategoryModal from "@/components/modals/AddCategoryModal";
import AddBagModal from "@/components/modals/AddBagModal";
import AddTravelerModal from "@/components/modals/AddTravelerModal";
import CreateListModal from "@/components/modals/CreateListModal";
import BulkEditItemsModal from "@/components/modals/BulkEditItemsModal";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

export default function PackingList() {
  const { id } = useParams<{ id: string }>();
  const packingListId = parseInt(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<'category' | 'bag' | 'traveler'>('category');
  const [advancedAddOpen, setAdvancedAddOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addBagOpen, setAddBagOpen] = useState(false);
  const [addTravelerOpen, setAddTravelerOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  
  // Multi-select edit mode states
  const [isMultiEditMode, setIsMultiEditMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  
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
  
  const handleCreateNewList = async (data: { name: string, theme: string, dateRange?: string }) => {
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
    <div className="flex flex-col h-screen">
      <Header onCreateNewList={() => setCreateListOpen(true)} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateNewList={() => setCreateListOpen(true)} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
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
                name: packingList.name,
                dateRange: packingList.dateRange,
                itemCount: packingList.itemCount,
                progress: packingList.progress
              }}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
            />
          ) : null}
          
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <QuickAddForm 
                packingListId={packingListId}
                onAddItem={handleAddItem}
                onOpenAdvancedAdd={() => setAdvancedAddOpen(true)}
              />
              <div className="flex items-center ml-2">
                {isMultiEditMode ? (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsMultiEditMode(false);
                        setSelectedItemIds([]);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setBulkEditModalOpen(true)}
                      disabled={selectedItemIds.length === 0}
                    >
                      Edit Selected ({selectedItemIds.length})
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsMultiEditMode(true)}
                  >
                    Edit Multiple
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-background p-4">
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
                      </div>
                    ))}
                    <AddCategoryCard onClick={() => setAddCategoryOpen(true)} />
                  </>
                )}

                {viewMode === 'bag' && (
                  <>
                    {bags?.map((bag: any) => (
                      <div key={bag.id}>
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
                      </div>
                    ))}
                    <AddBagCard onClick={() => setAddBagOpen(true)} />
                  </>
                )}

                {viewMode === 'traveler' && (
                  <>
                    {travelers?.map((traveler: any) => (
                      <div key={traveler.id}>
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
                      </div>
                    ))}
                    <AddTravelerCard onClick={() => setAddTravelerOpen(true)} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <MobileNav />
      
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
    </div>
  );
}
