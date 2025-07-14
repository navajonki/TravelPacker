import { useState } from "react";
import { Plus, FileDown, Filter, Edit3, CheckSquare, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuickAddForm from "@/components/QuickAddForm";

interface ActionBarProps {
  packingListId: number;
  isMultiEditMode: boolean;
  selectedItemIds: number[];
  onOpenAdvancedAdd: () => void;
  onAddItem: (item: any) => Promise<void>;
  onToggleMultiEditMode: (enabled: boolean) => void;
  onOpenBulkEdit: () => void;
  onExportList: () => void;
}

export default function ActionBar({
  packingListId,
  isMultiEditMode,
  selectedItemIds,
  onOpenAdvancedAdd,
  onAddItem,
  onToggleMultiEditMode,
  onOpenBulkEdit,
  onExportList
}: ActionBarProps) {
  const [isAddFormExpanded, setIsAddFormExpanded] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 p-3">
      <div className="container max-w-7xl mx-auto">
        {isMultiEditMode ? (
          // Multi-edit mode actions
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
        ) : (
          // Normal mode actions
          <div className="flex items-center justify-between">
            {isAddFormExpanded ? (
              <QuickAddForm
                packingListId={packingListId}
                onAddItem={onAddItem}
                onOpenAdvancedAdd={onOpenAdvancedAdd}
                isInline={true}
                onClose={() => setIsAddFormExpanded(false)}
              />
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setIsAddFormExpanded(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 shadow-md"
                  size="default"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Item</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleMultiEditMode(true)}
                  className="flex items-center gap-1"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Multiple</span>
                </Button>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}