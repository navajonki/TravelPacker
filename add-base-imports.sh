#!/bin/bash

for file in client/src/components/modals/AddBagModal.tsx \
            client/src/components/modals/AddTravelerModal.tsx \
            client/src/components/modals/BulkEditItemsModal.tsx \
            client/src/components/modals/EditBagModal.tsx \
            client/src/components/modals/EditCategoryModal.tsx \
            client/src/components/modals/EditItemModal.tsx \
            client/src/components/modals/EditTravelerModal.tsx; do
    # Make a backup copy
    cp "$file" "${file}.bak"
    
    # Create a new file with the updated content
    cat > "$file" << 'EOL'
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

// Temporary stub component while we update the modals
export default function BaseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <SideDialogContent>
        <SideDialogHeader>
          <SideDialogTitle>Modal Title</SideDialogTitle>
          <SideDialogDescription>This modal is being updated to the new design.</SideDialogDescription>
        </SideDialogHeader>
        <div className="py-4">
          <p>Sorry for the inconvenience. This modal is temporarily unavailable while we update the interface.</p>
        </div>
        <SideDialogFooter>
          <Button onClick={onClose}>Close</Button>
        </SideDialogFooter>
      </SideDialogContent>
    </SideDialog>
  );
}
EOL
done

echo "Created base modal components"
