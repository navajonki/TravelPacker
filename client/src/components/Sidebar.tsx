import { Link, useLocation } from "wouter";
import { UserCircle, Luggage, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarProps {
  onCreateNewList: () => void;
}

export default function Sidebar({ onCreateNewList }: SidebarProps) {
  const [location] = useLocation();
  
  const { data: packingLists = [], isLoading: isLoadingLists } = useQuery<any[]>({
    queryKey: ['/api/packing-lists?userId=1'],
  });
  
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<any[]>({
    queryKey: ['/api/templates'],
  });

  return (
    <div className="hidden md:block bg-white w-64 border-r border-gray-200 flex-shrink-0 h-full">
      <div className="p-4">
        <Button 
          onClick={onCreateNewList} 
          className="bg-primary text-white w-full px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center justify-center"
        >
          <span className="mr-1">+</span> New List
        </Button>
      </div>
      
      <div className="px-4 py-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Lists</h2>
      </div>
      
      <nav>
        <ul>
          {isLoadingLists ? (
            Array(3).fill(0).map((_, index) => (
              <li key={index} className="px-4 py-2">
                <Skeleton className="h-8 w-full rounded-lg" />
              </li>
            ))
          ) : (
            packingLists?.map((list: any) => (
              <li key={list.id}>
                <Link href={`/list/${list.id}`} className={`flex items-center px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-lg mx-2 my-1 group ${location === `/list/${list.id}` ? 'bg-gray-100' : ''}`}>
                  <Luggage className="mr-3 h-5 w-5 text-primary" />
                  <span>{list.name}</span>
                  <div 
                    className={`ml-auto px-1.5 py-0.5 text-xs rounded-full text-white ${
                      list.progress >= 75 ? 'bg-green-500' : 
                      list.progress >= 25 ? 'bg-amber-500' : 
                      'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {list.progress}%
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </nav>
      
      <div className="px-4 py-2 mt-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Templates</h2>
      </div>
      
      <nav>
        <ul>
          {isLoadingTemplates ? (
            Array(3).fill(0).map((_, index) => (
              <li key={index} className="px-4 py-2">
                <Skeleton className="h-8 w-full rounded-lg" />
              </li>
            ))
          ) : (
            templates?.map((template: any) => (
              <li key={template.id}>
                <a 
                  href="#" 
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-lg mx-2 my-1"
                >
                  <FileText className="mr-3 h-5 w-5 text-gray-500" />
                  <span>{template.name}</span>
                </a>
              </li>
            ))
          )}
        </ul>
      </nav>
      
      <div className="mt-auto p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-gray-700" />
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">Demo User</div>
            <button className="text-xs text-gray-500 hover:text-primary">Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
