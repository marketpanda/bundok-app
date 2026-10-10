/* eslint-disable @typescript-eslint/no-require-imports -- Exercise map group ordering and timers without a browser. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
};
const { getItineraryMapMountains, getItineraryHighlightFeatures, playMountainHighlightSequence } = require("../lib/map-group-highlight.ts");
const { hikeItineraries } = require("../data/hike-itineraries.ts");
const { mapMountains } = require("../data/map-mountains.ts");
const group = hikeItineraries.find((entry) => entry.slug === "cawag-hexa");
const members = getItineraryMapMountains(group);
assert.deepEqual(members.map((member) => member.slug), [
  "mount-balingkilat", "mount-bira-bira", "mount-naulaw", "mount-dayungan", "cinco-picos", "mount-redondo-2",
]);
assert.deepEqual(members.map((member) => member.groupOrder), [1, 2, 3, 4, 5, 6], "Cawag Hexa must map all six children in order");
assert.deepEqual(getItineraryMapMountains(hikeItineraries.find((entry) => entry.slug === "bakun-trio"))
  .map((member) => member.slug), ["mount-tenglawan", "mount-kabunian", "mount-lobo-2"], "Lobo must match Benguet, not Batangas");
const { getMountainArea } = require("../data/mountain-areas.ts");
for (const itinerary of hikeItineraries) {
  const mapped = getItineraryMapMountains(itinerary);
  for (let index = 0; index < mapped.length; index++) {
    assert.equal(getMountainArea(mapped[index]), getMountainArea(itinerary), itinerary.name);
    const target = itinerary.targets[mapped[index].groupOrder - 1];
    if (target.kind === "mountain") assert(mapMountains.some((entry) => entry.slug === mapped[index].slug));
    else assert.equal(mapped[index].slug, `${target.mountainSlug}:${target.pointSlug}`);
    if (index) assert(mapped[index].groupOrder > mapped[index - 1].groupOrder);
  }
}
assert.deepEqual(members[2].coordinates, [120.1436, 14.8325], "Naulaw must use its sourced location");
assert.deepEqual(getItineraryMapMountains({ ...group, targets: [{ kind: "mountain", mountainSlug: "unknown-mountain" }] }), []);
const arayat = getItineraryMapMountains(hikeItineraries.find((entry) => entry.slug === "arayat-quad-peak"));
assert.deepEqual(arayat.map(point => point.slug), ["mount-arayat:tko", "mount-arayat:pinnacle", "mount-arayat:south-peak", "mount-arayat:north-peak"]);
assert.deepEqual(arayat.map(point => point.groupOrder), [1, 2, 3, 4]);
assert.equal(new Set(arayat.map(point => point.coordinates.join(","))).size, 4, "Arayat must highlight four distinct sourced locations");
assert.deepEqual(arayat[0].coordinates, [120.7489497, 15.2025543]);
assert.deepEqual(arayat[3].coordinates, [120.7427214, 15.2051885]);

for (const itinerary of hikeItineraries) {
  const features = getItineraryHighlightFeatures(itinerary).features;
  const mapped = getItineraryMapMountains(itinerary);
  assert(features.length > 0, itinerary.name + " must always have animation targets");
  if (mapped.length) {
    assert.deepEqual(features.map((feature) => feature.properties.slug), mapped.map((member) => member.slug));
    assert.deepEqual(features.map((feature) => feature.properties.order), mapped.map((member) => member.groupOrder));
  } else {
    assert.equal(features.length, 1);
    assert.equal(features[0].properties.slug, itinerary.slug, "Fallback must be the group area, not an invented child");
    assert.equal(features[0].properties.itinerary, true);
    assert.deepEqual(features[0].geometry.coordinates, itinerary.coordinates);
    assert.equal(features[0].properties.order, undefined, "Approximate group pins must not be numbered as child mountains");
  }
}
const kayapa = hikeItineraries.find((entry) => entry.slug === "kayapa-quad-peak");
assert.deepEqual(kayapa.targets.map((target) => target.mountainSlug), ["mount-tugew", "mount-cabo", "mount-kabuan", "mount-sadjatan"]);
const kayapaMembers = getItineraryMapMountains(kayapa);
assert.deepEqual(kayapaMembers.map((member) => member.slug), ["mount-tugew", "mount-cabo", "mount-kabuan", "mount-sadjatan"]);
assert.deepEqual(kayapaMembers.map((member) => member.groupOrder), [1, 2, 3, 4]);
assert.deepEqual(kayapaMembers[1].coordinates, [120.8425525, 16.2543999], "Cabo must use the place coordinates, not the camera centre");
assert.deepEqual(kayapaMembers[2].coordinates, [120.8411651, 16.2495897], "Kabuan must use the place coordinates, not the camera centre");
assert.deepEqual(kayapaMembers[3].coordinates, [120.8387007, 16.2421883], "Sadjatan must use the place coordinates, not the camera centre");
const tugew = kayapaMembers.find((member) => member.slug === "mount-tugew");
assert(tugew, "Kayapa must animate its verified Mt. Tugew location");
assert.equal(tugew.groupOrder, 1);
assert.deepEqual(tugew.coordinates, [120.841, 16.2637]);

const kibungan = hikeItineraries.find((entry) => entry.slug === "kibungan-cross-country");
assert.equal(getItineraryHighlightFeatures(kibungan).features[0].properties.slug, kibungan.slug);

const originalSet = global.setTimeout;
const originalClear = global.clearTimeout;
const originalNow = Date.now;
let now = 0;
let nextId = 0;
const timers = new Map();
Date.now = () => now;
global.setTimeout = (callback, delay) => {
  const id = ++nextId;
  timers.set(id, { callback, at: now + delay });
  return id;
};
global.clearTimeout = (id) => timers.delete(id);
const tick = (duration) => {
  const end = now + duration;
  while (timers.size) {
    const [id, timer] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
    if (timer.at > end) break;
    now = timer.at;
    timers.delete(id);
    timer.callback();
  }
  now = end;
};
try {
  const events = [];
  const slugs = members.map((member) => member.slug);
  const normal = { pulses: [], flashWhite: false };
  const pulsesEnd = (slugs.length - 1) * 100 + 200;
  const cycle = pulsesEnd + 500 + 150 + 500;
  const cancel = playMountainHighlightSequence(slugs, (state) => events.push({ ...state, at: now }));
  assert.deepEqual(events[0], { pulses: [{ slug: slugs[0], radius: 7 }], flashWhite: false, at: 0 });
  tick(96);
  assert(events.at(-1).pulses[0].radius > 11.9);
  tick(4);
  assert.deepEqual(events.at(-1).pulses, [{ slug: slugs[0], radius: 12 }, { slug: slugs[1], radius: 7 }], "Next child starts at the previous pulse's peak");
  tick(50);
  const overlapping = events.at(-1).pulses;
  assert(overlapping[0].radius > 7 && overlapping[0].radius < 12, "Predecessor must be shrinking");
  assert(overlapping[1].radius > 7 && overlapping[1].radius < 12, "Next dot grows at the same time");
  tick(50);
  assert(!events.at(-1).pulses.some((pulse) => pulse.slug === slugs[0]), "First dot returns to default size after its own 200 ms pulse");
  assert.equal(events.at(-1).pulses[0].radius, 12);
  tick(pulsesEnd - 200);
  assert.deepEqual(events.at(-1), { ...normal, at: pulsesEnd });
  const growing = events.filter((event) => event.pulses.length);
  assert.deepEqual([...new Set(growing.flatMap((event) => event.pulses.map((pulse) => pulse.slug)))], slugs, "Overlaps preserve child order");
  assert(growing.every((event) => event.pulses.length <= 2 && event.pulses.every((pulse) => pulse.radius >= 7 && pulse.radius <= 12)));
  for (let index = 0; index < slugs.length; index++) {
    const frames = growing.flatMap((event) => event.pulses.filter((pulse) => pulse.slug === slugs[index]).map((pulse) => ({ ...pulse, at: event.at })));
    assert.equal(frames[0].at, index * 100, "Pulse starts must be 100 ms apart");
    assert(frames.length >= 12, "Smooth pulse needs intermediate frames");
    assert.equal(Math.max(...frames.map((frame) => frame.radius)), 12);
    assert(frames.at(-1).radius < 7.1, "Each dot shrinks back independently");
    for (let frame = 1; frame < frames.length; frame++) {
      assert(Math.abs(frames[frame].radius - frames[frame - 1].radius) < 1.3, "Overlapping radius changes stay smooth");
    }
  }
  tick(499);
  assert.equal(events.at(-1).flashWhite, false);
  tick(1);
  assert.deepEqual(events.at(-1), { ...normal, flashWhite: true, at: pulsesEnd + 500 }, "White flash waits until 500 ms after the final dot returns to normal");
  tick(150);
  assert.deepEqual(events.at(-1), { ...normal, at: pulsesEnd + 650 });
  tick(499);
  assert.deepEqual(events.at(-1), { ...normal, at: pulsesEnd + 650 });
  tick(1);
  assert.deepEqual(events.at(-1), { pulses: [{ slug: slugs[0], radius: 7 }], flashWhite: false, at: cycle });
  cancel();
  assert.deepEqual(events.at(-1), { ...normal, at: cycle });
  const count = events.length;
  tick(10000);
  assert.equal(events.length, count, "Deselection must stop every overlapping pulse and repeat");
  assert.equal(timers.size, 0);

  for (const elapsed of [50, 150, pulsesEnd + 250, pulsesEnd + 550, pulsesEnd + 800]) {
    const interrupted = [];
    const stop = playMountainHighlightSequence(slugs, (state) => interrupted.push(state));
    tick(elapsed);
    stop();
    assert.deepEqual(interrupted.at(-1), normal);
    const count = interrupted.length;
    tick(10000);
    assert.equal(interrupted.length, count);
    assert.equal(timers.size, 0);
  }

  const replay = [];
  const stopReplay = playMountainHighlightSequence([slugs[1]], (state) => replay.push(state));
  tick(200);
  assert.deepEqual(replay.at(-1), normal);
  tick(500);
  assert.deepEqual(replay.at(-1), { ...normal, flashWhite: true });
  tick(650);
  assert.deepEqual(replay.at(-1), { pulses: [{ slug: slugs[1], radius: 7 }], flashWhite: false });
  stopReplay();
  tick(10000);
  assert.equal(timers.size, 0);

  for (const itinerary of hikeItineraries) {
    const targets = getItineraryHighlightFeatures(itinerary).features.map((feature) => feature.properties.slug);
    const states = [];
    const stop = playMountainHighlightSequence(targets, (state) => states.push(state));
    tick(100);
    assert(states.some((state) => state.pulses.some((pulse) => pulse.radius > 7)), itinerary.name + " must visibly animate");
    stop();
    assert.deepEqual(states.at(-1), normal);
    tick(10000);
    assert.equal(timers.size, 0, itinerary.name + " must clear its animation on deselection");
  }

  const kayapaStates = [];
  const stopKayapa = playMountainHighlightSequence(kayapaMembers.map((member) => member.slug), (state) => kayapaStates.push(state));
  tick(500);
  assert.deepEqual([...new Set(kayapaStates.flatMap((state) => state.pulses.map((pulse) => pulse.slug)))], kayapa.targets.map((target) => target.mountainSlug), "Kayapa must pulse all four listed children in order");
  assert.deepEqual(kayapaStates.at(-1), normal);
  tick(500);
  assert.deepEqual(kayapaStates.at(-1), { ...normal, flashWhite: true });
  stopKayapa();
  assert.deepEqual(kayapaStates.at(-1), normal);
  tick(10000);
  assert.equal(timers.size, 0);

  const empty = [];
  playMountainHighlightSequence([], (state) => empty.push(state));
  tick(10000);
  assert.deepEqual(empty, []);
  assert.equal(timers.size, 0);
} finally {
  global.setTimeout = originalSet;
  global.clearTimeout = originalClear;
  Date.now = originalNow;
}
console.log("Group highlight checks passed: every group animates, missing-member fallback, child order, mapped members, smooth overlapping grow/shrink pulses, delayed simultaneous white flash, deselection cleanup, and replay.");
