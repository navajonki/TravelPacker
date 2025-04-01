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

interface EditTravelerModalProps {
  open: boolean;
  onClose: () => void;
  travelerId: number;
  travelerName: string;
  packingListId: number;
}

export default function EditTravelerModal({ 
  open, 
  onClose, 
  travelerId,
  travelerName,
  packingListId
}: EditTravelerModalProps) {
  const [name, setName] = useState(travelerName);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Reset form when opened
    if (open) {
      setName(travelerName);
    }
  }, [open, travelerName]);

  const updateTravelerMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PATCH', `/api/travelers/${travelerId}`, {
        name: name.trim()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      toast({
        title: "Success",
        description: "Traveler updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update traveler",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateTravelerMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Traveler</DialogTitle>
          <DialogDescription>
            Change the name of this traveler.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="traveler-name">Traveler Name</Label>
              <Input 
                id="traveler-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter traveler name"
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
              disabled={!name.trim() || name === travelerName}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}