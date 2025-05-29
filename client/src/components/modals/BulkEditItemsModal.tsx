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
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [action, setAction] = useState<'pack' | 'unpack' | 'move' | 'assign' | 'delete'>('pack');
  const [category, setCategory] = useState<string>('');
  const [bag, setBag] = useState<string>('');
  const [traveler, setTraveler] = useState<string>('');
  
  // Fetch categories, bags, and travelers for the dropdowns
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: !!packingListId
  });
  
  const { data: bags = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: !!packingListId
  });
  
  const { data: travelers = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: !!packingListId
  });
  
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
        if (bag === 'null') {
          // Set bagId to null to clear the assignment
          data.bagId = null;
        } else if (bag) {
          data.bagId = parseInt(bag);
        }
        
        if (traveler === 'null') {
          // Set travelerId to null to clear the assignment
          data.travelerId = null;
        } else if (traveler) {
          data.travelerId = parseInt(traveler);
        }
      }
      
      return await apiRequest('POST', '/api/items/multi-edit', { 
        itemIds: selectedItemIds,
        updates: data
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
    onError: (error: any) => {
      // Log the error for debugging
      console.error('Bulk update error:', error);
      
      let errorMessage = "Failed to update items";
      
      // Extract more detailed error information if available
      if (error.response?.data?.message) {
        errorMessage += `: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      // Delete items one by one using the existing DELETE endpoint
      const deletePromises = selectedItemIds.map(id => 
        apiRequest('DELETE', `/api/items/${id}`)
      );
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      
      // Invalidate unassigned queries for all view types
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/bag`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/traveler`] });
      
      // Also invalidate the all-items query
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/all-items`] });

      toast({
        title: "Success",
        description: `${selectedItemIds.length} items deleted successfully`,
      });
      
      onClose();
    },
    onError: (error: any) => {
      console.error('Bulk delete error:', error);
      
      let errorMessage = "Failed to delete items";
      
      if (error.response?.data?.message) {
        errorMessage += `: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  
  const handleSubmit = () => {
    if (action === 'delete') {
      bulkDeleteMutation.mutate();
    } else {
      bulkUpdateMutation.mutate();
    }
  };
  
  return (
    <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <SideDialogContent>
        <SideDialogHeader>
          <SideDialogTitle>Bulk Edit {selectedItemIds.length} Items</SideDialogTitle>
          <SideDialogDescription>Apply changes to multiple items at once</SideDialogDescription>
        </SideDialogHeader>
        
        <div className="py-4 space-y-6">
          {/* Mark as packed/unpacked dropdown */}
          <div className="space-y-2">
            <Label>Mark as packed / unpacked</Label>
            <Select 
              value={action === 'pack' ? 'pack' : action === 'unpack' ? 'unpack' : ''} 
              onValueChange={(value) => {
                if (value === 'pack' || value === 'unpack') {
                  setAction(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pack">Mark as packed</SelectItem>
                <SelectItem value="unpack">Mark as unpacked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Move to category dropdown */}
          <div className="space-y-2">
            <Label>Move to category</Label>
            <Select 
              value={action === 'move' ? category : ''} 
              onValueChange={(value) => {
                setAction('move');
                setCategory(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Assign to bag dropdown */}
          <div className="space-y-2">
            <Label>Assign to bag</Label>
            <Select 
              value={action === 'assign' ? bag : ''}
              onValueChange={(value) => {
                setAction('assign');
                setBag(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bag" />
              </SelectTrigger>
              <SelectContent>
                {bags.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
                <SelectItem value="null">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Assign to traveler dropdown */}
          <div className="space-y-2">
            <Label>Assign to traveler</Label>
            <Select 
              value={action === 'assign' ? traveler : ''}
              onValueChange={(value) => {
                setAction('assign');
                setTraveler(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select traveler" />
              </SelectTrigger>
              <SelectContent>
                {travelers.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.name}
                  </SelectItem>
                ))}
                <SelectItem value="null">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delete items section */}
          <div className="space-y-2 border-t border-destructive/20 pt-4">
            <Label className="text-destructive">Danger Zone</Label>
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="delete-action"
                  name="action"
                  checked={action === 'delete'}
                  onChange={() => setAction('delete')}
                  className="text-destructive focus:ring-destructive"
                />
                <label htmlFor="delete-action" className="text-sm font-medium text-destructive">
                  Delete all selected items permanently
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This action cannot be undone. All selected items will be permanently removed.
              </p>
            </div>
          </div>
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
            variant={action === 'delete' ? 'destructive' : 'default'}
            disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending ||
              (action === 'move' && !category) || 
              (action === 'assign' && bag === '' && traveler === '')}
          >
            {bulkUpdateMutation.isPending || bulkDeleteMutation.isPending 
              ? (action === 'delete' ? 'Deleting...' : 'Updating...')
              : (action === 'delete' ? 'Delete Items' : 'Update Items')
            }
          </Button>
        </SideDialogFooter>
      </SideDialogContent>
    </SideDialog>
  );
}
