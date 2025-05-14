"use client";

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';

interface AppHeaderProps {
  selectedTableName: string | null;
}

export function AppHeader({ selectedTableName }: AppHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 shrink-0">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" /> {/* Hidden on desktop by default due to collapsible="icon" behaviour */}
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
      <div>
        <Button variant="ghost" size="icon" disabled>
          <UserCircle className="h-5 w-5" />
          <span className="sr-only">User Profile</span>
        </Button>
      </div>
    </header>
  );
}
