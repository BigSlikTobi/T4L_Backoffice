
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList, // Import CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
  value: currentValue, // Renamed prop for clarity
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

  const allOptions = React.useMemo(() => {
    let baseOptions = options;
    if (allowNull) {
      // Ensure we don't add duplicate null placeholders if options might already contain one
      const hasNullOptionAlready = options.some(opt => opt.value === NULL_OPTION_VALUE);
      if (!hasNullOptionAlready) {
        baseOptions = [{ value: NULL_OPTION_VALUE, label: nullLabel }, ...options];
      }
    }
    return baseOptions;
  }, [options, allowNull, nullLabel]);

  const selectedOption = allOptions.find((option) => {
    if (currentValue === null && option.value === NULL_OPTION_VALUE) {
      return true;
    }
    return String(option.value) === String(currentValue);
  });

  const handleItemSelect = (selectedValueFromItem: any) => {
    // selectedValueFromItem is the original value from the option object
    console.log(`[Combobox] handleItemSelect called with selectedValueFromItem: ${selectedValueFromItem}, type: ${typeof selectedValueFromItem}`);
    
    if (selectedValueFromItem === NULL_OPTION_VALUE) {
      onChange(null);
      console.log(`[Combobox] Calling onChange with null`);
    } else {
      onChange(selectedValueFromItem); // Pass the original typed value
      console.log(`[Combobox] Calling onChange with value: ${selectedValueFromItem}`);
    }
    setOpen(false);
  };
  

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", contentClassName)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList> {/* CommandList wraps CommandEmpty and CommandGroup */}
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allOptions.map((option) => (
                <CommandItem
                  // Key must be unique and string. Use placeholder for null option.
                  key={option.value === NULL_OPTION_VALUE ? NULL_OPTION_VALUE : String(option.value)}
                  // value for CMDK's internal filtering/selection. Must be string.
                  value={String(option.value)} 
                  onMouseDown={(e) => {
                    e.preventDefault(); // Crucial to prevent blur/focus issues closing popover prematurely
                    console.log(`[Combobox] CommandItem onMouseDown triggered for value: ${option.value} (original), label: "${option.label}"`);
                    handleItemSelect(option.value); // Pass the original option.value (could be number, string, etc.)
                  }}
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
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
