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
import AdvancedAddItemModal from "@/components/modals/AdvancedAddItemModal";
import AddCategoryModal from "@/components/modals/AddCategoryModal";
import AddBagModal from "@/components/modals/AddBagModal";
import AddTravelerModal from "@/components/modals/AddTravelerModal";
import CreateListModal from "@/components/modals/CreateListModal";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function PackingList() {
  const { id } = useParams<{ id: string }>();
  const packingListId = parseInt(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<'category' | 'bag' | 'traveler'>('category');
  const [advancedAddOpen, setAdvancedAddOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  
  const { data: packingList, isLoading: isLoadingList } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}`],
  });
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
  });
  
  const { data: bags, isLoading: isLoadingBags } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
  });
  
  const { data: travelers, isLoading: isLoadingTravelers } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
  });
  
  const addItemMutation = useMutation({
    mutationFn: async (item: any) => {
      return await apiRequest('POST', '/api/items', item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
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
  
  const handleAddCategory = async (name: string) => {
    await addCategoryMutation.mutate(name);
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
          ) : (
            <PackingListHeader 
              packingList={packingList}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
            />
          )}
          
          <QuickAddForm 
            packingListId={packingListId}
            onAddItem={handleAddItem}
            onOpenAdvancedAdd={() => setAdvancedAddOpen(true)}
          />
          
          <div className="flex-1 overflow-y-auto bg-background p-4">
            {isLoadingCategories ? (
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
                {categories?.map((category: any) => (
                  <CategoryCard 
                    key={category.id}
                    category={category}
                    onEditCategory={() => {}}
                    onDeleteCategory={handleDeleteCategory}
                    onAddItem={() => {
                      setAdvancedAddOpen(true);
                    }}
                  />
                ))}
                
                <AddCategoryCard onClick={() => setAddCategoryOpen(true)} />
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
    </div>
  );
}
