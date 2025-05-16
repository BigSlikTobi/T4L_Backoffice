// Helper functions for foreign key operations

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get primary key column name for a table
 */
export async function getPrimaryKeyColumn(
  supabaseClient: SupabaseClient,
  tableName: string
): Promise<string | null> {
  const { data, error } = await supabaseClient.rpc('get_primary_key_column', { 
    table_name_param: tableName 
  });

  if (error) {
    console.error(`Error getting PK column for ${tableName}:`, error);
    return null;
  }

  return data && data.length > 0 ? data[0].column_name : null;
}

/**
 * Fetch the best display columns for a given table
 */
export async function getDisplayColumns(
  supabaseClient: SupabaseClient,
  tableName: string, 
  primaryKeyColumn: string | null = null
): Promise<string[]> {
  // Get all columns
  const { data: columns, error } = await supabaseClient
    .from('information_schema.columns')
    .select('column_name, data_type, ordinal_position')
    .eq('table_name', tableName)
    .order('ordinal_position');
    
  if (error || !columns) {
    console.error(`Error fetching columns for ${tableName}:`, error);
    return primaryKeyColumn ? [primaryKeyColumn] : [];
  }
  
  // Start with PK if provided
  const displayColumns: string[] = primaryKeyColumn ? [primaryKeyColumn] : [];
  
  // Add name-like columns first (higher priority)
  const namePatterns = ['name', 'title', 'label', 'display_name', 'username'];
  const nameColumns = columns.filter(col => 
    namePatterns.some(pattern => col.column_name.toLowerCase().includes(pattern)) &&
    !displayColumns.includes(col.column_name)
  );
  
  nameColumns.forEach(col => displayColumns.push(col.column_name));
  
  // Add description-like columns (lower priority)
  const descriptionPatterns = ['description', 'summary', 'detail', 'info', 'text'];
  const descriptionColumns = columns.filter(col => 
    descriptionPatterns.some(pattern => col.column_name.toLowerCase().includes(pattern)) &&
    !displayColumns.includes(col.column_name)
  );
  
  // Only add the first description column to avoid overwhelming the dropdown
  if (descriptionColumns.length > 0) {
    displayColumns.push(descriptionColumns[0].column_name);
  }
  
  // If we didn't find any good columns, use the primary key or the first non-system column
  if (displayColumns.length === 0) {
    const firstColumn = columns.find(col => 
      !col.column_name.startsWith('_') && // Skip system columns
      ['id', 'uuid', 'key', 'code'].some(pattern => 
        col.column_name.toLowerCase().includes(pattern)
      )
    );
    
    if (firstColumn) {
      displayColumns.push(firstColumn.column_name);
    } else if (columns.length > 0) {
      // Last resort: just use the first column
      displayColumns.push(columns[0].column_name);
    }
  }
  
  return displayColumns;
}

/**
 * Create a stored procedure to get primary key column for a table 
 */
export async function createGetPrimaryKeyFunction(supabaseClient: SupabaseClient) {
  // This needs to be run once to set up the helper function
  const { error } = await supabaseClient.rpc('create_get_primary_key_function');
  
  if (error) {
    console.error('Error creating get_primary_key_column function:', error);
  } else {
    console.log('Successfully created get_primary_key_column function');
  }
}
