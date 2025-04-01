import { useState, useEffect } from "react";
import { 
  SideDialog, 
  SideDialogContent, 
  SideDialogHeader, 
  SideDialogTitle,
  SideDialogDescription,
  SideDialogFooter 
} from "@/components/ui/side-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSyncStatus } from "@/hooks/use-sync-status";

// Define the component props
interface EditItemModalProps {
  open: boolean;
  onClose: () => void;
  packingListId: number;
  itemId: number;
}

// Create the form schema using zod
const formSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  packed: z.boolean().default(false),
  isEssential: z.boolean().default(false),
  categoryId: z.coerce.number().int().min(1, "Category is required"),
  bagId: z.coerce.number().int().optional().nullable(),
  travelerId: z.coerce.number().int().optional().nullable(),
  dueDate: z.string().optional().nullable()
});

// The actual modal component
export default function EditItemModal({
  open,
  onClose,
  packingListId,
  itemId
}: EditItemModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { incrementPending, decrementPending } = useSyncStatus();

  // Fetch item data
  const { data: item, isLoading } = useQuery({
    queryKey: [`/api/items/${itemId}`],
    enabled: open && itemId > 0
  });

  // Fetch categories for select dropdown
  const { data: categories = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: open
  });

  // Fetch bags for select dropdown
  const { data: bags = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: open
  });

  // Fetch travelers for select dropdown
  const { data: travelers = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: open
  });

  // Setup react-hook-form with zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      packed: false,
      isEssential: false,
      categoryId: 0,
      bagId: null,
      travelerId: null,
      dueDate: null
    }
  });

  // Update form values when item data is loaded
  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        quantity: item.quantity || 1,
        packed: item.packed || false,
        isEssential: item.isEssential || false,
        categoryId: item.categoryId,
        bagId: item.bagId || null,
        travelerId: item.travelerId || null,
        dueDate: item.dueDate || null
      });
    }
  }, [form, item]);

  // Mutation for updating the item
  const updateItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      incrementPending();
      try {
        const res = await apiRequest('PATCH', `/api/items/${itemId}`, data);
        return await res.json();
      } finally {
        decrementPending();
      }
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      
      if (form.getValues().bagId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      }
      
      if (form.getValues().travelerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      }
      
      // Close the modal
      onClose();
    },
    onError: (err: any) => {
      console.error("Error updating item:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    }
  });
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      await updateItemMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we're still loading the item data, show a loading state
  if (isLoading && open) {
    return (
      <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
        <SideDialogContent>
          <SideDialogHeader>
            <SideDialogTitle>Edit Item</SideDialogTitle>
            <SideDialogDescription>Loading item details...</SideDialogDescription>
          </SideDialogHeader>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </SideDialogContent>
      </SideDialog>
    );
  }

  return (
    <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <SideDialogContent>
        <SideDialogHeader>
          <SideDialogTitle>Edit Item</SideDialogTitle>
          <SideDialogDescription>
            Update the details of this item.
          </SideDialogDescription>
        </SideDialogHeader>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Toothbrush" 
                      {...field} 
                      autoFocus 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
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
                        disabled={isSubmitting}
                      />
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
                      disabled={isSubmitting} 
                      onValueChange={field.onChange} 
                      defaultValue={field.value?.toString() || undefined}
                      value={field.value?.toString() || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category: any) => (
                          <SelectItem 
                            key={category.id} 
                            value={category.id.toString()}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bagId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bag (Optional)</FormLabel>
                    <Select 
                      disabled={isSubmitting} 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                      defaultValue={field.value?.toString() || undefined}
                      value={field.value?.toString() || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bag" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {bags.map((bag: any) => (
                          <SelectItem 
                            key={bag.id} 
                            value={bag.id.toString()}
                          >
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
                      disabled={isSubmitting} 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                      defaultValue={field.value?.toString() || undefined}
                      value={field.value?.toString() || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select traveler" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {travelers.map((traveler: any) => (
                          <SelectItem 
                            key={traveler.id} 
                            value={traveler.id.toString()}
                          >
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
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="packed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 border">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Packed
                      </FormLabel>
                      <FormDescription>
                        Mark as packed if this item is ready
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isEssential"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 border">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Essential
                      </FormLabel>
                      <FormDescription>
                        Mark as essential if this item is critical
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      {...field} 
                      value={field.value || ""}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional date when this item needs to be packed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <SideDialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </SideDialogFooter>
          </form>
        </Form>
      </SideDialogContent>
    </SideDialog>
  );
}
