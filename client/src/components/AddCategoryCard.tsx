import { Plus } from 'lucide-react';

interface AddCategoryCardProps {
  onClick: () => void;
}

export default function AddCategoryCard({ onClick }: AddCategoryCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 cursor-pointer hover:border-primary transition-colors"
    >
      <div className="flex flex-col items-center text-gray-500 hover:text-primary">
        <Plus className="h-12 w-12 mb-3" />
        <h3 className="text-lg font-medium">Add New Category</h3>
        <p className="text-sm text-center mt-2">
          Create a new category to organize your items
        </p>
      </div>
    </div>
  );
}