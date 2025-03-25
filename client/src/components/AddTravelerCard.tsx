import { Plus } from 'lucide-react';

interface AddTravelerCardProps {
  onClick: () => void;
}

export default function AddTravelerCard({ onClick }: AddTravelerCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 cursor-pointer hover:border-primary transition-colors"
    >
      <div className="flex flex-col items-center text-gray-500 hover:text-primary">
        <Plus className="h-12 w-12 mb-3" />
        <h3 className="text-lg font-medium">Add New Traveler</h3>
        <p className="text-sm text-center mt-2">
          Add a traveler to assign items to
        </p>
      </div>
    </div>
  );
}