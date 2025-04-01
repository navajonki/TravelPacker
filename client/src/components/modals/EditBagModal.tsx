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

interface EditBagModalProps {
  open: boolean;
  onClose: () => void;
  bagId: number;
  bagName: string;
  packingListId: number;
}

export default function EditBagModal({ 
  open, 
  onClose, 
  bagId,
  bagName,
  packingListId
}: EditBagModalProps) {
  const [name, setName] = useState(bagName);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Reset form when opened
    if (open) {
      setName(bagName);
    }
  }, [open, bagName]);

  const updateBagMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PATCH', `/api/bags/${bagId}`, {
        name: name.trim()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      toast({
        title: "Success",
        description: "Bag updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update bag",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateBagMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Bag</DialogTitle>
          <DialogDescription>
            Change the name of this bag.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bag-name">Bag Name</Label>
              <Input 
                id="bag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter bag name"
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
              disabled={!name.trim() || name === bagName}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}