import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AddCategoryCardProps {
  onClick: () => void;
}

export default function AddCategoryCard({ onClick }: AddCategoryCardProps) {
  return (
    <Card 
      className="bg-white rounded-lg border border-dashed border-gray-300 flex items-center justify-center h-48 cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <div className="flex flex-col items-center justify-center p-6 text-gray-500 hover:text-primary transition-colors">
        <Plus className="h-10 w-10" />
        <span className="mt-2 text-sm font-medium">Add New Category</span>
      </div>
    </Card>
  );
}
