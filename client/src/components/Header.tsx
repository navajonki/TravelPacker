import { Link, useRoute } from "wouter";
import { Luggage, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/UserMenu";

interface HeaderProps {
  onCreateNewList?: () => void;
}

export default function Header({ 
  onCreateNewList
}: HeaderProps) {
  const [isListPage] = useRoute("/list/:id");

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo */}
          <div className="flex items-center space-x-2">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <Luggage className="text-primary h-6 w-6" />
                <h1 className="text-xl font-semibold text-gray-900">TravelPack</h1>
              </div>
            </Link>
          </div>
          
          {/* Middle - Back to Lists button */}
          {isListPage && (
            <Link href="/">
              <Button variant="ghost" className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Lists
              </Button>
            </Link>
          )}
          
          {/* Right side - User menu with logout */}
          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
