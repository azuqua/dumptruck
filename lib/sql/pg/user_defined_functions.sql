select pp.proname, pl.lanname, pn.nspname, pg_get_functiondef(pp.oid)
from pg_proc pp
inner join pg_namespace pn on (pp.pronamespace = pn.oid)
inner join pg_language pl on (pp.prolang = pl.oid)
where pl.lanname NOT in ('c','internal')
and pn.nspname NOT like 'pg_%'
and pn.nspname <> 'information_schema';