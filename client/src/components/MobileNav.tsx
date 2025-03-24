import { useLocation, Link } from "wouter";
import { Luggage, FileText, Settings, User } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();
  
  return (
    <div className="md:hidden bg-white border-t border-gray-200">
      <div className="flex items-center justify-around">
        <Link href="/">
          <a className={`flex flex-col items-center p-3 ${location === '/' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
            <Luggage className="h-5 w-5" />
            <span className="text-xs mt-1">Lists</span>
          </a>
        </Link>
        
        <button className="flex flex-col items-center p-3 text-gray-500 hover:text-gray-700">
          <FileText className="h-5 w-5" />
          <span className="text-xs mt-1">Templates</span>
        </button>
        
        <button className="flex flex-col items-center p-3 text-gray-500 hover:text-gray-700">
          <Settings className="h-5 w-5" />
          <span className="text-xs mt-1">Settings</span>
        </button>
        
        <button className="flex flex-col items-center p-3 text-gray-500 hover:text-gray-700">
          <User className="h-5 w-5" />
          <span className="text-xs mt-1">Account</span>
        </button>
      </div>
    </div>
  );
}
