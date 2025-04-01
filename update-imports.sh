#!/bin/bash

for file in client/src/components/modals/*.tsx; do
  # Skip the files that already have the side-dialog import
  if ! grep -q "from \"@/components/ui/side-dialog\"" "$file"; then
    echo "Updating imports in $file"
    # Add side-dialog import at the top of the file
    sed -i '1i import { SideDialog, SideDialogContent, SideDialogHeader, SideDialogTitle, SideDialogDescription, SideDialogFooter } from "@/components/ui/side-dialog";' "$file"
  fi
done

echo "Updated imports in all modal files"
