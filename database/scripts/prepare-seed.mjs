import { readFile, writeFile } from 'node:fs/promises';

// Generate SQL without connecting to a database. The current catalogue is the source.
const catalogue = JSON.parse(await readFile(new URL('../../frontend/data/national-mountains.json', import.meta.url), 'utf8'));
const literal = value => value == null ? 'NULL' : "'" + String(value).replaceAll("'", "''") + "'";
const json = value => literal(JSON.stringify(value)) + '::jsonb';
const seen = new Set();
const lines = ['BEGIN;', 'SET LOCAL standard_conforming_strings = on;'];
for (const m of catalogue) {
  if (!m.slug || seen.has(m.slug)) throw new Error('Missing or duplicate mountain slug: ' + m.slug);
  seen.add(m.slug);
  const [lng, lat] = m.coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) throw new Error('Invalid coordinates: ' + m.slug);
  const cols = ['slug','name','location','kind','elevation_m','longitude','latitude','coordinate_type','difficulty','aliases','sources'];
  const values = [literal(m.slug),literal(m.name),literal(m.location),literal(m.kind ?? 'mountain'),literal(m.elevationMeters),literal(lng),literal(lat),literal(m.coordinateType ?? 'summit'),literal(m.difficulty),json(m.aliases ?? []),json(m.sources ?? [])];
  lines.push('INSERT INTO ambangeg.mountains (' + cols.join(', ') + ') VALUES (' + values.join(', ') + ') ON CONFLICT (slug) DO UPDATE SET ' + cols.slice(1).map(c => c + ' = EXCLUDED.' + c).join(', ') + ';');
  const trailNames = new Set();
  for (const t of m.trails ?? []) {
    if (trailNames.has(t.name)) throw new Error('Duplicate trail: ' + m.slug + '/' + t.name);
    trailNames.add(t.name);
    lines.push('INSERT INTO ambangeg.mountain_trails (mountain_id, name, difficulty, difficulty_max, duration, source) SELECT id, ' + [literal(t.name),literal(t.difficulty),literal(t.difficultyMax),literal(t.duration),json(t.source ?? null)].join(', ') + ' FROM ambangeg.mountains WHERE slug = ' + literal(m.slug) + ' ON CONFLICT (mountain_id, name) DO UPDATE SET difficulty = EXCLUDED.difficulty, difficulty_max = EXCLUDED.difficulty_max, duration = EXCLUDED.duration, source = EXCLUDED.source;');
  }
}
lines.push('COMMIT;');
await writeFile(new URL('../seed.sql', import.meta.url), lines.join('\n') + '\n');
console.log('Prepared seed.sql for ' + seen.size + ' mountains. Existing mountain/trail IDs are preserved; omitted entries are not deleted.');
