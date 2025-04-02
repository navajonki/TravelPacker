import { useState } from "react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EditBagModalProps {
  open: boolean;
  onClose: () => void;
  bagId: number;
  bagName: string;
  packingListId: number;
}

const formSchema = z.object({
  name: z.string().min(1, "Bag name is required").max(50, "Bag name must be less than 50 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditBagModal({ 
  open, 
  onClose,
  bagId,
  bagName,
  packingListId
}: EditBagModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: bagName,
    },
  });
  
  const updateBagMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return await apiRequest('PATCH', `/api/bags/${bagId}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      
      toast({
        title: "Bag Updated",
        description: "The bag has been updated successfully",
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update bag",
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (values: FormValues) => {
    updateBagMutation.mutate(values);
  };
  
  return (
    <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <SideDialogContent>
        <SideDialogHeader>
          <SideDialogTitle>Edit Bag</SideDialogTitle>
          <SideDialogDescription>Change the name of this bag</SideDialogDescription>
        </SideDialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bag Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter bag name" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <SideDialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateBagMutation.isPending}
              >
                {updateBagMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </SideDialogFooter>
          </form>
        </Form>
      </SideDialogContent>
    </SideDialog>
  );
}
