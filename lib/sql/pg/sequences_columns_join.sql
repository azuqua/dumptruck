select 
  * 
from information_schema.columns 
  inner join information_schema.sequences 
  on table_schema = sequence_schema
  and pg_get_serial_sequence(table_schema || '.' || table_name, column_name) = sequence_schema || '.' || sequence_name 
where sequence_catalog = ? and sequence_schema = ?