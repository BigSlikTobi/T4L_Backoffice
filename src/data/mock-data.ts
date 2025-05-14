// This file now only exports the TableSchema interface.
// Mock data and fetching functions have been removed as we are integrating with Supabase.

export interface TableSchema {
  name: string;
  columns: string[]; // All column names from the database table
  displayColumns?: string[]; // Optional: subset of columns to display by default in the table view
  // Primary key column name(s) could be added here if needed for more complex operations.
  // For now, we assume 'id' is the primary key.
}
