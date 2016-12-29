select 
  constraint_name, constraint_type
from all_constraints 
where table_name = ?