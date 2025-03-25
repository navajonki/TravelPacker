import { useState } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ItemRow from './ItemRow';

interface TravelerCardProps {
  traveler: {
    id: number;
    name: string;
    items: any[];
    totalItems: number;
    packedItems: number;
    packingListId: number;
  };
  onEditTraveler: (travelerId: number) => void;
  onDeleteTraveler: (travelerId: number) => void;
  onAddItem: (travelerId: number) => void;
}

export default function TravelerCard({ 
  traveler, 
  onEditTraveler, 
  onDeleteTraveler, 
  onAddItem 
}: TravelerCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const percentComplete = traveler.totalItems > 0 
    ? Math.round((traveler.packedItems / traveler.totalItems) * 100) 
    : 0;

  return (
    <div 
      className="bg-white rounded-lg shadow overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">{traveler.name}</h2>
          
          <div className={`flex space-x-1 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-500 hover:text-primary"
              onClick={() => onEditTraveler(traveler.id)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-500 hover:text-red-500"
              onClick={() => onDeleteTraveler(traveler.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {traveler.packedItems} of {traveler.totalItems} items packed
          </div>
          <div className="text-sm font-medium text-primary">
            {percentComplete}%
          </div>
        </div>
        
        <Progress 
          value={percentComplete} 
          className="h-1.5 mt-1" 
        />
      </div>
      
      <div className="divide-y divide-gray-100">
        {traveler.items?.map((item: any) => (
          <ItemRow 
            key={item.id} 
            item={item}
            packingListId={traveler.packingListId}
          />
        ))}
        
        <div 
          className="p-2 flex items-center justify-center hover:bg-gray-50 cursor-pointer"
          onClick={() => onAddItem(traveler.id)}
        >
          <Plus className="h-4 w-4 mr-1 text-primary" />
          <span className="text-sm text-primary font-medium">Add Item</span>
        </div>
      </div>
    </div>
  );
}