ALTER TABLE ambangeg.mountains ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE ambangeg.mountains ALTER COLUMN longitude DROP NOT NULL;
CREATE TABLE ambangeg.hike_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, location TEXT NOT NULL, category TEXT NOT NULL,
  membership_status TEXT NOT NULL
);
CREATE TABLE ambangeg.itinerary_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES ambangeg.hike_itineraries(id) ON DELETE CASCADE,
  mountain_id UUID NOT NULL REFERENCES ambangeg.mountains(id),
  target_key TEXT NOT NULL, point_slug TEXT, name TEXT NOT NULL,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  UNIQUE (itinerary_id, target_key)
);
ALTER TABLE ambangeg.climbs ALTER COLUMN mountain_id DROP NOT NULL;
ALTER TABLE ambangeg.climbs ADD COLUMN itinerary_id UUID REFERENCES ambangeg.hike_itineraries(id);
ALTER TABLE ambangeg.climbs ADD CONSTRAINT climbs_one_destination
  CHECK ((mountain_id IS NOT NULL)::INTEGER + (itinerary_id IS NOT NULL)::INTEGER = 1);
ALTER TABLE ambangeg.climbs ADD CONSTRAINT climbs_group_no_trail
  CHECK (itinerary_id IS NULL OR trail_id IS NULL);
CREATE TABLE ambangeg.climb_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  climb_id UUID NOT NULL REFERENCES ambangeg.climbs(id) ON DELETE CASCADE,
  mountain_id UUID NOT NULL REFERENCES ambangeg.mountains(id),
  target_key TEXT NOT NULL, point_slug TEXT, name TEXT NOT NULL,
  reached BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  UNIQUE (climb_id, target_key)
);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ambangeg_app') THEN
    GRANT SELECT ON ambangeg.hike_itineraries, ambangeg.itinerary_targets TO ambangeg_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ambangeg.climb_targets TO ambangeg_app;
  END IF;
END $$;
