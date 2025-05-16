-- Get primary key column for a table
-- This function retrieves the primary key column name for a specified table
CREATE OR REPLACE FUNCTION get_primary_key_column(table_name_param text)
RETURNS TABLE(column_name text) AS
$$
BEGIN
    RETURN QUERY 
    SELECT a.attname as column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = table_name_param::regclass
    AND i.indisprimary;
END;
$$ LANGUAGE plpgsql;

-- Create helper function
CREATE OR REPLACE FUNCTION create_get_primary_key_function()
RETURNS void AS
$$
BEGIN
    -- Function already created above, this is just a wrapper to call once during setup
    RAISE NOTICE 'get_primary_key_column function is available';
END;
$$ LANGUAGE plpgsql;
