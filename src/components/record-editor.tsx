"use client";

import * as React from "react";
import type { SupabaseClient } from '@supabase/supabase-js';
import { getDisplayColumns, getPrimaryKeyColumn } from '@/lib/fkUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import type { TableSchema, ColumnDetail } from "@/data/mock-data"; 

interface RecordEditorProps {
  record: Record<string, any> | null;
  tableSchema: TableSchema; 
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRecord: Record<string, any>) => void;
  onFieldChange: (fieldName: string, value: any) => void;
  tableName: string;
  isNewRecord: boolean;
  supabaseClient: SupabaseClient; // Keep for potential future use, not strictly needed for this simplified version
}

export function RecordEditor({
  record,
  tableSchema,
  isOpen,
  onClose,
  onSave,
  onFieldChange,
  tableName,
  isNewRecord,
  supabaseClient
}: RecordEditorProps) {

  const [fkOptions, setFkOptions] = React.useState<Record<string, ComboboxOption[]>>({});
  const [fkLoading, setFkLoading] = React.useState<Record<string, boolean>>({});
  const [fkDisplayColumns, setFkDisplayColumns] = React.useState<Record<string, string[]>>({});
  const [isFullScreen, setIsFullScreen] = React.useState(false); // Full screen state

  React.useEffect(() => {
    if (isOpen && tableSchema && tableSchema.columns) {
      console.log(`[RecordEditor] Received columns for table '${tableSchema.name}':`, JSON.stringify(tableSchema.columns, null, 2));
      
      // Get foreign key columns
      const fkColumns = tableSchema.columns.filter(col => col.foreign_key_table && col.foreign_key_column);
      console.log(`[RecordEditor] Found ${fkColumns.length} foreign key columns:`, fkColumns);
      
      // Initialize loading state for all FK columns
      const initialLoadingState: Record<string, boolean> = {};
      fkColumns.forEach(col => {
        initialLoadingState[col.column_name] = true;
      });
      
      if (fkColumns.length > 0) {
        setFkLoading(initialLoadingState);
        
        // Fetch options for each FK column
        fkColumns.forEach(async col => {
          if (col.foreign_key_table && col.foreign_key_column) {
            await fetchForeignKeyOptions(col.column_name, col.foreign_key_table, col.foreign_key_column);
          }
        });
      }
    }
  }, [isOpen, tableSchema, supabaseClient]);
  
  // Helper: pick display columns for FK dropdowns (client-safe)
  const guessDisplayColumns = (columns: string[], fkCol: string) => {
    const preferred = ['name', 'title', 'code', 'label', 'city', 'email'];
    const result = [fkCol];
    for (const pref of preferred) {
      const found = columns.find(c => c !== fkCol && c.toLowerCase().includes(pref));
      if (found && !result.includes(found)) result.push(found);
    }
    // Fallback: add the first non-FK column if nothing else
    if (result.length === 1 && columns.length > 1) {
      const fallback = columns.find(c => c !== fkCol);
      if (fallback) result.push(fallback);
    }
    return result;
  };

  const fetchForeignKeyOptions = async (columnName: string, foreignTable: string, foreignColumn: string) => {
    try {
      // Fetch a single row to get column names
      const probe = await supabaseClient.from(foreignTable).select('*').limit(1);
      if (probe.error || !probe.data || probe.data.length === 0) {
        setFkLoading(prev => ({ ...prev, [columnName]: false }));
        return;
      }
      const allColumns = Object.keys(probe.data[0]);
      const displayCols = guessDisplayColumns(allColumns, foreignColumn);
      setFkDisplayColumns(prev => ({ ...prev, [columnName]: displayCols }));
      // Fetch up to 100 rows for dropdown
      const { data, error } = await supabaseClient
        .from(foreignTable)
        .select(displayCols.join(','))
        .limit(100);
      if (error) {
        setFkLoading(prev => ({ ...prev, [columnName]: false }));
        return;
      }
      const options: ComboboxOption[] = (data || []).map((item: Record<string, any>) => {
        const primaryValue = item[foreignColumn];
        const label = displayCols.map(col => item[col]).filter(Boolean).join(' | ');
        return { value: primaryValue, label };
      });
      setFkOptions(prev => ({ ...prev, [columnName]: options }));
    } catch (err) {
      setFkLoading(prev => ({ ...prev, [columnName]: false }));
    } finally {
      setFkLoading(prev => ({ ...prev, [columnName]: false }));
    }
  };

  if (!record) return null;

  const handleSave = () => {
    onSave(record);
  };

  const getFieldType = (column: ColumnDetail): string => {
    const dataType = column.data_type.toLowerCase();
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'datetime-local';
    if (dataType.includes('bool')) return 'checkbox'; 
    if (dataType.includes('int') || dataType.includes('numeric') || dataType.includes('decimal') || dataType.includes('real') || dataType.includes('double') || dataType.includes('bigint')) return 'number';
    // Determine if field should be a textarea instead of a regular text input
    if ((dataType.includes('text') || dataType.includes('varchar') || dataType.includes('char')) && 
        (column.column_name.toLowerCase().includes('description') || 
         column.column_name.toLowerCase().includes('content') ||
         column.column_name.toLowerCase().includes('notes') ||
         column.column_name.toLowerCase().includes('comment') ||
         column.column_name.toLowerCase().includes('detail'))) {
      return 'textarea';
    }
    return 'text';
  }
  
  const formatFieldValue = (value: any, type: string): string => {
    if (type === 'datetime-local' && value) {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value); 
        return date.toISOString().slice(0, 16);
      } catch (e) {
        return String(value); 
      }
    }
     if (value === null || value === undefined) return '';
    return String(value);
  }

  const getColumnLabel = (column: ColumnDetail): string => {
    let label = column.column_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (column.foreign_key_table) {
      label += ` (FK to ${column.foreign_key_table}.${column.foreign_key_column})`;
    }
    return label;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div
        className={isFullScreen ? 'fixed inset-0 z-50' : ''}
        style={isFullScreen ? {margin: 0, padding: 0} : {}}
      >
        <DialogContent 
          className={ 
            `${isFullScreen 
              ? 'w-screen h-screen max-w-none max-h-none rounded-none flex flex-col bg-teal-900 text-teal-50 shadow-xl' 
              : 'sm:max-w-[800px] md:max-w-[900px] lg:max-w-[1000px] max-h-[85vh] flex flex-col'} `
          }
          style={isFullScreen ? {padding: 0, backgroundColor: undefined} : {}}
        >
          <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
            <div>
              <DialogTitle>
                {isNewRecord ? "Create New Record" : `Edit Record`} 
              </DialogTitle>
              <DialogDescription className={isFullScreen ? 'text-teal-300' : ''}>
                {isNewRecord 
                  ? `Enter details for the new record in the '${tableName}' table.`
                  : `Make changes to this record from the '${tableName}' table. Click save when you're done.`}
                {" Primary keys and auto-managed timestamps are typically read-only."}
              </DialogDescription>
            </div>
            <button
              type="button"
              className="ml-4 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-medium border border-gray-300"
              aria-label={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              onClick={() => setIsFullScreen(f => !f)}
            >
              {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            </button>
          </DialogHeader>
          <ScrollArea className={`flex-grow ${isFullScreen ? 'px-6 pb-6' : 'pr-6 -mr-6'}`}> 
            <div className="grid gap-4 py-4">
              {tableSchema.columns.map((col) => {
                const colName = col.column_name;
                const isAutoManagedTimestamp = colName.toLowerCase().endsWith('_at') && 
                                             (col.data_type.includes('timestamp') || col.data_type.includes('timestamptz'));
                
                const isReadOnly = (col.is_primary_key && !isNewRecord) || 
                                   (col.is_primary_key && isNewRecord && col.data_type.toLowerCase() === 'uuid') || 
                                   isAutoManagedTimestamp; 

                if (isNewRecord && col.is_primary_key && col.data_type.toLowerCase() === 'uuid') {
                   return (
                      <div key={colName} className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor={colName} className="text-right">
                          {getColumnLabel(col)}
                          </Label>
                          <Input
                          id={colName}
                          value="Auto-generated (UUID)"
                          className="col-span-3"
                          disabled
                          aria-readonly
                          />
                      </div>
                   );
                 }

                // Determine if it's a foreign key field
                const isForeignKey = Boolean(col.foreign_key_table && col.foreign_key_column);
                
                // Get field type and determine if it should be a textarea (if it's not a foreign key)
                const fieldType = getFieldType(col);
                const isTextareaField = fieldType === 'textarea' && !isForeignKey;
                
                return (
                  <div key={colName} className={`grid grid-cols-4 ${isTextareaField ? 'items-start' : 'items-center'} gap-4`}>
                    <Label htmlFor={colName} className="text-right pt-2">
                      {getColumnLabel(col)}
                    </Label>
                    
                    {/* Show Dropdown for Foreign Keys */}
                    {isForeignKey ? (
                      fkLoading[colName] ? (
                        <Skeleton className="col-span-3 h-10" />
                      ) : (
                        <Combobox 
                          options={fkOptions[colName] || []}
                          value={record[colName]}
                          onChange={(value) => onFieldChange(colName, value)}
                          placeholder={`Select ${col.foreign_key_table}`}
                          disabled={isReadOnly}
                          allowNull={col.is_nullable === 'YES'}
                          triggerClassName="col-span-3 h-10"
                        />
                      )
                    ) : isTextareaField ? (
                      <Textarea
                        id={colName}
                        value={formatFieldValue(record[colName], 'text')}
                        onChange={(e) => onFieldChange(colName, e.target.value)}
                        className="col-span-3"
                        disabled={isReadOnly}
                        aria-readonly={isReadOnly}
                        placeholder={col.is_nullable === 'YES' ? 'Optional' : ''}
                      />
                    ) : (
                      <Input
                        id={colName}
                        type={fieldType}
                        value={formatFieldValue(record[colName], fieldType)}
                        onChange={(e) => {
                            let val: string | number | null = e.target.value;
                            if (fieldType === 'number') {
                               if (e.target.value === '') { // Allow clearing number field to null if nullable
                                 val = col.is_nullable === 'YES' ? null : 0; // Or some default if not nullable
                               } else {
                                 const num = parseFloat(e.target.value);
                                 val = isNaN(num) ? e.target.value : num; // Keep as string if not a valid number
                               }
                            }
                            onFieldChange(colName, val);
                        }}
                        className="col-span-3 py-2 h-10" // Increased height for better visibility
                        disabled={isReadOnly}
                        aria-readonly={isReadOnly}
                        placeholder={col.is_nullable === 'YES' ? 'Optional' : (fieldType === 'number' ? '0' : '')}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter className={`pt-4 border-t ${isFullScreen ? 'px-6 pb-6' : ''}`}>
            <DialogClose asChild>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </DialogClose>
            <Button variant="success" onClick={handleSave}>
              {isNewRecord ? "Create Record" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </div>
    </Dialog>
  );
}
