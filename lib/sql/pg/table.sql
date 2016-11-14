select
  *
from pg_tables
where schemaname = ? and tablename = ?