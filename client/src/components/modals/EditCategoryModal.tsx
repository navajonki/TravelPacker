import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface EditCategoryModalProps {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  categoryName: string;
  packingListId: number;
}

export default function EditCategoryModal({ 
  open, 
  onClose, 
  categoryId,
  categoryName,
  packingListId
}: EditCategoryModalProps) {
  const [name, setName] = useState(categoryName);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Reset form when opened
    if (open) {
      setName(categoryName);
    }
  }, [open, categoryName]);

  const updateCategoryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PATCH', `/api/categories/${categoryId}`, {
        name: name.trim()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateCategoryMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Change the name of this category.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input 
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!name.trim() || name === categoryName}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}