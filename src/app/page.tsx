
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

      if (tableNamesError) throw tableNamesError;
      
      let fetchedTables: TableSchema[] = [];

      if (tableNamesData && Array.isArray(tableNamesData)) {
         fetchedTables = await Promise.all(
          tableNamesData.map(async (table: { table_name: string }) => {
            const { data: sampleRowData, error: sampleRowError } = await supabase
              .from(table.table_name)
              .select('*')
              .limit(1)
              .maybeSingle();

            let columns: string[] = [];
            if (sampleRowError && sampleRowError.code !== 'PGRST116') { 
              console.warn(`Could not fetch sample row for table ${table.table_name} to infer columns:`, sampleRowError.message);
            }
            
            if (sampleRowData) {
              columns = Object.keys(sampleRowData);
            } else {
                const { data: columnData, error: columnError } = await supabase
                .rpc('get_table_columns_info', { p_table_name: table.table_name });

                if (columnError) {
                    console.warn(`Could not fetch column info for table ${table.table_name}:`, columnError.message);
                    columns = ['id']; // Default or placeholder
                } else if (columnData) {
                    columns = columnData.map((col: { column_name: string }) => col.column_name);
                }
            }
            
            return { name: table.table_name, columns };
          })
        );
      }
      setTables(fetchedTables);
    } catch (error: any) {
      console.error("Raw error caught in fetchTables:", error);
      console.error("Type of error in fetchTables:", typeof error, "Is Error instance:", error instanceof Error);

      let detailMessage = "An unknown error occurred.";
      if (error && typeof error === 'object') {
        // Prefer error.message if it's non-empty
        if (error.message && String(error.message).trim() !== "") {
          detailMessage = String(error.message);
          if (error.details) detailMessage += ` Details: ${String(error.details)}`;
          if (error.hint) detailMessage += ` Hint: ${String(error.hint)}`;
          if (error.code) detailMessage += ` Code: ${String(error.code)}`;
        } else {
          // Fallback if error.message is empty or not present
          let stringifiedError: string | null = null;
          try {
            stringifiedError = JSON.stringify(error);
          } catch (e) {
            // JSON.stringify might fail for circular objects, etc.
          }

          if (stringifiedError && stringifiedError !== '{}') {
            detailMessage = `Error details: ${stringifiedError}.`;
          } else {
            const keys = Object.keys(error);
            if (keys.length > 0) {
              detailMessage = `Received error object with keys: [${keys.join(', ')}]. Values might be empty or non-stringifiable. Check browser console for the full object.`;
            } else {
              detailMessage = "Received an empty or uninformative error object. This often indicates an issue with the 'get_public_tables' RPC function (e.g., it doesn't exist, has permission issues, or an internal error) or a network problem. Please verify the RPC function in your Supabase dashboard and check the browser's network tab for the exact response from the server.";
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
        description: `Failed to load tables: ${detailMessage} Please ensure your Supabase RPC functions ('get_public_tables', 'get_table_columns_info') are correctly set up and check the browser console and network tab for more technical information.`,
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
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
      console.error(`Failed to fetch data for table ${tableName}:`, error);
      setDataError(`Could not load data for table ${tableName}: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Error Loading Data",
        description: `Failed to load data for table '${tableName}': ${error.message}`,
      });
      throw error;
    }
    return data || [];
  }, [toast]);


  const handleSelectTable = React.useCallback(async (tableName: string) => {
    setSelectedTableName(tableName);
    const schema = tables.find(t => t.name === tableName) || null;
    setCurrentTableSchema(schema);
    setTableData(null); 
    setDataError(null);
    setIsLoadingData(true);
    try {
      const data = await fetchTableData(tableName);
      setTableData(data);
    } catch (error) {
      // Error is already handled in fetchTableData by setting dataError and toasting
    } finally {
      setIsLoadingData(false);
    }
  }, [tables, toast, fetchTableData]);

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
        description: `Could not save changes: ${error.message}`,
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
          {!selectedTableName && !isLoadingTables && tables.length === 0 && !dataError && (
             <Alert className="max-w-2xl mx-auto">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Supabase Admin Lite</AlertTitle>
              <AlertDescription>
                Loading tables... If this persists, ensure your Supabase connection is set up and RPC functions are available. Check console for errors.
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
          {isLoadingData && (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-md" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          )}
          {dataError && !isLoadingData && (
             <Alert variant="destructive" className="max-w-2xl mx-auto">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
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
