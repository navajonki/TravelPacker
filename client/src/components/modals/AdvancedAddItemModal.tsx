import { useState } from "react";
import { X } from "lucide-react";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

interface AdvancedAddItemModalProps {
  open: boolean;
  onClose: () => void;
  packingListId: number;
  onAddItem: (data: any) => Promise<void>;
}

const formSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  categoryId: z.string().min(1, "Category is required"),
  bagId: z.string().optional(),
  travelerId: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  isEssential: z.boolean().default(false),
  setReminder: z.boolean().default(false),
  dueDate: z.string().optional()
});

// Type for form data
type FormValues = z.infer<typeof formSchema>;

export default function AdvancedAddItemModal({
  open,
  onClose,
  packingListId,
  onAddItem
}: AdvancedAddItemModalProps) {
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: open
  });
  
  const { data: bags = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: open
  });
  
  const { data: travelers = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: open
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      bagId: "none",
      travelerId: "none",
      quantity: 1,
      isEssential: false,
      setReminder: false,
      dueDate: ""
    }
  });
  
  const onSubmit = async (data: FormValues) => {
    // Create the item data object with explicit packingListId
    const itemData = {
      name: data.name,
      categoryId: parseInt(data.categoryId),
      packingListId: packingListId, // Add this explicitly
      bagId: data.bagId && data.bagId !== "none" ? parseInt(data.bagId) : undefined,
      travelerId: data.travelerId && data.travelerId !== "none" ? parseInt(data.travelerId) : undefined,
      quantity: data.quantity,
      isEssential: data.isEssential,
      dueDate: data.setReminder && data.dueDate ? data.dueDate : undefined
    };
    
    console.log("Advanced add - Creating item with data:", itemData);
    
    await onAddItem(itemData);
    
    form.reset();
    onClose();
  };

  return (
    <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <SideDialogContent className="">
        <SideDialogHeader>
          <SideDialogTitle>Add Item Details</SideDialogTitle>
          <SideDialogDescription>
            Enter details about the item you want to add to your packing list.
          </SideDialogDescription>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </SideDialogHeader>
        
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
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.isArray(categories) && categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bagId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bag</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bag" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {Array.isArray(bags) && bags.map((bag: any) => (
                        <SelectItem key={bag.id} value={bag.id.toString()}>
                          {bag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="travelerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {Array.isArray(travelers) && travelers.map((traveler: any) => (
                        <SelectItem key={traveler.id} value={traveler.id.toString()}>
                          {traveler.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isEssential"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox 
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Mark as essential item</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="setReminder"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox 
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setShowReminderOptions(!!checked);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Set reminder</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            {showReminderOptions && (
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            
            <SideDialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Item</Button>
            </SideDialogFooter>
          </form>
        </Form>
      </SideDialogContent>
    </SideDialog>
  );
}
