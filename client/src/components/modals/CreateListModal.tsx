import { useState } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
  onCreateList: (data: { name: string, theme?: string, dateRange?: string }) => Promise<void>;
}

const formSchema = z.object({
  name: z.string().min(1, "List name is required"),
  theme: z.string().optional(),
  dateRange: z.string().optional()
});

export default function CreateListModal({
  open,
  onClose,
  onCreateList
}: CreateListModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      theme: "",
      dateRange: ""
    }
  });
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      await onCreateList(data);
      form.reset();
      onClose();
    } catch (err) {
      console.error("Error creating list:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <SideDialogContent>
        <SideDialogHeader>
          <SideDialogTitle>Create New Packing List</SideDialogTitle>
          <SideDialogDescription>
            Fill in the details to create a new packing list.
          </SideDialogDescription>
        </SideDialogHeader>
        
        {error && (
          <Alert variant="destructive" className="mt-4 mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>List Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Summer Beach Trip" 
                      {...field} 
                      autoFocus 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Beach, Hiking, Business" 
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
              name="dateRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Range (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Aug 15-20, 2023" 
                      {...field} 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <SideDialogFooter className="gap-2 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
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
                    Creating...
                  </>
                ) : (
                  "Create List"
                )}
              </Button>
            </SideDialogFooter>
          </form>
        </Form>
      </SideDialogContent>
    </SideDialog>
  );
}
