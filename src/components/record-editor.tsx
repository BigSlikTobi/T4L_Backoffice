
"use client";

import * as React from "react";
import type { SupabaseClient } from '@supabase/supabase-js';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { TableSchema, ColumnDetail } from "@/data/mock-data"; // Using ColumnDetail now

interface RecordEditorProps {
  record: Record<string, any> | null;
  tableSchema: TableSchema; // Pass the full schema, which includes ColumnDetail[]
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRecord: Record<string, any>) => void;
  onFieldChange: (fieldName: string, value: any) => void;
  tableName: string;
  isNewRecord: boolean;
  supabaseClient: SupabaseClient; // For fetching FK options
}

interface FkOption {
  value: string | number;
  label: string;
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
  const [fkOptions, setFkOptions] = React.useState<Record<string, FkOption[]>>({});
  const [fkLoading, setFkLoading] = React.useState<Record<string, boolean>>({});

  const columns = tableSchema.columns;

  React.useEffect(() => {
    if (!isOpen || !columns) return;

    const fetchFkData = async () => {
      for (const col of columns) {
        if (col.foreign_key_table && col.foreign_key_column) {
          setFkLoading(prev => ({ ...prev, [col.column_name]: true }));
          try {
            // Attempt to find a good display column: 'name', 'title', 'label', then the FK column itself as fallback
            const displayColumnCandidates = ['name', 'title', 'label', 'description'];
            let selectQuery = `${col.foreign_key_column} as value`;
            let displayColumn = col.foreign_key_column; // Fallback display

            // Check if common display columns exist in the foreign table
            // This is a simplified check; ideally, the foreign table's schema would be available
            // For now, we just try to query them. If it fails, Supabase error will be caught.
            
            // To robustly check for display columns, we would need another RPC or fetch schema of foreign table.
            // Simple approach: try to fetch 'name', if it fails, it won't be used.
            // A more advanced version could query information_schema for the foreign table's columns.
            // For this iteration, we'll try fetching 'name', and if not explicitly errors, we use it.
            // If 'name' column doesn't exist, Supabase *should* error out, or return only 'value'.

            let fetchedSuccessfullyWithDisplayName = false;
            for (const candidate of displayColumnCandidates) {
                if (candidate === col.foreign_key_column) continue; // Already fetching this as 'value'
                try {
                    const { data, error } = await supabaseClient
                        .from(col.foreign_key_table)
                        .select(`${col.foreign_key_column} as value, ${candidate} as label`)
                        .limit(200); // Limit for dropdowns
                    if (error) throw error;
                    if (data && data.length > 0 && data[0].label !== undefined) {
                        selectQuery = `${col.foreign_key_column} as value, ${candidate} as label`;
                        displayColumn = candidate;
                        fetchedSuccessfullyWithDisplayName = true;
                        break;
                    }
                } catch (e) {
                    // console.warn(`Could not use '${candidate}' as display column for ${col.foreign_key_table}.${col.column_name}`);
                }
            }
             if (!fetchedSuccessfullyWithDisplayName) {
                // Fallback to just using the ID as label if no good display name was found
                 selectQuery = `${col.foreign_key_column} as value, ${col.foreign_key_column} as label`;
             }


            const { data, error } = await supabaseClient
              .from(col.foreign_key_table)
              .select(selectQuery)
              .limit(200); // Sensible limit for dropdown options

            if (error) {
              console.error(`Failed to fetch FK options for ${col.column_name} from ${col.foreign_key_table}:`, error);
              setFkOptions(prev => ({ ...prev, [col.column_name]: [] }));
            } else {
              setFkOptions(prev => ({ ...prev, [col.column_name]: data as FkOption[] || [] }));
            }
          } catch (error) {
            console.error(`Error processing FK options for ${col.column_name}:`, error);
            setFkOptions(prev => ({ ...prev, [col.column_name]: [] }));
          } finally {
            setFkLoading(prev => ({ ...prev, [col.column_name]: false }));
          }
        }
      }
    };
    fetchFkData();
  }, [isOpen, columns, supabaseClient]);


  if (!record) return null;

  const handleSave = () => {
    onSave(record);
  };

  const getFieldType = (column: ColumnDetail): string => {
    // Basic type detection, can be expanded
    const dataType = column.data_type.toLowerCase();
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'datetime-local';
    if (dataType.includes('bool')) return 'checkbox'; // Assuming 'checkbox' handles boolean
    if (dataType.includes('int') || dataType.includes('numeric') || dataType.includes('decimal') || dataType.includes('real') || dataType.includes('double')) return 'number';
    return 'text';
  }
  
  const formatFieldValue = (value: any, type: string): string => {
    if (type === 'datetime-local' && value) {
      try {
        // Ensure it's a valid date before formatting
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value); // Return original if invalid date
        return date.toISOString().slice(0, 16);
      } catch (e) {
        return String(value); 
      }
    }
     if (value === null || value === undefined) return '';
    return String(value);
  }

  const getColumnLabel = (columnName: string): string => {
    return columnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isNewRecord ? "Create New Record" : `Edit Record`} {/* ID might not be available or reliable here if composite */}
          </DialogTitle>
          <DialogDescription>
            {isNewRecord 
              ? `Enter details for the new record in the '${tableName}' table.`
              : `Make changes to this record from the '${tableName}' table. Click save when you're done.`}
            {" Primary keys and auto-managed timestamps are typically read-only."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6"> 
          <div className="grid gap-4 py-4">
            {columns.map((col) => {
              const colName = col.column_name;
              const isAutoManagedTimestamp = colName.toLowerCase().endsWith('_at') && 
                                           (col.data_type.includes('timestamp') || col.data_type.includes('timestamptz'));
              
              const isReadOnly = (col.is_primary_key && !isNewRecord) || // PKs on existing records
                                 (col.is_primary_key && isNewRecord && col.data_type.toLowerCase() === 'uuid') || // Auto-gen UUID PKs on new
                                 isAutoManagedTimestamp; // created_at, updated_at

              if (isNewRecord && col.is_primary_key && col.data_type.toLowerCase() !== 'uuid') {
                // If PK is not auto-gen UUID for new record, it might be user-supplied (e.g. email as PK)
                // or a serial that will be generated by DB. For now, allow input if not UUID.
                // This logic can be refined based on specific PK strategies.
              }
               if (isNewRecord && col.is_primary_key && col.data_type.toLowerCase() === 'uuid') {
                 return (
                    <div key={colName} className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={colName} className="text-right">
                        {getColumnLabel(colName)}
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


              if (col.foreign_key_table && col.foreign_key_column) {
                return (
                  <div key={colName} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={colName} className="text-right">
                      {getColumnLabel(colName)}
                    </Label>
                    {fkLoading[colName] ? (
                      <Skeleton className="h-10 w-full col-span-3" />
                    ) : (
                      <Select
                        value={record[colName] !== null && record[colName] !== undefined ? String(record[colName]) : ""}
                        onValueChange={(value) => onFieldChange(colName, value === "NULL_VALUE_PLACEHOLDER" ? null : value)} // Handle explicit null option
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder={`Select ${getColumnLabel(col.foreign_key_table)}...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {col.is_nullable === 'YES' && (
                            <SelectItem value="NULL_VALUE_PLACEHOLDER">-- None --</SelectItem>
                          )}
                          {(fkOptions[colName] || []).map(option => (
                            <SelectItem key={option.value} value={String(option.value)}>
                              {option.label} {option.value !== option.label ? `(${option.value})` : ''}
                            </SelectItem>
                          ))}
                           {(!fkOptions[colName] || fkOptions[colName].length === 0) && col.is_nullable !== 'YES' && (
                            <SelectItem value="" disabled>No options found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              }
              
              const fieldType = getFieldType(col);
              
              return (
                <div key={colName} className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={colName} className="text-right">
                    {getColumnLabel(colName)}
                  </Label>
                  <Input
                    id={colName}
                    type={fieldType}
                    value={formatFieldValue(record[colName], fieldType)}
                    onChange={(e) => onFieldChange(colName, e.target.valueAsNumber && fieldType === 'number' ? e.target.valueAsNumber : e.target.value)}
                    className="col-span-3"
                    disabled={isReadOnly}
                    aria-readonly={isReadOnly}
                    placeholder={col.is_nullable === 'YES' ? 'Optional' : ''}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button variant="success" onClick={handleSave}>
            {isNewRecord ? "Create Record" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
