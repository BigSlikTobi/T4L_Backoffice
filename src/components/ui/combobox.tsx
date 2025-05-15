
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
        // Use a unique string placeholder for the null option's value if actual null is problematic for cmdk keying
        return [{ value: "NULL_VALUE_PLACEHOLDER", label: nullLabel }, ...options];
      }
    }
    return options;
  }, [options, allowNull, nullLabel]);

  const selectedOption = allOptions.find((option) => {
    // Handles actual null or the placeholder for null
    if (value === null || value === "NULL_VALUE_PLACEHOLDER") {
      return option.value === "NULL_VALUE_PLACEHOLDER";
    }
    // Compare potentially different types (e.g. number from state, string from option value if all are stringified)
    // It's safer if option.value and `value` prop are of consistent types.
    // For now, assume they might match or try string comparison if one is string and other is not.
    return String(option.value) === String(value);
  });

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
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allOptions.map((option) => (
                <CommandItem
                  key={String(option.value) === "NULL_VALUE_PLACEHOLDER" ? "null-option-key" : String(option.value)}
                  value={String(option.value)} // Use the actual value (as string) for cmdk
                  onSelect={(selectedValueString) => {
                    const newSelectedOption = allOptions.find(
                      (opt) => String(opt.value) === selectedValueString
                    );

                    if (newSelectedOption) {
                      if (newSelectedOption.value === "NULL_VALUE_PLACEHOLDER") {
                        onChange(null);
                      } else {
                        // Pass the original option.value (could be number or string)
                        onChange(newSelectedOption.value);
                      }
                    } else {
                       // Should not happen if selectedValueString comes from an existing option
                      onChange(null);
                    }
                    setOpen(false);
                  }}
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
