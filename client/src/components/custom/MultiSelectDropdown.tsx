import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface MultiSelectDropdownProps {
  title: string;
  items: { id: number; name: string; count?: number }[];
  selectedIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
}

export function MultiSelectDropdown({ 
  title, 
  items, 
  selectedIds, 
  onSelectionChange 
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayText = selectedIds.length === 0
    ? `All ${title}`
    : `${selectedIds.length} Selected`;

  const handleSelectAll = () => {
    onSelectionChange(items.map(item => item.id));
  };

  const handleClear = () => {
    onSelectionChange([]);
  };

  const handleItemToggle = (id: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    // Add event listener when dropdown is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{displayText}</span>
        <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-2 flex items-center justify-between border-b">
            <h3 className="text-sm font-semibold">{title}</h3>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>
          </div>
          
          <div className="max-h-60 overflow-auto">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleItemToggle(item.id, !selectedIds.includes(item.id))}
              >
                <Checkbox 
                  checked={selectedIds.includes(item.id)} 
                  onCheckedChange={(checked) => {
                    if (typeof checked === 'boolean') {
                      handleItemToggle(item.id, checked);
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">
                  {item.name} {item.count !== undefined && `(${item.count})`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}