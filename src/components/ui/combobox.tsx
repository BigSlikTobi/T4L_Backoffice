
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
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: any;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: any; // Can be undefined if nothing is selected
  onChange: (value: any | null) => void; // Allow null for clearing or for "None" option
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  allowNull?: boolean; // To explicitly handle a "None" or "Clear" option
  nullLabel?: string;
}

export function Combobox({
  options,
  value,
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
    if (allowNull) {
      const hasNullOption = options.some(opt => opt.value === "NULL_VALUE_PLACEHOLDER" || opt.value === null);
      if (!hasNullOption) {
        return [{ value: "NULL_VALUE_PLACEHOLDER", label: nullLabel }, ...options];
      }
    }
    return options;
  }, [options, allowNull, nullLabel]);

  const selectedOption = allOptions.find((option) => {
    if (value === null || value === "NULL_VALUE_PLACEHOLDER") {
      return option.value === "NULL_VALUE_PLACEHOLDER";
    }
    return String(option.value) === String(value);
  });

  const handleValueChange = (selectedValueString: string) => {
    console.log(`[Combobox] Command onValueChange triggered. selectedValueString: ${selectedValueString}`);
    
    const newSelectedOption = allOptions.find(
      (opt) => String(opt.value) === selectedValueString
    );

    if (newSelectedOption) {
      console.log(`[Combobox] newSelectedOption found: { value: ${newSelectedOption.value}, label: "${newSelectedOption.label}" }`);
      if (newSelectedOption.value === "NULL_VALUE_PLACEHOLDER") {
        onChange(null);
        console.log(`[Combobox] Calling onChange with null`);
      } else {
        onChange(newSelectedOption.value);
        console.log(`[Combobox] Calling onChange with value: ${newSelectedOption.value}`);
      }
    } else {
      console.warn(`[Combobox] newSelectedOption not found for selectedValueString: ${selectedValueString}`);
      // Fallback or error, perhaps call onChange with null or current value
      onChange(null); // Or perhaps don't change if not found
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
        <Command onValueChange={handleValueChange}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allOptions.map((option) => (
                <CommandItem
                  key={String(option.value) === "NULL_VALUE_PLACEHOLDER" ? "null-option-key" : String(option.value)}
                  value={String(option.value)} // This value is passed to Command's onValueChange
                  // onSelect prop removed from CommandItem
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      ( (value === null || value === "NULL_VALUE_PLACEHOLDER") && option.value === "NULL_VALUE_PLACEHOLDER" ) ||
                      (value !== null && value !== "NULL_VALUE_PLACEHOLDER" && String(option.value) === String(value))
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
