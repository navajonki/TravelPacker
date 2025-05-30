import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditListModalProps {
  open: boolean;
  onClose: () => void;
  packingList: {
    id: number;
    name: string;
    theme?: string;
    dateRange?: string;
  };
}

export default function EditListModal({ open, onClose, packingList }: EditListModalProps) {
  const [name, setName] = useState(packingList.name);
  const [theme, setTheme] = useState(packingList.theme || "");
  const [dateRange, setDateRange] = useState(packingList.dateRange || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updatePackingListMutation = useMutation({
    mutationFn: async (data: { name: string; theme?: string; dateRange?: string }) => {
      return apiRequest('PATCH', `/api/packing-lists/${packingList.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingList.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists'] });
      toast({
        title: "Success",
        description: "Packing list updated successfully",
      });
      onClose();
    },
    onError: (error: unknown) => {
      console.error("Error updating packing list:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: `Failed to update packing list: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the list",
        variant: "destructive",
      });
      return;
    }
    
    updatePackingListMutation.mutate({
      name: name.trim(),
      theme: theme.trim() || undefined,
      dateRange: dateRange.trim() || undefined,
    });
  };

  const handleClose = () => {
    setName(packingList.name);
    setTheme(packingList.theme || "");
    setDateRange(packingList.dateRange || "");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Packing List</DialogTitle>
          <DialogDescription>
            Update the details of your packing list.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">List Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter list name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="theme">Theme (optional)</Label>
              <Input
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Beach vacation, Business trip"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateRange">Date Range (optional)</Label>
              <Input
                id="dateRange"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="e.g. June 15-22, 2024"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updatePackingListMutation.isPending}
            >
              {updatePackingListMutation.isPending ? "Updating..." : "Update List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}