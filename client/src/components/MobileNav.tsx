import { Link } from "wouter";
import { Luggage, Plus, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
  onCreateNewList?: () => void;
  show?: boolean;
}

export default function MobileNav({ onCreateNewList, show = false }: MobileNavProps) {
  const { logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // If it's not explicitly shown, only show on mobile
  const displayClass = show ? "block" : "md:hidden";

  return (
    <div className={`${displayClass} bg-white border-b border-gray-200`}>
      <div className="flex items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center p-2 text-gray-700">
          <Luggage className="h-5 w-5 mr-1" />
          <span className="font-medium">Back to Lists</span>
        </Link>
        
        <div className="flex items-center space-x-2">
          {onCreateNewList && (
            <button 
              onClick={onCreateNewList}
              className="flex items-center p-2 bg-primary text-white rounded-md"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span>New</span>
            </button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
