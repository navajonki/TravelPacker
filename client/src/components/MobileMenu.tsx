import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { X, LogOut, Home, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNewList?: () => void;
}

export default function MobileMenu({ isOpen, onClose, onCreateNewList }: MobileMenuProps) {
  const { user, logoutMutation } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Add an animation delay so the menu slides in
    if (isOpen) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => {
        setMounted(false);
      }, 300); // Match this with animation time
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  if (!mounted && !isOpen) return null;
  
  const handleLogout = () => {
    logoutMutation.mutate();
    onClose();
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className={`fixed top-0 right-0 bottom-0 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="text-lg font-semibold">Menu</div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {user && (
            <div className="p-4 border-b bg-gray-50">
              <div className="font-medium">{user.username}</div>
              <div className="text-sm text-gray-500">Logged in</div>
            </div>
          )}
          
          <div className="flex flex-col p-2 flex-grow">
            <Link href="/" onClick={onClose} className="flex items-center p-3 text-gray-700 hover:bg-gray-100 rounded-md">
              <Home className="h-5 w-5 mr-3 text-primary" />
              Home
            </Link>
            
            {onCreateNewList && (
              <button
                onClick={() => {
                  onCreateNewList();
                  onClose();
                }}
                className="flex items-center p-3 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <Plus className="h-5 w-5 mr-3 text-primary" />
                New List
              </button>
            )}
          </div>
          
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
      <div className="fixed inset-0" onClick={onClose}></div>
    </div>
  );
}