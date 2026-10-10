-- Apply once to an empty database as the migration/admin user.
BEGIN;
CREATE SCHEMA ambangeg;
REVOKE ALL ON SCHEMA ambangeg FROM PUBLIC;
CREATE TYPE ambangeg.climb_visibility AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TABLE ambangeg.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_issuer text NOT NULL,
  cognito_subject text NOT NULL,
  display_name text NOT NULL,
  username text UNIQUE CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_storage_key text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cognito_issuer, cognito_subject)
);
CREATE TABLE ambangeg.mountains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  location text NOT NULL,
  kind text NOT NULL DEFAULT 'mountain' CHECK (kind IN ('mountain', 'ridge')),
  elevation_m integer,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  coordinate_type text NOT NULL DEFAULT 'summit' CHECK (coordinate_type IN ('summit', 'jump-off')),
  difficulty smallint CHECK (difficulty BETWEEN 1 AND 9),
  aliases jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(aliases) = 'array'),
  sources jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(sources) = 'array')
);
CREATE TABLE ambangeg.mountain_trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mountain_id uuid NOT NULL REFERENCES ambangeg.mountains(id),
  name text NOT NULL,
  difficulty smallint CHECK (difficulty BETWEEN 1 AND 9),
  difficulty_max smallint CHECK (difficulty_max BETWEEN difficulty AND 9),
  duration text,
  source jsonb,
  UNIQUE (mountain_id, name),
  UNIQUE (id, mountain_id)
);
CREATE TABLE ambangeg.climbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES ambangeg.users(id) ON DELETE CASCADE,
  mountain_id uuid NOT NULL REFERENCES ambangeg.mountains(id),
  trail_id uuid,
  climbed_on date NOT NULL,
  finished_on date CHECK (finished_on > climbed_on),
  notes text NOT NULL DEFAULT '',
  summit_not_reached boolean NOT NULL DEFAULT false,
  visibility ambangeg.climb_visibility NOT NULL DEFAULT 'PRIVATE',
  pin_slot smallint CHECK (pin_slot BETWEEN 1 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- A selected trail must belong to the selected mountain.
  FOREIGN KEY (trail_id, mountain_id) REFERENCES ambangeg.mountain_trails(id, mountain_id),
  -- NULL means unpinned. Three unique slots enforce at most three pins per user.
  UNIQUE (user_id, pin_slot)
);
-- Deliberately allow repeat climbs of the same mountain, including the same date.
CREATE INDEX climbs_user_date ON ambangeg.climbs(user_id, climbed_on DESC, id);
CREATE INDEX climbs_user_mountain ON ambangeg.climbs(user_id, mountain_id);
CREATE INDEX climbs_trail ON ambangeg.climbs(trail_id, mountain_id);
CREATE INDEX climbs_mountain_date ON ambangeg.climbs(mountain_id, climbed_on DESC);
CREATE TABLE ambangeg.climb_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  climb_id uuid NOT NULL REFERENCES ambangeg.climbs(id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE,
  thumbnail_storage_key text,
  caption text,
  is_cover boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX photos_climb_order ON ambangeg.climb_photos(climb_id, sort_order, id);
CREATE UNIQUE INDEX photos_one_cover ON ambangeg.climb_photos(climb_id) WHERE is_cover;
CREATE FUNCTION ambangeg.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON ambangeg.users
FOR EACH ROW EXECUTE FUNCTION ambangeg.touch_updated_at();
CREATE TRIGGER climbs_updated_at BEFORE UPDATE ON ambangeg.climbs
FOR EACH ROW EXECUTE FUNCTION ambangeg.touch_updated_at();
COMMIT;
