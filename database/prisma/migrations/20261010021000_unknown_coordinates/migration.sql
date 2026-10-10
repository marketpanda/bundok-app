ALTER TABLE ambangeg.mountains DROP CONSTRAINT mountains_coordinate_type_check;
ALTER TABLE ambangeg.mountains ADD CONSTRAINT mountains_coordinate_type_check
  CHECK (coordinate_type IN ('summit', 'jump-off', 'unknown'));
ALTER TABLE ambangeg.mountains ADD CONSTRAINT mountains_coordinate_presence
  CHECK ((coordinate_type = 'unknown' AND latitude IS NULL AND longitude IS NULL)
    OR (coordinate_type <> 'unknown' AND latitude IS NOT NULL AND longitude IS NOT NULL));
