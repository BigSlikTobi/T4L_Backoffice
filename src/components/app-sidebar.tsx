
"use client";

import type { TableSchema } from '@/data/mock-data';
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { SupabaseLogo } from '@/components/supabase-logo';
import { Database, Settings2, PanelRightOpen } from 'lucide-react';

interface AppSidebarProps {
  tables: TableSchema[];
  selectedTable: string | null; // For left panel active state
  onSelectTable: (tableName: string) => void; // For left panel
  onSelectTableForRightPanel: (tableName: string) => void; // For right panel
  isLoading: boolean;
}

export function AppSidebar({ 
  tables, 
  selectedTable, 
  onSelectTable, 
  onSelectTableForRightPanel,
  isLoading 
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-0">
        <div className="flex h-16 items-center gap-3 px-4">
          <SupabaseLogo className="h-7 w-7 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Tackle4Loss Lite
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        {isLoading ? (
          <div className="p-2 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={`sidebar-skel-${i}`} className="h-8 w-full bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : (
          <SidebarMenu>
            {tables.map((table) => (
              <SidebarMenuItem key={table.name} className="flex items-center justify-between group">
                <SidebarMenuButton 
                  onClick={() => onSelectTable(table.name)} 
                  isActive={selectedTable === table.name}
                  tooltip={table.name}
                  className="justify-start flex-grow"
                >
                  <Database className="h-4 w-4" />
                  <span>{table.name}</span>
                </SidebarMenuButton>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 ml-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering onSelectTable
                    onSelectTableForRightPanel(table.name);
                  }}
                  aria-label={`Open ${table.name} in right panel`}
                  title={`Open ${table.name} in right panel`}
                >
                  <PanelRightOpen className="h-4 w-4" />
                </Button>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton className="justify-start" disabled>
                    <Settings2 className="h-4 w-4" />
                    <span>Settings</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
