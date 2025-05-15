
"use client";

import * as React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { DataDisplayTable } from '@/components/data-display-table';
import { RecordEditor } from '@/components/record-editor';
import { supabase } from '@/lib/supabaseClient'; 
import type { TableSchema, ColumnDetail } from '@/data/mock-data'; 
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
  const [isCreatingNewRecord, setIsCreatingNewRecord] = React.useState(false);

  const { toast } = useToast();

  const fetchTables = React.useCallback(async () => {
    setIsLoadingTables(true);
    try {
      const { data: tableNamesData, error: tableNamesError } = await supabase
        .rpc('get_public_tables'); 

      if (tableNamesError) {
        if (typeof tableNamesError === 'object' && tableNamesError !== null && !tableNamesError.message && Object.keys(tableNamesError).length === 0) {
          throw new Error("Failed to fetch table names using 'get_public_tables' RPC. Supabase returned an empty error object. Please check the RPC function's definition, permissions in your Supabase dashboard, and the browser's network tab for server response details. Ensure the RPC function is defined as per the SQL in page.tsx comments.");
        }
        throw tableNamesError; 
      }
      
      let fetchedTables: TableSchema[] = [];

      if (tableNamesData && Array.isArray(tableNamesData)) {
         fetchedTables = await Promise.all(
          tableNamesData.map(async (table: { table_name: string }) => {
            let columns: ColumnDetail[] = [];
            
            const { data: columnDataRpc, error: columnErrorRpc } = await supabase
              .rpc('get_table_columns_info', { p_table_name: table.table_name });

            if (columnErrorRpc) {
                const errorDetail = columnErrorRpc.message || JSON.stringify(columnErrorRpc);
                const errorMsg = `Failed to get column info for table '${table.table_name}' using 'get_table_columns_info' RPC. Error: ${errorDetail}. Check RPC definition/permissions and Supabase logs. Ensure the RPC function is defined as per the SQL in page.tsx comments.`;
                console.error(errorMsg, columnErrorRpc); 
                if (typeof columnErrorRpc === 'object' && columnErrorRpc !== null && !columnErrorRpc.message && Object.keys(columnErrorRpc).length === 0) {
                    throw new Error(`Failed to get column info for table '${table.table_name}' using 'get_table_columns_info' RPC. Supabase returned an empty error object. Please verify the RPC function in your Supabase dashboard (as per SQL in page.tsx comments) and check network logs.`);
                }
                throw new Error(errorMsg); 
            } else if (columnDataRpc && columnDataRpc.length > 0) {
                columns = columnDataRpc.map((col: any) => ({ // Cast to any to handle RPC return shape
                    column_name: col.column_name,
                    data_type: col.data_type,
                    ordinal_position: col.ordinal_position,
                    is_nullable: col.is_nullable,
                    is_primary_key: col.is_primary_key,
                    foreign_key_table: col.foreign_key_table,
                    foreign_key_column: col.foreign_key_column,
                }));
            } else {
                 // Fallback to sample row if RPC returns no columns (should be less common with improved RPC)
                const { data: sampleRowData, error: sampleRowError } = await supabase
                    .from(table.table_name)
                    .select('*')
                    .limit(1)
                    .maybeSingle();

                if (sampleRowError && sampleRowError.code !== 'PGRST116') { // PGRST116: empty table is ok
                    const sampleErrorMsg = sampleRowError.message || JSON.stringify(sampleRowError);
                    console.warn(`Could not fetch sample row for table ${table.table_name} (code: ${sampleRowError.code}): ${sampleErrorMsg}. This is a fallback; ideally, 'get_table_columns_info' RPC should provide schema.`);
                    if (typeof sampleRowError === 'object' && sampleRowError !== null && !sampleRowError.message && Object.keys(sampleRowError).length === 0) {
                      throw new Error(`Failed to fetch a sample row for table '${table.table_name}' to infer schema. Supabase returned an empty error object. This was a fallback attempt; primary issue might be with 'get_table_columns_info' RPC. Check table permissions and network logs.`);
                    }
                }
                if (sampleRowData && Object.keys(sampleRowData).length > 0) {
                    columns = Object.keys(sampleRowData).map((colName, index) => ({
                        column_name: colName,
                        data_type: 'unknown', // Cannot infer data type from sample alone reliably
                        ordinal_position: index + 1,
                        is_nullable: 'YES', // Assume nullable as a safe default
                        is_primary_key: colName.toLowerCase() === 'id', // Basic assumption
                        foreign_key_table: null,
                        foreign_key_column: null,
                    }));
                } else {
                    console.warn(`No columns found for table '${table.table_name}' via 'get_table_columns_info' RPC or sample row. The table might be empty or the RPC isn't providing data. Defaulting to minimal schema if possible.`);
                }
            }
            
            if (columns.length === 0) {
                console.warn(`Unable to determine columns for table '${table.table_name}'. This table might be skipped or have limited functionality. Ensure 'get_table_columns_info' RPC is working or the table has data.`);
                // Return a minimal schema or null to filter out later
                return { name: table.table_name, columns: [{ column_name: 'id', data_type: 'uuid', ordinal_position: 1, is_nullable: 'NO', is_primary_key: true, foreign_key_column: null, foreign_key_table: null } as ColumnDetail]}; // Default to an 'id' column
            }
            
            // Determine displayColumns: prioritize 'name', 'title', then first few actual columns
            let displayColumnNames: string[] = [];
            const preferredDisplayCols = ['name', 'title', 'label', 'description'];
            for (const preferred of preferredDisplayCols) {
              if (columns.find(c => c.column_name === preferred)) {
                displayColumnNames.push(preferred);
                break; 
              }
            }
            if (displayColumnNames.length === 0 && columns.find(c => c.column_name === 'id')) {
                 displayColumnNames.push('id');
            }
            // Add a few more columns if available, up to a limit (e.g., 3-4 total)
            const remainingCols = columns.filter(c => !displayColumnNames.includes(c.column_name));
            for (let i = 0; i < remainingCols.length && displayColumnNames.length < 4; i++) {
                displayColumnNames.push(remainingCols[i].column_name);
            }
             if (displayColumnNames.length === 0 && columns.length > 0) {
                displayColumnNames.push(columns[0].column_name); // At least one column
            }


            return { name: table.table_name, columns, displayColumns: displayColumnNames };
          })
        );
      }
      setTables(fetchedTables.filter(t => t && t.columns && t.columns.length > 0 && t.columns.some(c => c.column_name !== 'id' || t.columns.length === 1) ));
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
              detailMessage = "Received an empty or uninformative error object. This often indicates an issue with the 'get_public_tables' or 'get_table_columns_info' RPC functions (e.g., they don't exist, have permission issues, or an internal error - ensure they are defined as per SQL in page.tsx comments), a problem fetching sample data for a table, or a network problem. Please verify these RPC functions in your Supabase dashboard and check the browser's network tab for the exact response from the server.";
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
        description: `Failed to load tables: ${detailMessage} Please check the browser console and network tab for more technical information. Ensure your Supabase RPC functions are correctly set up as per SQL comments in page.tsx.`,
      });
    } finally {
      setIsLoadingTables(false);
    }
  }, [toast]);


  React.useEffect(() => {
    fetchTables();
  }, [fetchTables]);

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
        setTableData(null); 
        return []; 
      }
      setTableData(data || []);
      return data || [];
    } catch (e: any) { 
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
    fetchTableData(tableName); 
  }, [tables, fetchTableData]);

  const handleOpenEditor = (record: Record<string, any>) => {
    setSelectedRecord(record);
    setEditingRecord({ ...record });
    setIsCreatingNewRecord(false);
    setIsEditorOpen(true);
  };
  
  const handleOpenNewRecordEditor = () => {
    if (!currentTableSchema) return;

    const newRecordScaffold = currentTableSchema.columns.reduce((acc, col) => {
      if (col.is_primary_key || col.column_name.toLowerCase().endsWith('_at')) {
        return acc;
      }
      // For foreign keys, initialize with null or undefined to allow placeholder in Select
      acc[col.column_name] = col.foreign_key_table ? null : ''; 
      return acc;
    }, {} as Record<string, any>);
    
    setSelectedRecord(null);
    setEditingRecord(newRecordScaffold);
    setIsCreatingNewRecord(true);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedRecord(null);
    setEditingRecord(null);
    setIsCreatingNewRecord(false);
  };

  const handleFieldChangeInEditor = (fieldName: string, value: any) => {
    setEditingRecord(prev => prev ? { ...prev, [fieldName]: value } : null);
  };

  const handleSaveRecord = async (recordToSave: Record<string, any>) => {
    if (!selectedTableName || !currentTableSchema) { 
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Table name or schema is missing.",
      });
      return;
    }

    const payloadForSupabase: Record<string, any> = {};
    currentTableSchema.columns.forEach(col => {
      const colName = col.column_name;
      if (Object.prototype.hasOwnProperty.call(recordToSave, colName)) {
        if (isCreatingNewRecord && col.is_primary_key) { // Don't send PK for new records if auto-generated
          return; 
        }
        // Convert empty strings to null for fields that are not text/varchar, or if they are nullable FKs
        // Supabase handles type conversion for basic types, but explicit null might be better.
        if (recordToSave[colName] === '' && col.data_type !== 'text' && col.data_type !== 'character varying' && col.is_nullable === 'YES') {
            payloadForSupabase[colName] = null;
        } else {
            payloadForSupabase[colName] = recordToSave[colName];
        }
      }
    });
    
    // Clean up undefined values
    for (const key in payloadForSupabase) {
      if (payloadForSupabase[key] === undefined) {
        delete payloadForSupabase[key];
      }
    }

    try {
      if (isCreatingNewRecord) {
        const { data: newRecordData, error } = await supabase
          .from(selectedTableName)
          .insert(payloadForSupabase)
          .select()
          .single();

        if (error) throw error;

        if (newRecordData) {
          setTableData(prevData => prevData ? [newRecordData, ...prevData] : [newRecordData]);
          toast({
            title: "Success!",
            description: `New record created in '${selectedTableName}'.`, // ID might not be simple 'id'
            className: "bg-accent text-accent-foreground"
          });
          handleCloseEditor();
        } else {
           throw new Error("Insert operation returned no data or failed silently.");
        }

      } else {
        // UPDATE existing record
        // Determine primary key column(s) for the match
        const primaryKeyColumns = currentTableSchema.columns.filter(c => c.is_primary_key);
        if (primaryKeyColumns.length === 0) {
            toast({ variant: "destructive", title: "Save Error", description: "Cannot update: Table has no identified primary key." });
            return;
        }
        const matchCondition: Record<string, any> = {};
        primaryKeyColumns.forEach(pkCol => {
            if (!Object.prototype.hasOwnProperty.call(recordToSave, pkCol.column_name) || recordToSave[pkCol.column_name] == null) {
                 throw new Error(`Primary key column '${pkCol.column_name}' is missing in the record to save.`);
            }
            matchCondition[pkCol.column_name] = recordToSave[pkCol.column_name];
        });
        
        const updatePayload = { ...payloadForSupabase };
        primaryKeyColumns.forEach(pkCol => delete updatePayload[pkCol.column_name]); // Don't include PK in update payload itself

        const { data: savedRecord, error } = await supabase
          .from(selectedTableName)
          .update(updatePayload)
          .match(matchCondition) 
          .select() 
          .single(); 

        if (error) throw error;

        if (savedRecord) {
          setTableData(prevData => 
            prevData 
              ? prevData.map(r => {
                  // Match based on all PKs for composite key scenarios
                  const isMatch = primaryKeyColumns.every(pkCol => r[pkCol.column_name] === savedRecord[pkCol.column_name]);
                  return isMatch ? savedRecord : r;
              })
              : null
          );
          toast({
            title: "Success!",
            description: `Record in '${selectedTableName}' updated successfully.`,
            className: "bg-accent text-accent-foreground"
          });
          handleCloseEditor();
        } else {
           throw new Error("Record not found after update or update returned no data.");
        }
      }
    } catch (error: any) {
      console.error("Failed to save record:", error);
      toast({
        variant: "destructive",
        title: isCreatingNewRecord ? "Creation Failed" : "Update Failed",
        description: `Could not ${isCreatingNewRecord ? 'create record' : 'save changes'}: ${error.message || JSON.stringify(error)}`,
      });
    }
  };

  const displayColsForTable = currentTableSchema?.displayColumns || currentTableSchema?.columns.map(c => c.column_name) || [];


  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <AppSidebar 
        tables={tables} 
        selectedTable={selectedTableName} 
        onSelectTable={handleSelectTable}
        isLoading={isLoadingTables}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader 
            selectedTableName={selectedTableName} 
            onAddNewRecord={handleOpenNewRecordEditor}
        />
        <main className="flex-1 overflow-x-auto overflow-y-auto p-6 space-y-6">
          {!selectedTableName && isLoadingTables && ( 
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
              <AlertTitle>No Tables Found or Failed to Load</AlertTitle>
              <AlertDescription>
                Could not find any tables in your Supabase 'public' schema, or failed to load their schemas. 
                Please ensure your Supabase connection is correctly set up, the 'get_public_tables' 
                and 'get_table_columns_info' RPC functions exist and have correct permissions (see SQL in page.tsx comments), and your 
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
          {selectedTableName && isLoadingData && ( 
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-md" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          )}
          {selectedTableName && dataError && !isLoadingData && ( 
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
              columns={displayColsForTable} // Use derived display columns
              onSelectRecord={handleOpenEditor}
              tableName={selectedTableName}
            />
          )}
        </main>
      </div>
      {isEditorOpen && editingRecord && currentTableSchema && selectedTableName && (
        <RecordEditor
          record={editingRecord}
          tableSchema={currentTableSchema} // Pass the full schema
          isOpen={isEditorOpen}
          onClose={handleCloseEditor}
          onSave={handleSaveRecord}
          onFieldChange={handleFieldChangeInEditor}
          tableName={selectedTableName}
          isNewRecord={isCreatingNewRecord}
          supabaseClient={supabase} // Pass Supabase client for FK fetching
        />
      )}
    </div>
  );
}

/*
SQL for Supabase RPC functions (run in Supabase SQL Editor):

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

-- Updated Function to get column names, types, PK, and FK info
CREATE OR REPLACE FUNCTION get_table_columns_info(p_table_name TEXT)
RETURNS TABLE(
    column_name TEXT,
    data_type TEXT,
    ordinal_position INTEGER,
    is_nullable TEXT, -- 'YES' or 'NO'
    is_primary_key BOOLEAN,
    foreign_key_table TEXT,
    foreign_key_column TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        isc.column_name::text,
        isc.data_type::text,
        isc.ordinal_position::integer,
        isc.is_nullable::text,
        (EXISTS (
            SELECT 1
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            WHERE tc.table_name = isc.table_name AND tc.table_schema = isc.table_schema
              AND kcu.column_name = isc.column_name
              AND tc.constraint_type = 'PRIMARY KEY'
        )) AS is_primary_key,
        fk_info.foreign_table_name::text,
        fk_info.foreign_column_name::text
    FROM information_schema.columns isc
    LEFT JOIN (
        SELECT
            kcu.table_schema,
            kcu.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.referential_constraints rc ON kcu.constraint_name = rc.constraint_name AND kcu.table_schema = rc.constraint_schema
        JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
        WHERE kcu.table_schema = 'public' AND kcu.table_name = p_table_name
    ) AS fk_info ON isc.table_schema = fk_info.table_schema AND isc.table_name = fk_info.table_name AND isc.column_name = fk_info.column_name
    WHERE isc.table_schema = 'public'
      AND isc.table_name = p_table_name
    ORDER BY isc.ordinal_position;
END;
$$ LANGUAGE plpgsql;

*/

