import { useState } from "react";
import { X } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddBagModalProps {
  open: boolean;
  onClose: () => void;
  onAddBag: (name: string) => Promise<void>;
}

export default function AddBagModal({
  open,
  onClose,
  onAddBag
}: AddBagModalProps) {
  const [bagName, setBagName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bagName.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddBag(bagName);
      setBagName("");
      onClose();
    } catch (error) {
      console.error("Error adding bag:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Bag</DialogTitle>
          <DialogDescription>
            Enter the name of the bag you want to add to your packing list.
          </DialogDescription>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bagName">Bag Name</Label>
            <Input 
              id="bagName"
              placeholder="Enter bag name"
              value={bagName}
              onChange={(e) => setBagName(e.target.value)}
              required
            />
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Bag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}