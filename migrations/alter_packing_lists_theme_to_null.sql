-- Make theme column optional
ALTER TABLE packing_lists ALTER COLUMN theme DROP NOT NULL;
