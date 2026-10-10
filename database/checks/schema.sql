-- Run with psql -v ON_ERROR_STOP=1 after migration. All fixtures roll back.
BEGIN;
DO $$
DECLARE
  u uuid; m1 uuid; m2 uuid; t uuid; c1 uuid; c2 uuid;
BEGIN
  INSERT INTO ambangeg.users(cognito_issuer,cognito_subject,display_name)
    VALUES ('smoke-test','smoke-test','Schema check') RETURNING id INTO u;
  INSERT INTO ambangeg.mountains(slug,name,location,latitude,longitude)
    VALUES ('__check_one','One','Test',0,0) RETURNING id INTO m1;
  INSERT INTO ambangeg.mountains(slug,name,location,latitude,longitude)
    VALUES ('__check_two','Two','Test',0,0) RETURNING id INTO m2;
  INSERT INTO ambangeg.mountain_trails(mountain_id,name) VALUES (m1,'Trail') RETURNING id INTO t;
  INSERT INTO ambangeg.climbs(user_id,mountain_id,trail_id,climbed_on,pin_slot)
    VALUES (u,m1,t,'2026-01-01',1) RETURNING id INTO c1;
  INSERT INTO ambangeg.climbs(user_id,mountain_id,climbed_on,pin_slot)
    VALUES (u,m1,'2026-01-01',2) RETURNING id INTO c2;
  IF (SELECT count(*) FROM ambangeg.climbs WHERE user_id=u) <> 2 THEN
    RAISE EXCEPTION 'Repeat climbs were not preserved';
  END IF;
  BEGIN
    INSERT INTO ambangeg.climbs(user_id,mountain_id,trail_id,climbed_on) VALUES (u,m2,t,'2026-01-01');
    RAISE EXCEPTION 'Wrong-mountain trail was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    INSERT INTO ambangeg.climbs(user_id,mountain_id,climbed_on,finished_on) VALUES (u,m1,'2026-01-02','2026-01-01');
    RAISE EXCEPTION 'Invalid date range was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO ambangeg.climbs(user_id,mountain_id,climbed_on,pin_slot) VALUES (u,m1,'2026-01-01',1);
    RAISE EXCEPTION 'Duplicate pin slot was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO ambangeg.climbs(user_id,mountain_id,climbed_on,pin_slot) VALUES (u,m1,'2026-01-01',4);
    RAISE EXCEPTION 'Fourth pin was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO ambangeg.climb_photos(climb_id,storage_key,is_cover) VALUES (c1,'__check/cover',true);
  BEGIN
    INSERT INTO ambangeg.climb_photos(climb_id,storage_key,is_cover) VALUES (c1,'__check/second',true);
    RAISE EXCEPTION 'Two cover photos were accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  DELETE FROM ambangeg.climbs WHERE id=c1;
  IF EXISTS (SELECT 1 FROM ambangeg.climb_photos WHERE climb_id=c1) THEN
    RAISE EXCEPTION 'Photo metadata did not cascade';
  END IF;
  RAISE NOTICE 'Schema checks passed';
END;
$$;
ROLLBACK;
