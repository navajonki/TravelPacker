import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Define schema for form validation
const formSchema = z.object({
  name: z.string().optional(),
  quantity: z.preprocess(
    (val) => (val === "" ? undefined : parseInt(String(val), 10)),
    z.number().min(1).optional()
  ),
  packed: z.boolean().optional(),
  bagId: z.preprocess(
    (val) => (val === "" ? undefined : parseInt(String(val), 10)),
    z.number().optional()
  ),
  travelerId: z.preprocess(
    (val) => (val === "" ? undefined : parseInt(String(val), 10)),
    z.number().optional()
  ),
  categoryId: z.preprocess(
    (val) => (val === "" ? undefined : parseInt(String(val), 10)),
    z.number().optional()
  )
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: undefined,
      packed: undefined,
      bagId: undefined,
      travelerId: undefined,
      categoryId: undefined
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  // Fetch categories for the dropdown
  const categoriesQuery = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: open,
  });

  // Fetch bags for the dropdown
  const bagsQuery = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: open,
  });

  // Fetch travelers for the dropdown
  const travelersQuery = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: open,
  });

  const categories = categoriesQuery.data || [];
  const bags = bagsQuery.data || [];
  const travelers = travelersQuery.data || [];

  const bulkEditMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Filter out undefined fields to only update what the user changed
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined && v !== "")
      );
      
      return await apiRequest("PATCH", "/api/items/bulk-update", {
        ids: selectedItemIds,
        data: updateData
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      
      // Show success message
      toast({
        title: "Success",
        description: `${selectedItemIds.length} items have been updated`,
      });
      
      // Close modal and reset form
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update items",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: FormValues) => {
    bulkEditMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit {selectedItemIds.length} Items</DialogTitle>
          <DialogDescription>
            Make changes to multiple items at once. Only the fields you modify will be updated.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="New name for all items" {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave empty to keep original names
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
                      placeholder="New quantity for all items" 
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? undefined : val);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty to keep original quantities
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="packed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => {
                        if (checked === "indeterminate") return;
                        field.onChange(checked || undefined);
                      }}
                      className="data-[state=indeterminate]:bg-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Mark all as packed
                    </FormLabel>
                    <FormDescription>
                      Leave unchecked to keep original packed status
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
                    onValueChange={(value) => 
                      field.onChange(value === "" ? undefined : parseInt(value, 10))
                    }
                    defaultValue=""
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No change</SelectItem>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Move all items to a new category
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
                    onValueChange={(value) => 
                      field.onChange(value === "" ? undefined : parseInt(value, 10))
                    }
                    defaultValue=""
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bag" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No change</SelectItem>
                      <SelectItem value="null">None</SelectItem>
                      {bags.map((bag: any) => (
                        <SelectItem key={bag.id} value={bag.id.toString()}>
                          {bag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Assign all items to a new bag
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
                    onValueChange={(value) => 
                      field.onChange(value === "" ? undefined : parseInt(value, 10))
                    }
                    defaultValue=""
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a traveler" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No change</SelectItem>
                      <SelectItem value="null">None</SelectItem>
                      {travelers.map((traveler: any) => (
                        <SelectItem key={traveler.id} value={traveler.id.toString()}>
                          {traveler.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Assign all items to a new traveler
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={bulkEditMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={bulkEditMutation.isPending}
              >
                {bulkEditMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Items"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}