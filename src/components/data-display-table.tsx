"use client";

import * as React from "react";
import { useState } from "react"; 
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit3, X, Eye, EyeOff, Settings, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface DataDisplayTableProps {
  data: Record<string, any>[];
  columns: string[];
  onSelectRecord: (record: Record<string, any>) => void;
  tableName: string;
}

export function DataDisplayTable({ data, columns, onSelectRecord, tableName }: DataDisplayTableProps) {
  // State to keep track of hidden columns
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  // State for sorting
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'ascending' | 'descending' | null;
  }>({
    key: null,
    direction: null
  });
  
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground italic text-center py-8">No data matching your criteria in table <span className="font-semibold">{tableName}</span>.</p>;
  }
  
  const MAX_CELL_LENGTH = 50;

  // Detect all available columns from the data
  const allColumns = React.useMemo(() => {
    // Start with the columns passed as props
    const providedColumns = new Set(columns);
    
    // Add any additional columns from the actual data
    if (data && data.length > 0) {
      data.forEach(row => {
        Object.keys(row).forEach(key => {
          providedColumns.add(key);
        });
      });
    }
    
    return Array.from(providedColumns);
  }, [data, columns]);

  const truncateText = (text: string) => {
    if (text && text.length > MAX_CELL_LENGTH) {
      return text.substring(0, MAX_CELL_LENGTH) + "...";
    }
    return text;
  };

  // Get visible columns by removing hidden ones from all columns
  const visibleColumns = allColumns.filter(col => !hiddenColumns.includes(col));
  
  // Sort data based on current sort configuration
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data; // Return unsorted data if no sort config
    }
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as string];
      const bValue = b[sortConfig.key as string];
      
      // Handle undefined, null, or empty values
      if (aValue === undefined || aValue === null || aValue === '') {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (bValue === undefined || bValue === null || bValue === '') {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'ascending' 
          ? aValue - bValue 
          : bValue - aValue;
      }
      
      // Handle date strings (ISO format)
      if (
        typeof aValue === 'string' && 
        typeof bValue === 'string' &&
        !isNaN(Date.parse(aValue)) && 
        !isNaN(Date.parse(bValue))
      ) {
        return sortConfig.direction === 'ascending'
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }
      
      // Default string comparison
      const strA = String(aValue).toLowerCase();
      const strB = String(bValue).toLowerCase();
      
      if (strA < strB) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (strA > strB) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);
  
  // Handle column header click for sorting
  const handleHeaderClick = (column: string) => {
    // Toggle between ascending, descending, and unsorted
    let direction: 'ascending' | 'descending' | null = 'ascending';
    
    if (sortConfig.key === column && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === column && sortConfig.direction === 'descending') {
      direction = null;
    }
    
    setSortConfig({
      key: direction ? column : null,
      direction: direction
    });
  };

  // Toggle column visibility
  const toggleColumnVisibility = (column: string) => {
    if (hiddenColumns.includes(column)) {
      setHiddenColumns(hiddenColumns.filter(col => col !== column));
    } else {
      setHiddenColumns([...hiddenColumns, column]);
    }
  };

  // Show all columns
  const showAllColumns = () => {
    setHiddenColumns([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Visible columns: {visibleColumns.length}/{allColumns.length}</span>
          {hiddenColumns.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={showAllColumns}
              className="h-7 px-2 text-xs"
            >
              Show all
            </Button>
          )}
        </div>
        
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Column settings</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Configure visible columns</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenuContent align="end" className="max-h-[60vh] overflow-y-auto">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allColumns.map(column => (
              <DropdownMenuItem 
                key={column} 
                onClick={(e) => {
                  e.preventDefault();
                  toggleColumnVisibility(column);
                }}
                className="flex items-center justify-between"
              >
                <span>{column}</span>
                {hiddenColumns.includes(column) ? (
                  <EyeOff className="h-4 w-4 ml-2 opacity-50" />
                ) : (
                  <Eye className="h-4 w-4 ml-2" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {hiddenColumns.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-sm text-muted-foreground">Hidden:</span>
          {hiddenColumns.map(column => (
            <Badge key={column} variant="outline" className="flex items-center gap-1 text-xs">
              {column}
              <button 
                onClick={() => toggleColumnVisibility(column)}
                className="ml-1 rounded-full hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Show {column}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      <div className="rounded-md border shadow-sm">
        <div className="w-full overflow-auto"> {/* This enables horizontal scrolling */}
          <Table>
            <TableCaption>
              Displaying records from the '{tableName}' table. {data.length === 0 ? "No records match your current search." : "Click edit to modify a record."}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                {visibleColumns.map((col) => (
                  <TableHead 
                    key={col} 
                    className="whitespace-nowrap cursor-pointer select-none hover:bg-muted/50 transition-colors" 
                    onClick={() => handleHeaderClick(col)}
                  >
                    <div className="flex items-center gap-1 justify-between">
                      <span>{col}</span>
                      {sortConfig.key === col ? (
                        sortConfig.direction === 'ascending' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-20" />
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-right whitespace-nowrap sticky right-0 bg-card">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row, rowIndex) => (
                <TableRow key={row.id || rowIndex} className="hover:bg-muted/50">
                  {visibleColumns.map((col) => (
                    <TableCell key={`${col}-${row.id || rowIndex}`}>
                      {truncateText(String(row[col] === null || row[col] === undefined ? '' : row[col]))}
                    </TableCell>
                  ))}
                  <TableCell className="text-right sticky right-0 bg-background hover:bg-muted/50">
                    <Button variant="ghost" size="icon" onClick={() => onSelectRecord(row)} aria-label={`Edit record ${row.id || rowIndex}`}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
