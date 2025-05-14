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
}

export function RecordEditor({
  record,
  columns,
  isOpen,
  onClose,
  onSave,
  onFieldChange,
  tableName
}: RecordEditorProps) {
  if (!record) return null;

  const handleSave = () => {
    onSave(record);
  };

  const getFieldType = (value: any): string => {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'checkbox'; // Though we use input, good to know
    // Attempt to parse date
    if (typeof value === 'string' && !isNaN(Date.parse(value)) && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
         // Check if it looks like an ISO string, could be refined
        return 'datetime-local';
    }
    return 'text';
  }
  
  const formatFieldValue = (value: any, type: string): string => {
    if (type === 'datetime-local' && value) {
      try {
        // Assuming value is an ISO string like "2023-01-15T10:00:00Z"
        // datetime-local input needs "YYYY-MM-DDTHH:mm"
        return new Date(value).toISOString().slice(0, 16);
      } catch (e) {
        return String(value); // fallback
      }
    }
    return String(value ?? '');
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Record (ID: {record.id})</DialogTitle>
          <DialogDescription>
            Make changes to this record from the '{tableName}' table. Click save when you're done.
            Fields like 'id' and timestamps are typically read-only.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6"> {/* Added pr for scrollbar space */}
          <div className="grid gap-4 py-4">
            {columns.map((col) => {
              const fieldType = getFieldType(record[col]);
              const isReadOnly = col === 'id' || col.endsWith('_at') || col.endsWith('_id'); // Common read-only fields
              
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
          <Button variant="success" onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
