select
  *
from all_sequences

-- select tabs.table_name,
--   tabs.owner,
--   trigs.trigger_name,
--   seqs.sequence_name
-- from all_tables tabs
-- join all_triggers trigs
--   on trigs.table_owner = tabs.owner
--   and trigs.table_name = tabs.table_name
-- join all_dependencies deps
--   on deps.owner = trigs.owner
--   and deps.name = trigs.trigger_name
-- join all_sequences seqs
--   on seqs.sequence_owner = deps.referenced_owner
--   and seqs.sequence_name = deps.referenced_name