
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
// Removed Skeleton and Combobox imports as they are no longer used for FKs
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
  supabaseClient // Keep for potential future use
}: RecordEditorProps) {

  // Removed useEffect for fetching FK options and related state (fkOptions, fkLoading)

  React.useEffect(() => {
    if (isOpen && tableSchema && tableSchema.columns) {
      console.log(`[RecordEditor] Received columns for table '${tableSchema.name}':`, JSON.stringify(tableSchema.columns, null, 2));
    }
  }, [isOpen, tableSchema]);


  if (!record) return null;

  const handleSave = () => {
    onSave(record);
  };

  const getFieldType = (column: ColumnDetail): string => {
    const dataType = column.data_type.toLowerCase();
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'datetime-local';
    if (dataType.includes('bool')) return 'checkbox'; 
    if (dataType.includes('int') || dataType.includes('numeric') || dataType.includes('decimal') || dataType.includes('real') || dataType.includes('double') || dataType.includes('bigint')) return 'number';
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isNewRecord ? "Create New Record" : `Edit Record`} 
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

              // Reverted to standard Input for all fields, including FKs
              const fieldType = getFieldType(col);
              
              return (
                <div key={colName} className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={colName} className="text-right">
                    {getColumnLabel(col)}
                  </Label>
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
                    className="col-span-3"
                    disabled={isReadOnly}
                    aria-readonly={isReadOnly}
                    placeholder={col.is_nullable === 'YES' ? 'Optional' : (fieldType === 'number' ? '0' : '')}
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
