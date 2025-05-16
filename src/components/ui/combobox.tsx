"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

export interface ComboboxOption {
  value: any; // Can be string, number, etc.
  label: string;
}

// Special placeholder for the "None" or null option's value
const NULL_OPTION_VALUE = "%%NULL_OPTION_VALUE%%";

interface ComboboxProps {
  options: ComboboxOption[];
  value?: any; // The currently selected original value (can be undefined/null)
  onChange: (value: any | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  allowNull?: boolean;
  nullLabel?: string;
}

export function Combobox({
  options,
  value: currentValue,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  disabled = false,
  triggerClassName,
  contentClassName,
  allowNull = false,
  nullLabel = "-- None --",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Process options and handle null option if allowed
  const allOptions = React.useMemo(() => {
    let baseOptions = options;
    if (allowNull) {
      const hasNullOptionAlready = options.some(opt => opt.value === NULL_OPTION_VALUE);
      if (!hasNullOptionAlready) {
        baseOptions = [{ value: NULL_OPTION_VALUE, label: nullLabel }, ...options];
      }
    }
    return baseOptions;
  }, [options, allowNull, nullLabel]);

  // Find the currently selected option
  const selectedOption = allOptions.find((option) => {
    if (currentValue === null && option.value === NULL_OPTION_VALUE) {
      return true;
    }
    return String(option.value) === String(currentValue);
  });
  
  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return allOptions;
    return allOptions.filter(option => 
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allOptions, searchQuery]);
  
  // Sort options alphabetically by label, keeping null option at the top if present
  const sortedOptions = React.useMemo(() => {
    const nullOption = filteredOptions.find(opt => opt.value === NULL_OPTION_VALUE);
    const regularOptions = filteredOptions
      .filter(opt => opt.value !== NULL_OPTION_VALUE)
      .sort((a, b) => a.label.localeCompare(b.label));
    
    return nullOption ? [nullOption, ...regularOptions] : regularOptions;
  }, [filteredOptions]);
  
  // Handle option selection
  const handleSelect = (option: ComboboxOption) => {
    console.log(`[Combobox] Option selected:`, option);
    
    if (option.value === NULL_OPTION_VALUE) {
      onChange(null);
    } else {
      onChange(option.value);
    }
    
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setSearchQuery(""); // Clear search when closing
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", triggerClassName)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn("w-[--radix-popover-trigger-width] p-0", contentClassName)}
        align="start"
        style={{ zIndex: 9999 }} // Ensure highest z-index
      >
        <div className="flex flex-col">
          {/* Search box */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input 
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          {/* Options list */}
          <div 
            className="max-h-[300px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-400"
            style={{ 
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch"
            }}
            onWheel={(e) => {
              // Prevent the wheel event from propagating to parent elements
              e.stopPropagation();
            }}
          >
            {sortedOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              sortedOptions.map((option) => (
                <div
                  key={option.value === NULL_OPTION_VALUE ? NULL_OPTION_VALUE : String(option.value)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                    (currentValue === null && option.value === NULL_OPTION_VALUE) || 
                    (currentValue !== null && String(option.value) === String(currentValue))
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                  onClick={() => handleSelect(option)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      (currentValue === null && option.value === NULL_OPTION_VALUE) ||
                      (currentValue !== null && String(option.value) === String(currentValue))
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
