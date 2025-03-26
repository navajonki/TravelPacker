import { Link } from "wouter";
import { Luggage, Plus } from "lucide-react";

interface MobileNavProps {
  onCreateNewList?: () => void;
}

export default function MobileNav({ onCreateNewList }: MobileNavProps) {
  return (
    <div className="md:hidden bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center p-2 text-gray-700">
          <Luggage className="h-5 w-5 mr-1" />
          <span className="font-medium">Back to Lists</span>
        </Link>
        
        {onCreateNewList && (
          <button 
            onClick={onCreateNewList}
            className="flex items-center p-2 bg-primary text-white rounded-md"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span>New</span>
          </button>
        )}
      </div>
    </div>
  );
}
