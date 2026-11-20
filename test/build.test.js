// node --test — sıfır bağımlılık, Node'un kendi test çalıştırıcısı.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
	merge, expandVersions, validateVersionDefs, validateUniqueSlugs, deadPaths, repeatedPaths, sourceFile,
} = require('../build');

const hw = (over = {}) => Object.assign({
	slug: 'puma-titanium', trim: 'Titanium', name: 'Ford Puma®',
	options: { stepne: { price: 1 } },
	versions: [{ id: '125kw', power: '125KW', price: 100 }],
}, over);

const errorsOf = list => {
	const errors = [];
	validateVersionDefs(list, (file, msg) => errors.push(`${file}: ${msg}`));
	return errors;
};

test('merge: nesneler anahtar anahtar birleşir, diziler tamamen değişir', () => {
	const out = merge({ a: { x: 1, y: 2 }, list: [1, 2, 3] }, { a: { y: 9 }, list: [4] });
	assert.deepEqual(out, { a: { x: 1, y: 9 }, list: [4] });
});

test('expandVersions: sayfa adı <donanım>-<id>, kimlik alanları version altında', () => {
	const [page] = expandVersions(hw());
	assert.equal(page.slug, 'puma-titanium-125kw');
	assert.equal(page.pageTitle, 'Ford Puma Titanium 125KW Tasarım');
	assert.equal(page.version.hardware, 'puma-titanium');
	assert.equal(page.versions, undefined);
});

test('expandVersions: hidePower sayfa adını donanımın slug\'ı yapar', () => {
	const [page] = expandVersions(hw({ versions: [{ id: '125kw', power: '125KW', price: 1, hidePower: true }] }));
	assert.equal(page.slug, 'puma-titanium');
	assert.equal(page.gtmModel, 'Ford Puma Titanium');
});

test('sourceFile: hidePower\'lı sayfada da doğru dosyayı gösterir', () => {
	const [page] = expandVersions(hw({ versions: [{ id: '125kw', power: '125KW', price: 1, hidePower: true }] }));
	assert.equal(sourceFile(page), 'data/puma-titanium.json → puma-titanium');
});

test('validateVersionDefs: versions zorunlu', () => {
	assert.match(errorsOf([hw({ versions: undefined })]).join(), /versions boş olmayan bir dizi/);
});

test('validateVersionDefs: hidePower birden fazla versiyonla kullanılamaz', () => {
	const errors = errorsOf([hw({ versions: [
		{ id: 'a', power: 'A', price: 1, hidePower: true },
		{ id: 'b', power: 'B', price: 1, hidePower: true },
	] })]);
	assert.match(errors.join(), /hidePower yalnızca tek versiyonlu/);
});

test('validateUniqueSlugs: iki sayfa aynı dosyaya yazılamaz', () => {
	const a = expandVersions(hw({ versions: [{ id: '125kw', power: '125KW', price: 1, hidePower: true }] }));
	const errors = [];
	validateUniqueSlugs(a.concat(a), (file, msg) => errors.push(msg));
	assert.equal(errors.length, 1);
});

test('deadPaths: bütün versiyonların ezdiği alan ölü sayılır', () => {
	const body = { featured: [1], options: { x: { price: 1, title: 't' } } };
	const overs = [{ featured: [2], options: { x: { price: 2 } } }, { featured: [3], options: { x: { price: 3 } } }];
	assert.deepEqual(deadPaths(body, overs, []), ['featured', 'options.x.price']);
});

test('deadPaths: bir versiyon bile kullanıyorsa ölü değil', () => {
	assert.deepEqual(deadPaths({ featured: [1] }, [{ featured: [2] }, {}], []), []);
});

test('repeatedPaths: bütün versiyonlarda aynı alan raporlanır', () => {
	const overs = [{ tabs: { a: [1], b: [2] } }, { tabs: { a: [1], b: [3] } }];
	assert.deepEqual(repeatedPaths(overs, []), ['tabs.a']);
	assert.deepEqual(repeatedPaths([{ a: 1 }], []), [], 'tek versiyonda tekrar olmaz');
});
