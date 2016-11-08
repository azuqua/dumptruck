select
  *
from pg_indexes
where schemaname = ? and tablename = ?