CREATE TABLE ambangeg.photo_deletions (
    storage_key TEXT PRIMARY KEY,
    not_before TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT photo_deletions_key CHECK (storage_key LIKE 'climbs/%')
);
CREATE INDEX photo_deletions_due ON ambangeg.photo_deletions (not_before);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ambangeg_app') THEN
    GRANT SELECT, INSERT, DELETE ON ambangeg.photo_deletions TO ambangeg_app;
  END IF;
END $$;
