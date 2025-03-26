import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onCreateNewList: () => void;
}

export default function Sidebar({ onCreateNewList }: SidebarProps) {
  return (
    <div className="hidden md:flex bg-white border-r border-gray-200 p-4 items-center">
      <Link href="/">
        <Button variant="outline" size="sm" className="flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lists
        </Button>
      </Link>
      
      <Button 
        onClick={onCreateNewList} 
        className="ml-auto"
      >
        <span className="mr-1">+</span> New List
      </Button>
    </div>
  );
}
