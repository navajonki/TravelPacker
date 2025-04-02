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

interface EditTravelerModalProps {
  open: boolean;
  onClose: () => void;
  travelerId: number;
  travelerName: string;
  packingListId: number;
}

const formSchema = z.object({
  name: z.string().min(1, "Traveler name is required").max(50, "Traveler name must be less than 50 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditTravelerModal({ 
  open, 
  onClose,
  travelerId,
  travelerName,
  packingListId
}: EditTravelerModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: travelerName,
    },
  });
  
  const updateTravelerMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return await apiRequest('PATCH', `/api/travelers/${travelerId}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      
      toast({
        title: "Traveler Updated",
        description: "The traveler has been updated successfully",
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update traveler",
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (values: FormValues) => {
    updateTravelerMutation.mutate(values);
  };
  
  return (
    <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <SideDialogContent>
        <SideDialogHeader>
          <SideDialogTitle>Edit Traveler</SideDialogTitle>
          <SideDialogDescription>Change the name of this traveler</SideDialogDescription>
        </SideDialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Traveler Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter traveler name" 
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
                disabled={updateTravelerMutation.isPending}
              >
                {updateTravelerMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </SideDialogFooter>
          </form>
        </Form>
      </SideDialogContent>
    </SideDialog>
  );
}
