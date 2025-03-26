import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, { message: "Item name is required" }),
  quantity: z.coerce.number().int().min(1).default(1),
  packed: z.boolean().default(false),
  isEssential: z.boolean().default(false),
  categoryId: z.coerce.number().int().positive(),
  bagId: z.union([
    z.coerce.number().int().positive(), 
    z.string(),
    z.null()
  ]).optional(),
  travelerId: z.union([
    z.coerce.number().int().positive(), 
    z.string(),
    z.null()
  ]).optional(),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);

  // Get categories, bags, and travelers for the packing list
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: open,
  });
  
  const { data: bags = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: open,
  });
  
  const { data: travelers = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: open,
  });

  // Get the current item data
  const { data: item, isLoading: itemLoading } = useQuery<any>({
    queryKey: [`/api/items/${itemId}`],
    enabled: open && itemId > 0,
  });

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      packed: false,
      isEssential: false,
      categoryId: 0,
      bagId: null,
      travelerId: null,
      dueDate: "",
    },
  });

  // Update form values when item data is loaded
  useEffect(() => {
    if (item && open) {
      form.reset({
        name: item.name,
        quantity: item.quantity,
        packed: item.packed,
        isEssential: item.isEssential,
        categoryId: item.categoryId,
        bagId: item.bagId || "none", // Use "none" instead of null
        travelerId: item.travelerId || "none", // Use "none" instead of null
        dueDate: item.dueDate || "",
      });
      setIsLoading(false);
    }
  }, [item, form, open]);

  // Handle form submission
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Process the values before submitting
      const processedValues = { ...values };
      
      // Convert "none" to null for bagId and travelerId
      if (processedValues.bagId && processedValues.bagId.toString() === "none") {
        processedValues.bagId = null;
      }
      
      if (processedValues.travelerId && processedValues.travelerId.toString() === "none") {
        processedValues.travelerId = null;
      }
      
      return await apiRequest('PATCH', `/api/items/${itemId}`, processedValues);
    },
    onSuccess: () => {
      // Show success message
      toast({
        title: "Item updated",
        description: "Your item has been updated successfully.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      
      // If item is assigned to a bag, invalidate bags query
      if (form.getValues().bagId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      }
      
      // If item is assigned to a traveler, invalidate travelers query
      if (form.getValues().travelerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      }
      
      // Close the modal
      onClose();
    },
    onError: (error) => {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the details of your packing item.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading || itemLoading ? (
          <div className="p-4 text-center">Loading item details...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter item name" {...field} />
                    </FormControl>
                    <FormMessage />
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
                      onValueChange={field.onChange} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bagId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bag (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a bag" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Bag</SelectItem>
                          {bags.map((bag) => (
                            <SelectItem key={bag.id} value={bag.id.toString()}>
                              {bag.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="travelerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Traveler (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a traveler" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Traveler</SelectItem>
                          {travelers.map((traveler) => (
                            <SelectItem key={traveler.id} value={traveler.id.toString()}>
                              {traveler.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
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
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="packed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Packed</FormLabel>
                        <FormDescription>
                          Item is already packed
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isEssential"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Essential</FormLabel>
                        <FormDescription>
                          Mark as essential item
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}