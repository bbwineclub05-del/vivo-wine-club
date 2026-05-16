-- Migration: add colors column to products table
-- Run once in Supabase SQL Editor → https://supabase.com/dashboard/project/vjgwzhinjfvlspdcpukl/sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';
