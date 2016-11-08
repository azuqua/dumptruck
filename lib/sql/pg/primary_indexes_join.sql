select 
  a.attname, 
  format_type(a.atttypid, a.atttypmod) as data_type 
from pg_index i join pg_attribute a 
  on a.attrelid = i.indrelid 
  and a.attnum = any(i.indkey) 
where i.indrelid = 'TABLE_NAME'::regclass AND i.indisprimary