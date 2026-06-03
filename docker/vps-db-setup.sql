-- Jalankan sebagai superuser postgres di VPS
-- psql -U postgres -f vps-db-setup.sql

CREATE DATABASE sera_db;
GRANT ALL PRIVILEGES ON DATABASE sera_db TO postgres_autobot;
\c sera_db
GRANT ALL ON SCHEMA public TO postgres_autobot;
