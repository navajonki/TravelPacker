import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

interface EditItemModalProps {
  open: boolean;
  onClose: () => void;
  packingListId: number;
  itemId: number;
}

export default function EditItemModal({
  open,
  onClose,
  packingListId,
  itemId,
}: EditItemModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    name: "",
    packed: false,
    categoryId: null as number | null,
    bagId: null as number | null,
    travelerId: null as number | null,
    quantity: 1,
    weight: null as number | null,
    notes: ""
  });
  
  const { data: item, isLoading: isLoadingItem } = useQuery({
    queryKey: [`/api/items/${itemId}`],
    enabled: open && itemId > 0,
  });
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: open,
  });
  
  const { data: bags, isLoading: isLoadingBags } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: open,
  });
  
  const { data: travelers, isLoading: isLoadingTravelers } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: open,
  });
  
  // Update form when item data is loaded
  useEffect(() => {
    if (item) {
      const itemData = item as any;
      setForm({
        name: itemData.name || "",
        packed: itemData.packed || false,
        categoryId: itemData.categoryId !== undefined ? itemData.categoryId : null,
        bagId: itemData.bagId || null,
        travelerId: itemData.travelerId || null,
        quantity: itemData.quantity || 1,
        weight: itemData.weight || null,
        notes: itemData.notes || ""
      });
    }
  }, [item]);
  
  const isLoading = isLoadingItem || isLoadingCategories || isLoadingBags || isLoadingTravelers;
  
  const updateItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PATCH', `/api/items/${itemId}`, data);
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      
      // Auto-close the modal after success with a short delay
      setTimeout(() => {
        onClose();
      }, 500);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  });
  
  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/items/${itemId}`);
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      
      // Auto-close the modal after success with a short delay
      setTimeout(() => {
        onClose();
      }, 500);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  });
  
  const handleSave = () => {
    updateItemMutation.mutate(form);
  };
  
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteItemMutation.mutate();
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSelectChange = (name: string, value: string | null) => {
    setForm({
      ...form,
      [name]: value === "none" ? null : value === null ? null : parseInt(value)
    });
  };
  
  console.log('EditItemModal rendering:', { open, itemId });

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full flex-col border-l bg-background shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md lg:w-1/4">
          <div className="p-6 overflow-y-auto flex-1">
            <Dialog.Title className="text-lg font-semibold mb-4">Edit Item</Dialog.Title>
            
            <div className="space-y-4 pr-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-60">
                  <Spinner size="lg" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      placeholder="Item name"
                    />
                  </div>
                
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category (Optional)</Label>
                    <Select
                      value={form.categoryId ? form.categoryId.toString() : "none"}
                      onValueChange={(value) => handleSelectChange("categoryId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {Array.isArray(categories) && categories.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bagId">Bag (Optional)</Label>
                    <Select
                      value={form.bagId ? form.bagId.toString() : "none"}
                      onValueChange={(value) => handleSelectChange("bagId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No bag</SelectItem>
                        {Array.isArray(bags) && bags.map((bag: any) => (
                          <SelectItem key={bag.id} value={bag.id.toString()}>
                            {bag.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="travelerId">Traveler (Optional)</Label>
                    <Select
                      value={form.travelerId ? form.travelerId.toString() : "none"}
                      onValueChange={(value) => handleSelectChange("travelerId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select traveler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No traveler</SelectItem>
                        {Array.isArray(travelers) && travelers.map((traveler: any) => (
                          <SelectItem key={traveler.id} value={traveler.id.toString()}>
                            {traveler.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      name="notes"
                      value={form.notes || ""}
                      onChange={handleInputChange}
                      placeholder="Add notes"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="packed"
                      name="packed"
                      checked={form.packed}
                      onCheckedChange={(checked) => setForm({...form, packed: !!checked})}
                    />
                    <Label htmlFor="packed" className="cursor-pointer">
                      Item is packed
                    </Label>
                  </div>
                  
                  <div className="flex justify-between pt-6">
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete}
                      disabled={updateItemMutation.isPending || deleteItemMutation.isPending}
                    >
                      {deleteItemMutation.isPending ? <Spinner className="mr-2" size="sm" /> : null}
                      Delete
                    </Button>
                    <Button 
                      variant="default" 
                      onClick={handleSave}
                      disabled={updateItemMutation.isPending || deleteItemMutation.isPending}
                    >
                      {updateItemMutation.isPending ? <Spinner className="mr-2" size="sm" /> : null}
                      Save Changes
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}