"use client";

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
import { Edit3 } from "lucide-react";

interface DataDisplayTableProps {
  data: Record<string, any>[];
  columns: string[];
  onSelectRecord: (record: Record<string, any>) => void;
  tableName: string;
}

export function DataDisplayTable({ data, columns, onSelectRecord, tableName }: DataDisplayTableProps) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground italic text-center py-8">No data available for table <span className="font-semibold">{tableName}</span>.</p>;
  }
  
  const MAX_CELL_LENGTH = 50;

  const truncateText = (text: string) => {
    if (text && text.length > MAX_CELL_LENGTH) {
      return text.substring(0, MAX_CELL_LENGTH) + "...";
    }
    return text;
  };

  return (
    <div className="rounded-md border shadow-sm overflow-hidden">
      <Table>
        <TableCaption>A list of records from the '{tableName}' table. Click edit to modify a record.</TableCaption>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
            ))}
            <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={row.id || rowIndex} className="hover:bg-muted/50">
              {columns.map((col) => (
                <TableCell key={`${col}-${row.id || rowIndex}`}>
                  {truncateText(String(row[col] === null || row[col] === undefined ? '' : row[col]))}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onSelectRecord(row)} aria-label={`Edit record ${row.id}`}>
                  <Edit3 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
