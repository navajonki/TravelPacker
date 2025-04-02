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
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [action, setAction] = useState<'pack' | 'unpack' | 'move' | 'assign'>('pack');
  const [category, setCategory] = useState<string>('');
  const [bag, setBag] = useState<string>('');
  const [traveler, setTraveler] = useState<string>('');
  
  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      let data: any = {};
      
      if (action === 'pack') {
        data = { packed: true };
      } else if (action === 'unpack') {
        data = { packed: false };
      } else if (action === 'move' && category) {
        data = { categoryId: parseInt(category) };
      } else if (action === 'assign') {
        if (bag) {
          data.bagId = parseInt(bag);
        }
        if (traveler) {
          data.travelerId = parseInt(traveler);
        }
      }
      
      return await apiRequest('PATCH', '/api/items/bulk-update', { 
        ids: selectedItemIds,
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      
      let successMessage = '';
      if (action === 'pack') {
        successMessage = `${selectedItemIds.length} items marked as packed`;
      } else if (action === 'unpack') {
        successMessage = `${selectedItemIds.length} items marked as unpacked`;
      } else if (action === 'move') {
        successMessage = `${selectedItemIds.length} items moved to new category`;
      } else if (action === 'assign') {
        successMessage = `${selectedItemIds.length} items assigned to new bag/traveler`;
      }
      
      toast({
        title: "Success",
        description: successMessage,
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update items",
        variant: "destructive"
      });
    }
  });
  
  const handleSubmit = () => {
    bulkUpdateMutation.mutate();
  };
  
  return (
    <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <SideDialogContent>
        <SideDialogHeader>
          <SideDialogTitle>Bulk Edit {selectedItemIds.length} Items</SideDialogTitle>
          <SideDialogDescription>Apply changes to multiple items at once</SideDialogDescription>
        </SideDialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant={action === 'pack' ? 'default' : 'outline'} 
                onClick={() => setAction('pack')}
                type="button"
              >
                Mark as Packed
              </Button>
              <Button 
                variant={action === 'unpack' ? 'default' : 'outline'} 
                onClick={() => setAction('unpack')}
                type="button"
              >
                Mark as Unpacked
              </Button>
              <Button 
                variant={action === 'move' ? 'default' : 'outline'} 
                onClick={() => setAction('move')}
                type="button"
              >
                Move to Category
              </Button>
              <Button 
                variant={action === 'assign' ? 'default' : 'outline'} 
                onClick={() => setAction('assign')}
                type="button"
              >
                Assign Bag/Traveler
              </Button>
            </div>
          </div>
          
          {action === 'move' && (
            <div className="space-y-2">
              <Label>Select Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {/* Categories would be fetched and mapped here */}
                  <SelectItem value="1">Category 1</SelectItem>
                  <SelectItem value="2">Category 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {action === 'assign' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Assign to Bag (optional)</Label>
                <Select value={bag} onValueChange={setBag}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bag" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Bags would be fetched and mapped here */}
                    <SelectItem value="1">Bag 1</SelectItem>
                    <SelectItem value="2">Bag 2</SelectItem>
                    <SelectItem value="">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Assign to Traveler (optional)</Label>
                <Select value={traveler} onValueChange={setTraveler}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a traveler" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Travelers would be fetched and mapped here */}
                    <SelectItem value="1">Traveler 1</SelectItem>
                    <SelectItem value="2">Traveler 2</SelectItem>
                    <SelectItem value="">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        
        <SideDialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={bulkUpdateMutation.isPending || 
              (action === 'move' && !category) || 
              (action === 'assign' && !bag && !traveler)}
          >
            {bulkUpdateMutation.isPending ? 'Updating...' : 'Update Items'}
          </Button>
        </SideDialogFooter>
      </SideDialogContent>
    </SideDialog>
  );
}
