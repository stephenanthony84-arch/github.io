#!/usr/bin/env node
/*
 * Refreshes ../aed-data.js from the Dingle AED map in Google My Maps.
 *
 * Run from the site folder after editing the map in Google My Maps:
 *     node tools/update-aed-data.mjs
 *
 * Names and areas you have already tidied in aed-data.js are kept for any
 * pin whose coordinates are unchanged. New pins get their map label as the
 * name and an empty area, so open aed-data.js afterwards and fill those in.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MAP_ID = '1nF0UF266j_APUEpj72y7i12Iqt6UEq0';
const KML_URL = `https://www.google.com/maps/d/kml?mid=${MAP_ID}&forcekml=1`;
const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(here, '..', 'aed-data.js');

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim();

const key = (lat, lng) => `${lat.toFixed(6)},${lng.toFixed(6)}`;

async function readExisting() {
  try {
    const src = await readFile(target, 'utf8');
    const m = src.match(/window\.DHS_AEDS\s*=\s*(\[[\s\S]*?\]);/);
    if (!m) return new Map();
    // the file this tool writes ends each row with a comma, which JSON.parse rejects before the ]
    const rows = JSON.parse(m[1].replace(/,\s*\]$/, ']'));
    return new Map(rows.map((r) => [key(r.lat, r.lng), r]));
  } catch {
    return new Map();
  }
}

const res = await fetch(KML_URL, { headers: { 'User-Agent': 'dingleheartsafe-site-tool/1.0' } });
if (!res.ok) throw new Error(`KML download failed: ${res.status} ${res.statusText}`);
const kml = await res.text();
const placemarks = [...kml.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)].map((m) => m[1]);
if (!placemarks.length) throw new Error('No placemarks found. Is the map still public?');

const existing = await readExisting();
const rows = [];
let kept = 0;
for (const pm of placemarks) {
  const coords = pm.match(/<coordinates>\s*(-?[\d.]+),(-?[\d.]+)/);
  if (!coords) continue;
  const lng = Number(coords[1]);
  const lat = Number(coords[2]);
  const desc = decode((pm.match(/<description>([\s\S]*?)<\/description>/) || [, ''])[1]);
  const prev = existing.get(key(lat, lng));
  if (prev) {
    kept++;
    if (prev.mapDesc !== desc && !/withheld/.test(prev.mapDesc)) console.log(`Label changed on the map for "${prev.name}": now "${desc}"`);
    rows.push({ ...prev });
    continue;
  }
  rows.push({ name: desc || 'AED cabinet', area: '', lat, lng, note: '', mapDesc: desc });
}

const today = new Date().toISOString().slice(0, 10);
const out = [
  '// Dingle Heart Safe: public-access AED list used by aed-finder.js.',
  `// Source: the Dingle AED map in Google My Maps (mid=${MAP_ID}).`,
  `// Exported ${today} with tools/update-aed-data.mjs. \`mapDesc\` is the raw label on the map; \`name\`/\`area\` are tidied for display; \`"managed": false\` adds the "Not a Dingle Heart Safe Managed AED" label.`,
  'window.DHS_AEDS = [',
  ...rows.map((r) => '  ' + JSON.stringify(r) + ','),
  '];',
  `window.DHS_AED_MAP_URL = "https://www.google.com/maps/d/viewer?mid=${MAP_ID}";`,
  `window.DHS_AED_UPDATED = "${today}";`,
  `window.DHS_AED_MAP_EMBED = "https://www.google.com/maps/d/embed?mid=${MAP_ID}&ehbc=2E312F";`,
  '',
].join('\n');

await writeFile(target, out, 'utf8');
const fresh = rows.length - kept;
console.log(`Wrote ${rows.length} AEDs to aed-data.js (${kept} kept their tidied names, ${fresh} new).`);
if (fresh) console.log('Open aed-data.js and fill in "area" for the new entries.');
