'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {family, answer} = require('../assets/ohana-media.js');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalogo.json')));
const extra = JSON.parse(fs.readFileSync(path.join(root, 'foto-extra.json'))).products;
const product = catalog.find(p => p.id === 'OH-C4A8F3895241');
const variants = answer('Altri colori', product, catalog, []);
assert.equal(variants.kind, 'variants');
assert(variants.items.length > 0);
assert(variants.items.every(p => p.id !== product.id && family(p) === family(product)));
assert(!variants.items.some(p => /\bSB\b/.test(p.model)), 'Non confondere Jordan 4 e Jordan 4 SB');
assert.notEqual(family({brand: 'Balenciaga', model: 'Track — Nero'}), family({brand: 'Balenciaga', model: 'Track 2 — Nero'}));
assert.notEqual(family({brand: 'On Running', model: 'Cloudmonster — Nero'}), family({brand: 'On Running', model: 'On Cloudmonster 2 — Nero'}));
const generic = catalog.find(p => p.id === 'OHY-001');
assert.equal(answer('altri colori', generic, catalog, []).items.length, 0, 'Non associare sneaker generiche diverse');
const one = answer('altre foto', generic, catalog, []);
assert.equal(one.items.length, 1);
assert.match(one.text, /sola fotografia/);
const photos = answer('altre immagini', product, catalog, extra[product.id]);
assert(photos.items.length > 3, 'La prova deve recuperare anche foto oltre le tre della scheda');
assert.equal(new Set(photos.items.map(p => p.src)).size, photos.items.length);
const black = answer('la cerco nera', catalog.find(p => p.id === 'OH-369B224810B2'), catalog, []);
assert(black.items.length > 0);
assert(black.items.every(p => /nero|nera/i.test(p.colori_disponibili?.join(' ') || p.model)));
assert.equal(answer('altre foto', null, catalog, []).items.length, 0);
assert.match(answer('42 come taglia', product, catalog, []).text, /36–46/);
assert(!JSON.stringify(extra).includes('yupoo'));
let files = 0;
for (const [id, images] of Object.entries(extra)) {
  assert(catalog.some(p => p.id === id && p.vetrina === true));
  for (const photo of images) {
    assert(/^assets\/products\/[A-Za-z0-9_.-]+\.webp$/.test(photo.src));
    assert(fs.statSync(path.join(root, photo.src)).size > 1000);
    files++;
  }
}
console.log(`PASS: contesto prodotto, varianti, filtro colore, nessun abbinamento generico, foto mancanti e ${files} foto extra locali.`);
