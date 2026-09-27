-- Runs once, when the container's data volume is first created.
-- The tests drop and recreate every table, so they get a database of their own.
CREATE DATABASE agrinexus_test;
