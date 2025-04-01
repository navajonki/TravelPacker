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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onAddCategory: (name: string) => Promise<void>;
}

const formSchema = z.object({
  name: z.string().min(1, "Category name is required")
});

export default function AddCategoryModal({
  open,
  onClose,
  onAddCategory
}: AddCategoryModalProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: ""
    }
  });
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    await onAddCategory(data.name);
    form.reset();
    onClose();
  };

  return (
    <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <SideDialogContent>
        <SideDialogHeader>
          <SideDialogTitle>Add New Category</SideDialogTitle>
          <SideDialogDescription>
            Create a new category to organize your packing items.
          </SideDialogDescription>
        </SideDialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category name" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <SideDialogFooter className="mt-6 gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Category</Button>
            </SideDialogFooter>
          </form>
        </Form>
      </SideDialogContent>
    </SideDialog>
  );
}
