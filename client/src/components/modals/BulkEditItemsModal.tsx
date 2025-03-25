import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  packed: z.boolean().optional(),
  categoryId: z.number().optional(),
  bagId: z.number().optional(),
  travelerId: z.number().optional(),
  quantity: z.number().min(1).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BulkEditItemsModalProps {
  open: boolean;
  onClose: () => void;
  selectedItemIds: number[];
  packingListId: number;
}

export default function BulkEditItemsModal({
  open,
  onClose,
  selectedItemIds,
  packingListId
}: BulkEditItemsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get categories, bags, and travelers for the packing list
  const { data: categories = [] } = useQuery<any>({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: open,
  });
  
  const { data: bags = [] } = useQuery<any>({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: open,
  });
  
  const { data: travelers = [] } = useQuery<any>({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      packed: undefined,
      categoryId: undefined,
      bagId: undefined,
      travelerId: undefined,
      quantity: undefined
    }
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log("Bulk edit - Selected item IDs:", selectedItemIds);
      
      // Filter out undefined values from form data
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      console.log("Bulk edit - Form data after filtering:", filteredData);

      // Ensure all IDs are valid numbers
      const validItemIds = selectedItemIds
        .filter(id => id !== null && id !== undefined)
        .map(id => {
          console.log(`Processing ID: ${id}, type: ${typeof id}`);
          return typeof id === 'string' ? parseInt(id, 10) : id;
        })
        .filter(id => {
          const isValid = typeof id === 'number' && !isNaN(id);
          console.log(`ID after conversion: ${id}, isValid: ${isValid}`);
          return isValid;
        });
      
      console.log("Bulk edit - Valid item IDs:", validItemIds);
      
      if (validItemIds.length === 0) {
        throw new Error("No valid item IDs selected");
      }
      
      if (Object.keys(filteredData).length === 0) {
        throw new Error("No fields selected for update");
      }
      
      // Bulk update via API
      try {
        const payload = {
          ids: validItemIds,
          data: filteredData
        };
        console.log("Bulk edit - API request payload:", payload);
        
        const response = await apiRequest(
          "PATCH",
          `/api/items/bulk-update`, 
          payload
        );
        
        console.log("Bulk edit - API response:", response);
        return response;
      } catch (error) {
        console.error("Bulk edit - API error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Bulk edit - Success response:", data);
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      
      toast({
        title: "Success",
        description: `Updated ${selectedItemIds.length} item${selectedItemIds.length === 1 ? '' : 's'}`
      });
      onClose();
    },
    onError: (error: any) => {
      console.error("Bulk edit - Error details:", error);
      
      let errorMessage = "Failed to update items";
      
      if (error?.response?.data?.debug) {
        errorMessage += `: ${error.response.data.message}`;
        console.error("Server debug info:", error.response.data.debug);
      } else if (error?.message) {
        errorMessage += `: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: FormValues) => {
    mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Multiple Items</DialogTitle>
          <DialogDescription>
            Update properties for {selectedItemIds.length} selected item{selectedItemIds.length === 1 ? '' : 's'}.
            Only filled fields will be updated.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="packed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked === true);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Mark as packed</FormLabel>
                    <FormDescription>
                      Set the packed status for all selected items
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Move items to a different category
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bagId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bag</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bag" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bags.map((bag: any) => (
                        <SelectItem key={bag.id} value={bag.id.toString()}>
                          {bag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Assign items to a bag
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="travelerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Traveler</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select traveler" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {travelers.map((traveler: any) => (
                        <SelectItem key={traveler.id} value={traveler.id.toString()}>
                          {traveler.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Assign items to a traveler
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Set quantity for all selected items
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Updating..." : "Update Items"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}