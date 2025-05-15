
"use client";

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

interface RecordEditorProps {
  record: Record<string, any> | null;
  columns: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRecord: Record<string, any>) => void;
  onFieldChange: (fieldName: string, value: any) => void;
  tableName: string;
  isNewRecord: boolean;
}

export function RecordEditor({
  record,
  columns,
  isOpen,
  onClose,
  onSave,
  onFieldChange,
  tableName,
  isNewRecord
}: RecordEditorProps) {
  if (!record) return null;

  const handleSave = () => {
    onSave(record);
  };

  const getFieldType = (value: any): string => {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'checkbox';
    if (typeof value === 'string' && !isNaN(Date.parse(value)) && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return 'datetime-local';
    }
    return 'text';
  }
  
  const formatFieldValue = (value: any, type: string): string => {
    if (type === 'datetime-local' && value) {
      try {
        return new Date(value).toISOString().slice(0, 16);
      } catch (e) {
        return String(value); 
      }
    }
    return String(value ?? '');
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isNewRecord ? "Create New Record" : `Edit Record (ID: ${record.id || 'N/A'})`}
          </DialogTitle>
          <DialogDescription>
            {isNewRecord 
              ? `Enter details for the new record in the '${tableName}' table.`
              : `Make changes to this record from the '${tableName}' table. Click save when you're done.`}
            {!isNewRecord && " Fields like 'id' and timestamps are typically read-only."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6"> 
          <div className="grid gap-4 py-4">
            {columns.map((col) => {
              // For new records, 'id' might not be in 'record' if scaffolded out, or we show it as auto-generated.
              // Existing logic mostly handles 'id' for edits.
              const isIdField = col.toLowerCase() === 'id';
              const isTimestampField = col.toLowerCase().endsWith('_at');
              
              // For new records, 'id' is auto-generated and should not be user-editable.
              // Timestamps are also usually auto-managed.
              const isReadOnly = (!isNewRecord && (isIdField || isTimestampField)) || (isNewRecord && (isIdField || isTimestampField));


              if (isNewRecord && isIdField) {
                // For new records, show 'id' as auto-generated and disabled.
                // This assumes 'id' might still be in the columns list for consistency,
                // but the `editingRecord` scaffold in page.tsx should omit 'id' initially for new records.
                // If 'id' is not in `record` (because it was omitted from scaffold), this block won't render.
                if (!Object.prototype.hasOwnProperty.call(record, col) && isIdField) {
                   return (
                    <div key={col} className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={col} className="text-right capitalize">
                        {col.replace(/_/g, ' ')}
                      </Label>
                      <Input
                        id={col}
                        value="Auto-generated"
                        className="col-span-3"
                        disabled
                        aria-readonly
                      />
                    </div>
                  );
                }
                 // If `id` *is* in the record for some reason (e.g. from columns prop), still make it read-only
                 return (
                    <div key={col} className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={col} className="text-right capitalize">
                        {col.replace(/_/g, ' ')}
                        </Label>
                        <Input
                        id={col}
                        value={record[col] ?? "Auto-generated"} // Use record[col] if present, else "Auto-generated"
                        className="col-span-3"
                        disabled
                        aria-readonly
                        />
                    </div>
                 );
              }
              
              const fieldType = getFieldType(record[col]);
              
              return (
                <div key={col} className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={col} className="text-right capitalize">
                    {col.replace(/_/g, ' ')}
                  </Label>
                  <Input
                    id={col}
                    type={fieldType}
                    value={formatFieldValue(record[col], fieldType)}
                    onChange={(e) => onFieldChange(col, e.target.value)}
                    className="col-span-3"
                    disabled={isReadOnly}
                    aria-readonly={isReadOnly}
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
