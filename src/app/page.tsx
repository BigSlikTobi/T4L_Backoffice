
"use client";

import * as React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { DataDisplayTable } from '@/components/data-display-table';
import { RecordEditor } from '@/components/record-editor';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import type { TableSchema } from '@/data/mock-data'; // Keep TableSchema interface
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function HomePage() {
  const [tables, setTables] = React.useState<TableSchema[]>([]);
  const [isLoadingTables, setIsLoadingTables] = React.useState(true);
  
  const [selectedTableName, setSelectedTableName] = React.useState<string | null>(null);
  const [currentTableSchema, setCurrentTableSchema] = React.useState<TableSchema | null>(null);
  
  const [tableData, setTableData] = React.useState<Record<string, any>[] | null>(null);
  const [isLoadingData, setIsLoadingData] = React.useState(false);
  const [dataError, setDataError] = React.useState<string | null>(null);

  const [selectedRecord, setSelectedRecord] = React.useState<Record<string, any> | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<Record<string, any> | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);

  const { toast } = useToast();

  // Fetch table schemas from Supabase
  const fetchTables = React.useCallback(async () => {
    setIsLoadingTables(true);
    try {
      // Fetch table names from 'public' schema
      const { data: tableNamesData, error: tableNamesError } = await supabase
        .rpc('get_public_tables'); 

      if (tableNamesError) {
        if (typeof tableNamesError === 'object' && tableNamesError !== null && !tableNamesError.message && Object.keys(tableNamesError).length === 0) {
          throw new Error("Failed to fetch table names using 'get_public_tables' RPC. Supabase returned an empty error object. Please check the RPC function's definition, permissions in your Supabase dashboard, and the browser's network tab for server response details.");
        }
        throw tableNamesError; // Re-throw original error if it's not an empty object
      }
      
      let fetchedTables: TableSchema[] = [];

      if (tableNamesData && Array.isArray(tableNamesData)) {
         fetchedTables = await Promise.all(
          tableNamesData.map(async (table: { table_name: string }) => {
            let columns: string[] = [];
            
            // Try to get columns from a sample row first
            const { data: sampleRowData, error: sampleRowError } = await supabase
              .from(table.table_name)
              .select('*')
              .limit(1)
              .maybeSingle();

            // PGRST116: "The result contains 0 rows". This is not an error for schema inference if table is empty.
            if (sampleRowError && sampleRowError.code !== 'PGRST116') { 
              console.warn(`Could not fetch sample row for table ${table.table_name} to infer columns (error code: ${sampleRowError.code}): ${sampleRowError.message || JSON.stringify(sampleRowError)}. Will attempt fallback to RPC.`);
              // Don't throw, allow fallback to RPC
            }
            
            if (sampleRowData && Object.keys(sampleRowData).length > 0) {
              columns = Object.keys(sampleRowData);
            } else {
                // Fallback to RPC if no sample data or if sampleRowError occurred (and wasn't PGRST116 and didn't yield columns)
                const { data: columnData, error: columnErrorRpc } = await supabase
                .rpc('get_table_columns_info', { p_table_name: table.table_name });

                if (columnErrorRpc) {
                    const errorDetail = columnErrorRpc.message || JSON.stringify(columnErrorRpc);
                    const errorMsg = `Failed to get column info for table '${table.table_name}' using 'get_table_columns_info' RPC. Error: ${errorDetail}. Check RPC definition/permissions and Supabase logs.`;
                    console.error(errorMsg, columnErrorRpc); 
                    throw new Error(errorMsg); 
                } else if (columnData && columnData.map((col: { column_name: string }) => col.column_name).length > 0) {
                    columns = columnData.map((col: { column_name: string }) => col.column_name);
                } else {
                    console.warn(`No columns found for table '${table.table_name}' via sample row or 'get_table_columns_info' RPC. The table might be empty, or the RPC returned no column data (which could be valid for empty tables without explicit column definitions in the RPC).`);
                    // Default to ['id'] if no columns could be determined.
                    // This might happen for completely empty tables with no direct column info from RPC.
                }
            }
            
            if (columns.length === 0) {
                console.warn(`Unable to determine columns for table '${table.table_name}'. Defaulting to ['id']. Ensure the table is not empty or the 'get_table_columns_info' RPC can provide column names for empty tables.`);
                columns = ['id']; // Fallback if no columns found by any method
            }
            
            return { name: table.table_name, columns };
          })
        );
      }
      // Filter out any tables that might have ended up null or with no columns after processing
      setTables(fetchedTables.filter(t => t && t.columns && t.columns.length > 0));
    } catch (error: any) {
      console.error("Raw error caught in fetchTables:", error);
      console.error("Type of error in fetchTables:", typeof error, "Is Error instance:", error instanceof Error);

      let detailMessage = "An unknown error occurred while fetching table schemas.";
      if (error && typeof error === 'object') {
        if (error.message && String(error.message).trim() !== "") {
          detailMessage = String(error.message);
          if (error.details) detailMessage += ` Details: ${String(error.details)}`;
          if (error.hint) detailMessage += ` Hint: ${String(error.hint)}`;
          if (error.code) detailMessage += ` Code: ${String(error.code)}`;
        } else {
          let stringifiedError: string | null = null;
          try {
            stringifiedError = JSON.stringify(error);
          } catch (e) { /* Ignore stringify errors */ }

          if (stringifiedError && stringifiedError !== '{}') {
            detailMessage = `Error details: ${stringifiedError}.`;
          } else {
            const keys = Object.keys(error);
            if (keys.length > 0) {
              detailMessage = `Received error object with keys: [${keys.join(', ')}]. Values might be empty or non-stringifiable. Check browser console for the full object.`;
            } else {
              detailMessage = "Received an empty or uninformative error object. This often indicates an issue with the 'get_public_tables' or 'get_table_columns_info' RPC functions (e.g., they don't exist, have permission issues, or an internal error) or a network problem. Please verify these RPC functions in your Supabase dashboard and check the browser's network tab for the exact response from the server.";
            }
          }
        }
      } else if (error !== null && error !== undefined) {
        detailMessage = String(error);
      }
      
      console.error("Processed error details for fetchTables toast:", detailMessage);

      toast({
        variant: "destructive",
        title: "Error Loading Database Tables",
        description: `Failed to load tables: ${detailMessage} Please check the browser console and network tab for more technical information. Ensure your Supabase RPC functions are correctly set up.`,
      });
    } finally {
      setIsLoadingTables(false);
    }
  }, [toast]);


  React.useEffect(() => {
    // Create RPC functions in Supabase SQL editor if they don't exist:
    /*
    -- Function to get table names from public schema
    CREATE OR REPLACE FUNCTION get_public_tables()
    RETURNS TABLE(table_name TEXT) AS $$
    BEGIN
        RETURN QUERY
        SELECT c.relname::text FROM pg_catalog.pg_class c
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r' -- 'r' for ordinary table
          AND n.nspname = 'public' -- Only from public schema
          AND c.relname NOT LIKE 'pg_%' AND c.relname NOT LIKE 'sql_%' -- Exclude system tables
        ORDER BY c.relname;
    END;
    $$ LANGUAGE plpgsql;

    -- Function to get column names for a specific table
    -- This version attempts to return column names even for empty tables by querying information_schema.
    CREATE OR REPLACE FUNCTION get_table_columns_info(p_table_name TEXT)
    RETURNS TABLE(column_name TEXT, data_type TEXT, ordinal_position INTEGER) AS $$
    BEGIN
        RETURN QUERY
        SELECT
            isc.column_name::text,
            isc.data_type::text,
            isc.ordinal_position::integer
        FROM information_schema.columns isc
        WHERE isc.table_schema = 'public'
          AND isc.table_name = p_table_name
        ORDER BY isc.ordinal_position;
    END;
    $$ LANGUAGE plpgsql;
    */
    fetchTables();
  }, [fetchTables]);

  // Fetch data for the selected table
  const fetchTableData = React.useCallback(async (tableName: string) => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        console.error(`Failed to fetch data for table ${tableName}:`, error);
        const errorDetail = error.message || JSON.stringify(error);
        setDataError(`Could not load data for table ${tableName}: ${errorDetail}`);
        toast({
          variant: "destructive",
          title: "Error Loading Data",
          description: `Failed to load data for table '${tableName}': ${errorDetail}`,
        });
        setTableData(null); // Clear previous data on error
        return []; // Return empty array to satisfy type, error is handled
      }
      setTableData(data || []);
      return data || [];
    } catch (e: any) { // Catch any other unexpected errors
        const errorDetail = e.message || JSON.stringify(e);
        setDataError(`An unexpected error occurred while loading data for table ${tableName}: ${errorDetail}`);
        toast({
          variant: "destructive",
          title: "Unexpected Error Loading Data",
          description: `Failed to load data for table '${tableName}': ${errorDetail}`,
        });
        setTableData(null);
        return [];
    } finally {
        setIsLoadingData(false);
    }
  }, [toast]);


  const handleSelectTable = React.useCallback(async (tableName: string) => {
    setSelectedTableName(tableName);
    const schema = tables.find(t => t.name === tableName) || null;
    setCurrentTableSchema(schema);
    setTableData(null); 
    setDataError(null);
    // setIsLoadingData is handled by fetchTableData now
    fetchTableData(tableName); // Call fetchTableData which handles its own loading state
  }, [tables, fetchTableData]);

  const handleOpenEditor = (record: Record<string, any>) => {
    setSelectedRecord(record);
    setEditingRecord({ ...record }); 
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedRecord(null);
    setEditingRecord(null);
  };

  const handleFieldChangeInEditor = (fieldName: string, value: any) => {
    setEditingRecord(prev => prev ? { ...prev, [fieldName]: value } : null);
  };

  // Update a record in Supabase
  const handleSaveRecord = async (updatedRecord: Record<string, any>) => {
    if (!selectedTableName || !updatedRecord.id) { 
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Table name or record ID is missing.",
      });
      return;
    }

    try {
      const { data: savedRecord, error } = await supabase
        .from(selectedTableName)
        .update(updatedRecord)
        .match({ id: updatedRecord.id }) 
        .select() 
        .single(); 

      if (error) throw error;

      if (savedRecord) {
        setTableData(prevData => 
          prevData 
            ? prevData.map(r => r.id === savedRecord.id ? savedRecord : r) 
            : null
        );
        toast({
          title: "Success!",
          description: `Record (ID: ${savedRecord.id}) in '${selectedTableName}' updated successfully.`,
          className: "bg-accent text-accent-foreground"
        });
        handleCloseEditor();
      } else {
         throw new Error("Record not found after update or update returned no data.");
      }
    } catch (error: any) {
      console.error("Failed to save record:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Could not save changes: ${error.message || JSON.stringify(error)}`,
      });
    }
  };

  const displayCols = currentTableSchema?.displayColumns || currentTableSchema?.columns || [];
  const editorCols = currentTableSchema?.columns || [];


  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <AppSidebar 
        tables={tables} 
        selectedTable={selectedTableName} 
        onSelectTable={handleSelectTable}
        isLoading={isLoadingTables}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader selectedTableName={selectedTableName} />
        <main className="flex-1 overflow-x-auto overflow-y-auto p-6 space-y-6">
          {!selectedTableName && isLoadingTables && ( // Show loading skeleton for tables only when tables are loading
             <div className="space-y-2 p-2">
                <Skeleton className="h-8 w-3/4 mb-3 rounded-md" />
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-md" />
                ))}
              </div>
          )}
          {!selectedTableName && !isLoadingTables && tables.length === 0 && !dataError && (
             <Alert className="max-w-2xl mx-auto">
              <Terminal className="h-4 w-4" />
              <AlertTitle>No Tables Found</AlertTitle>
              <AlertDescription>
                Could not find any tables in your Supabase 'public' schema, or failed to load them. 
                Please ensure your Supabase connection is correctly set up, the 'get_public_tables' 
                and 'get_table_columns_info' RPC functions exist and have correct permissions, and your 
                database has tables in the public schema. Check the browser console for more details.
              </AlertDescription>
            </Alert>
          )}
          {!selectedTableName && !isLoadingTables && tables.length > 0 && (
            <Alert className="max-w-2xl mx-auto">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Welcome to Supabase Admin Lite!</AlertTitle>
              <AlertDescription>
                Please select a table from the sidebar to view and manage its data.
              </AlertDescription>
            </Alert>
          )}
          {selectedTableName && isLoadingData && ( // Show loading skeleton for data only when a table is selected and data is loading
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-md" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          )}
          {selectedTableName && dataError && !isLoadingData && ( // Show data error only when a table is selected
             <Alert variant="destructive" className="max-w-2xl mx-auto">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error Loading Table Data</AlertTitle>
              <AlertDescription>
                {dataError}
              </AlertDescription>
            </Alert>
          )}
          {!isLoadingData && !dataError && tableData && currentTableSchema && selectedTableName && (
            <DataDisplayTable
              data={tableData}
              columns={displayCols}
              onSelectRecord={handleOpenEditor}
              tableName={selectedTableName}
            />
          )}
        </main>
      </div>
      {isEditorOpen && editingRecord && currentTableSchema && selectedTableName && (
        <RecordEditor
          record={editingRecord}
          columns={editorCols}
          isOpen={isEditorOpen}
          onClose={handleCloseEditor}
          onSave={handleSaveRecord}
          onFieldChange={handleFieldChangeInEditor}
          tableName={selectedTableName}
        />
      )}
    </div>
  );
}

