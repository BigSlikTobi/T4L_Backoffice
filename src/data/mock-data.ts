// This file now only exports the TableSchema interface and related types.
// Mock data and fetching functions have been removed as we are integrating with Supabase.

export interface ColumnDetail {
  column_name: string;
  data_type: string;
  ordinal_position: number;
  is_nullable: 'YES' | 'NO'; // Supabase information_schema typically returns 'YES' or 'NO'
  is_primary_key: boolean;
  foreign_key_table: string | null;   // Name of the table this column references
  foreign_key_column: string | null;  // Name of the column in the foreign_key_table
}

export interface TableSchema {
  name: string;
  columns: ColumnDetail[]; // All column details from the database table
  displayColumns?: string[]; // Optional: subset of column names to display by default in the table view
}
