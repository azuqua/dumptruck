select
  column_name, 
  table_name, 
  udt_name, 
  column_default, 
  is_nullable, 
  character_maximum_length, 
  numeric_precision, 
  numeric_precision_radix,  
  numeric_scale
from information_schema.columns 
where table_catalog = ? and table_name = ?