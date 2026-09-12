-- Runs once, automatically, when the postgres container's data directory is
-- first initialized (docker-entrypoint-initdb.d convention). Provisions the
-- lower-privileged role the running app connects as. RLS policies are
-- skipped for a table's OWNER by default — since migrations run as the
-- superuser (which owns every table it creates), the app must connect as a
-- DIFFERENT, non-owner role for `ENABLE ROW LEVEL SECURITY` to mean anything.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD 'app_runtime_dev_password';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE multitenant TO app_runtime;
GRANT USAGE ON SCHEMA public TO app_runtime;

-- Applies to tables the superuser creates AFTER this script runs — i.e. every
-- table introduced by a migration. No per-migration GRANT needed.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO app_runtime;
