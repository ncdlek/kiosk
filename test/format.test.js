const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { thousands, formatPrice, formatStartingPrice, text, attr, plain } = require('../src/format');
const { format, unformatted } = require('../tools/format-data');

test('fiyat biçimi: binlik nokta, aralık, başlangıç fiyatı', () => {
	assert.equal(thousands(3211600), '3.211.600');
	assert.equal(formatPrice(139600), '139.600 TL');
	assert.equal(formatPrice([12700, 32400]), '12.700 TL - 32.400 TL');
	assert.equal(formatStartingPrice(999), "999 TL'den başlayan fiyatlarla*");
});

test('kaçış: metinde " serbest, attribute\'ta değil; satırlar <br> ile', () => {
	assert.equal(text(['14.6" SYNC', 'B&O']), '14.6" SYNC<br>B&amp;O');
	assert.equal(attr('14.6"'), '14.6&quot;');
	assert.equal(plain(['a', 'b']), 'a b');
});

test('format-data: sığan değer tek satırda, sığmayan açılır', () => {
	assert.equal(format({ a: [1, 2] }), '{ "a": [1, 2] }\n');
	const long = { k: 'x'.repeat(120) };
	assert.equal(format(long), `{\n  "k": "${'x'.repeat(120)}"\n}\n`);
});

test('data/*.json standart biçimde (node tools/format-data.js)', () => {
	assert.deepEqual(unformatted(path.join(__dirname, '..')), []);
});
