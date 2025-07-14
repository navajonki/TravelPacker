import { Link, useRoute } from "wouter";
import { Luggage, ArrowLeft, MoreHorizontal, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UserMenu from "@/components/UserMenu";

interface HeaderProps {
  onCreateNewList?: () => void;
  showPackingListMenu?: boolean;
  onShare?: () => void;
  onExport?: () => void;
  onEditList?: () => void;
  onDeleteList?: () => void;
}

export default function Header({ 
  onCreateNewList,
  showPackingListMenu = false,
  onShare,
  onExport,
  onEditList,
  onDeleteList
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
          <div className="flex items-center space-x-2">
            {showPackingListMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="md:hidden" onSelect={onShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    <span>Share</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="md:hidden" onSelect={onExport}>
                    <Download className="h-4 w-4 mr-2" />
                    <span>Export</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onEditList}>
                    <span>Edit List</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onDeleteList}>
                    <span>Delete List</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
