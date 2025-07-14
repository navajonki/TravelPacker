import { CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionBarProps {
  isMultiEditMode: boolean;
  selectedItemIds: number[];
  onToggleMultiEditMode: (enabled: boolean) => void;
  onOpenBulkEdit: () => void;
}

export default function ActionBar({
  isMultiEditMode,
  selectedItemIds,
  onToggleMultiEditMode,
  onOpenBulkEdit
}: ActionBarProps) {
  // Only show ActionBar in multi-edit mode
  if (!isMultiEditMode) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 p-3">
      <div className="container max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onToggleMultiEditMode(false)}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <Button
              size="sm"
              onClick={onOpenBulkEdit}
              disabled={selectedItemIds.length === 0}
              className="flex items-center gap-1"
            >
              <CheckSquare className="h-4 w-4" />
              <span>Edit Selected ({selectedItemIds.length})</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}