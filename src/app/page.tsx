"use client";

import * as React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { DataDisplayTable } from '@/components/data-display-table';
import { RecordEditor } from '@/components/record-editor';
import { fetchTables, fetchTableData, updateTableRecord, type TableSchema } from '@/data/mock-data';
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

  React.useEffect(() => {
    const loadTables = async () => {
      try {
        setIsLoadingTables(true);
        const fetchedTables = await fetchTables();
        setTables(fetchedTables);
        if (fetchedTables.length > 0) {
          // Optionally select the first table by default
          // handleSelectTable(fetchedTables[0].name); 
        }
      } catch (error) {
        console.error("Failed to fetch tables:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load database tables.",
        });
      } finally {
        setIsLoadingTables(false);
      }
    };
    loadTables();
  }, [toast]);

  const handleSelectTable = React.useCallback(async (tableName: string) => {
    setSelectedTableName(tableName);
    const schema = tables.find(t => t.name === tableName) || null;
    setCurrentTableSchema(schema);
    setTableData(null); // Clear previous data
    setDataError(null);
    setIsLoadingData(true);
    try {
      const data = await fetchTableData(tableName);
      setTableData(data);
    } catch (error) {
      console.error(`Failed to fetch data for table ${tableName}:`, error);
      setDataError(`Could not load data for table ${tableName}.`);
      toast({
        variant: "destructive",
        title: "Error Loading Data",
        description: `Failed to load data for table '${tableName}'.`,
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [tables, toast]);

  const handleOpenEditor = (record: Record<string, any>) => {
    setSelectedRecord(record);
    setEditingRecord({ ...record }); // Create a copy for editing
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

  const handleSaveRecord = async (updatedRecord: Record<string, any>) => {
    if (!selectedTableName) return;
    try {
      const savedRecord = await updateTableRecord(selectedTableName, updatedRecord);
      // Update local table data
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
    } catch (error) {
      console.error("Failed to save record:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save changes to the record.",
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
          {!selectedTableName && !isLoadingTables && (
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
