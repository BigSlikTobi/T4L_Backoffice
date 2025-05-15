
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
  supabaseClient: SupabaseClient; 
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
    // Diagnostic log: Display the columns array received by the RecordEditor
    console.log("[RecordEditor] Received columns:", JSON.stringify(columns, null, 2));

    if (!isOpen || !columns) {
      console.log("[RecordEditor] useEffect skipped: isOpen is false or columns are not defined.");
      return;
    }

    const fetchFkData = async () => {
      for (const col of columns) {
        if (col.foreign_key_table && col.foreign_key_column) {
          console.log(`[RecordEditor] Processing FK: ${col.column_name} -> ${col.foreign_key_table}(${col.foreign_key_column})`);
          setFkLoading(prev => ({ ...prev, [col.column_name]: true }));
          try {
            const displayColumnCandidates = ['name', 'title', 'label', 'description'];
            let selectQuery = ""; 
            let fetchedSuccessfullyWithDisplayName = false;

            for (const candidate of displayColumnCandidates) {
              if (candidate === col.foreign_key_column) continue; 
              try {
                console.log(`[RecordEditor] Attempting to use candidate display column '${candidate}' for FK '${col.column_name}' on table '${col.foreign_key_table}'.`);
                const { data: testData, error: testError } = await supabaseClient
                  .from(col.foreign_key_table)
                  .select(`${col.foreign_key_column}, ${candidate}`) 
                  .limit(1); 

                if (testError) {
                  console.warn(`[RecordEditor] Test query for candidate '${candidate}' for FK '${col.column_name}' on table '${col.foreign_key_table}' failed: ${testError.message}`);
                  continue; 
                }

                if (testData && testData.length > 0 && testData[0] && 
                    (testData[0][candidate] !== null && testData[0][candidate] !== undefined && String(testData[0][candidate]).trim() !== '')) {
                  selectQuery = `${col.foreign_key_column} as value, ${candidate} as label`;
                  fetchedSuccessfullyWithDisplayName = true;
                  console.log(`[RecordEditor] Successfully selected '${candidate}' as display column for FK '${col.column_name}' referencing '${col.foreign_key_table}'.`);
                  break; 
                } else {
                  console.warn(`[RecordEditor] Candidate column '${candidate}' for FK '${col.column_name}' on table '${col.foreign_key_table}' exists but returned null, undefined, or empty for the test row.`);
                }
              } catch (e: any) {
                console.warn(
                  `[RecordEditor] Error during attempt to validate candidate '${candidate}' for FK '${col.column_name}' on table '${col.foreign_key_table}'. Error: ${e.message || JSON.stringify(e)}`
                );
              }
            }
            
            if (!fetchedSuccessfullyWithDisplayName) {
              selectQuery = `${col.foreign_key_column} as value, ${col.foreign_key_column} as label`;
              console.log(
                `[RecordEditor] Falling back to ID ('${col.foreign_key_column}') as display column for FK '${col.column_name}' referencing '${col.foreign_key_table}'. Tried candidates: ${displayColumnCandidates.join(', ')}.`
              );
            }

            const { data, error } = await supabaseClient
              .from(col.foreign_key_table)
              .select(selectQuery) 
              .limit(200); 

            if (error) {
              console.error(`[RecordEditor] Failed to fetch FK options for '${col.column_name}' from '${col.foreign_key_table}' using query "${selectQuery}": ${error.message}`);
              setFkOptions(prev => ({ ...prev, [col.column_name]: [] }));
            } else {
              console.log(`[RecordEditor] Fetched ${data?.length || 0} options for FK '${col.column_name}'.`);
              setFkOptions(prev => ({ ...prev, [col.column_name]: data as FkOption[] || [] }));
            }
          } catch (error: any) { 
            console.error(`[RecordEditor] Outer error processing FK options for column '${col.column_name}': ${error.message || JSON.stringify(error)}`);
            setFkOptions(prev => ({ ...prev, [col.column_name]: [] }));
          } finally {
            setFkLoading(prev => ({ ...prev, [col.column_name]: false }));
          }
        } else {
          // console.log(`[RecordEditor] Column '${col.column_name}' is not a foreign key or FK info is missing.`);
        }
      }
    };
    fetchFkData();
  }, [isOpen, columns, supabaseClient, tableSchema.name]);


  if (!record) return null;

  const handleSave = () => {
    onSave(record);
  };

  const getFieldType = (column: ColumnDetail): string => {
    const dataType = column.data_type.toLowerCase();
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'datetime-local';
    if (dataType.includes('bool')) return 'checkbox'; 
    if (dataType.includes('int') || dataType.includes('numeric') || dataType.includes('decimal') || dataType.includes('real') || dataType.includes('double')) return 'number';
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

  const getColumnLabel = (columnName: string): string => {
    return columnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
            {columns.map((col) => {
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
                        onValueChange={(value) => onFieldChange(colName, value === "NULL_VALUE_PLACEHOLDER" ? null : value)} 
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
                              {option.label} {String(option.value) !== String(option.label) ? `(${option.value})` : ''}
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

