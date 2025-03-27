import { useState } from "react";
import { Link } from "wouter";
import { Luggage, Search, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserMenu from "@/components/UserMenu";

interface HeaderProps {
  onCreateNewList: () => void;
  onOpenSearch?: () => void;
  onToggleMenu?: () => void;
}

export default function Header({ onCreateNewList, onOpenSearch, onToggleMenu }: HeaderProps) {
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const toggleMobileSearch = () => {
    setShowMobileSearch(!showMobileSearch);
    if (onOpenSearch) onOpenSearch();
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <Luggage className="text-primary h-6 w-6" />
                <h1 className="text-xl font-semibold text-gray-900">TravelPack</h1>
              </div>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search packing lists..."
                className="pl-9 pr-4 py-2 w-64"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
            </div>
            
            <Button onClick={onCreateNewList} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center">
              <Plus className="h-4 w-4 mr-1" />
              New List
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-500 hover:text-gray-700"
              onClick={toggleMobileSearch}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-500 hover:text-gray-700"
              onClick={onToggleMenu}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden md:block">
              <UserMenu />
            </div>
          </div>
        </div>
        
        {/* Mobile search (hidden by default) */}
        {showMobileSearch && (
          <div className="md:hidden py-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search packing lists..."
                className="pl-9 pr-4 py-2 w-full"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
