#!/bin/bash

# List of modal files to update
MODAL_FILES=$(find client/src/components/modals -name "*.tsx")

for file in $MODAL_FILES; do
  echo "Updating $file..."
  
  # Update import statement
  sed -i 's/import {.*Dialog,.*DialogContent,.*DialogHeader,.*DialogTitle,.*DialogDescription,.*DialogFooter.*} from "@\/components\/ui\/dialog";/import { SideDialog, SideDialogContent, SideDialogHeader, SideDialogTitle, SideDialogDescription, SideDialogFooter } from "@\/components\/ui\/side-dialog";/g' "$file"
  
  # Update Dialog with SideDialog
  sed -i 's/<Dialog/<SideDialog/g' "$file"
  sed -i 's/<\/Dialog>/<\/SideDialog>/g' "$file"
  
  # Update DialogContent with SideDialogContent
  sed -i 's/<DialogContent/<SideDialogContent/g' "$file"
  sed -i 's/<\/DialogContent>/<\/SideDialogContent>/g' "$file"
  
  # Update DialogHeader with SideDialogHeader
  sed -i 's/<DialogHeader/<SideDialogHeader/g' "$file"
  sed -i 's/<\/DialogHeader>/<\/SideDialogHeader>/g' "$file"
  
  # Update DialogTitle with SideDialogTitle
  sed -i 's/<DialogTitle/<SideDialogTitle/g' "$file"
  sed -i 's/<\/DialogTitle>/<\/SideDialogTitle>/g' "$file"
  
  # Update DialogDescription with SideDialogDescription
  sed -i 's/<DialogDescription/<SideDialogDescription/g' "$file"
  sed -i 's/<\/DialogDescription>/<\/SideDialogDescription>/g' "$file"
  
  # Update DialogFooter with SideDialogFooter
  sed -i 's/<DialogFooter/<SideDialogFooter/g' "$file"
  sed -i 's/<\/DialogFooter>/<\/SideDialogFooter>/g' "$file"
  
  # Remove the close button since it's already included in SideDialogContent
  sed -i '/<Button.*variant="ghost".*size="icon".*className="absolute right-4 top-4".*onClick={onClose}/,/<\/Button>/d' "$file"
  
  # Add className="space-y-4 mt-4" to form elements
  sed -i 's/<form onSubmit={form.handleSubmit(onSubmit)}>/<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">/g' "$file"
  
  # Remove max-width classes that might interfere with our side dialog styling
  sed -i 's/className="sm:max-w-md"/className=""/g' "$file"
done

echo "All modal files updated to use SideDialog"
