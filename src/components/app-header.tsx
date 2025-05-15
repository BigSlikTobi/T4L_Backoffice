
"use client";

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserCircle, PlusCircle } from 'lucide-react';

interface AppHeaderProps {
  selectedTableName: string | null; // This will refer to the left panel's table
  onAddNewRecord?: () => void; // Optional: only enable if a table is selected in the left panel
}

export function AppHeader({ selectedTableName, onAddNewRecord }: AppHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 shrink-0">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" /> 
        <h1 className="text-xl font-semibold text-foreground truncate max-w-xs sm:max-w-md md:max-w-lg">
          {selectedTableName ? (
            <>
              <span className="hidden sm:inline">Table: </span> 
              {selectedTableName}
            </>
          )
          : "Supabase Admin Lite"}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {selectedTableName && onAddNewRecord && ( // "New Record" button tied to left panel's selected table
          <Button
            variant="outline"
            size="sm"
            onClick={onAddNewRecord}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Record
          </Button>
        )}
        <Button variant="ghost" size="icon" disabled>
          <UserCircle className="h-5 w-5" />
          <span className="sr-only">User Profile</span>
        </Button>
      </div>
    </header>
  );
}
