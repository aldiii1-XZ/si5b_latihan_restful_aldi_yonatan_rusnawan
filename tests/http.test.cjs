const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { fork } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const path = require('node:path');
let child, base, key;
const origin = 'http://localhost:5173';
async function start(extra = {}) {
  key = randomBytes(24).toString('hex');
  child = fork(path.join(__dirname, 'server.cjs'), [], {
    cwd: path.join(__dirname, '..'), silent: true,
    env: { ...process.env, PORT: '0', API_KEY: key, CORS_ORIGIN: origin, NODE_ENV: 'test', DOTENV_CONFIG_QUIET: 'true', ...extra },
  });
  child.stdout.resume(); child.stderr.resume();
  const [msg] = await once(child, 'message', { signal: AbortSignal.timeout(10000) });
  base = `http://127.0.0.1:${msg.port}`;
}
async function stop() {
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit'); child.kill(); await exited;
  }
}
beforeEach(() => start());
afterEach(stop);
async function req(url, method = 'GET', body, auth = true, headers = {}) {
  const opts = { method, headers: { ...(auth ? { 'x-api-key': key } : {}), ...headers }, signal: AbortSignal.timeout(5000) };
  if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return fetch(base + url, opts);
}
async function json(url, status, method = 'GET', body, auth = true) {
  const r = await req(url, method, body, auth); assert.equal(r.status, status); return r.json();
}
test('01 GET root dan halaman lama: 200', async () => {
  for (const [url, text] of [['/', 'Halo'], ['/profil', 'Ini adalah halaman profil.'], ['/hubungi', 'hubungi saya disini.']]) {
    const r = await req(url); assert.equal(r.status, 200); assert.equal(await r.text(), text);
  }
});
test('02 GET daftar publik: 200, dua data awal', async () => {
  assert.deepEqual(await json('/mahasiswa', 200, 'GET', undefined, false), [{ id: 1, nama: 'Andi', jurusan: 'Sistem Informasi' }, { id: 2, nama: 'Budi', jurusan: 'Informatika' }]);
});
test('03 GET detail: 200 Andi', async () => { assert.equal((await json('/mahasiswa/1', 200)).nama, 'Andi'); });
test('04 Filter trim/case-insensitive: 200 Budi', async () => {
  const rows = await json('/mahasiswa?jurusan=%20informatika%20', 200); assert.equal(rows.length, 1); assert.equal(rows[0].nama, 'Budi');
});
test('05 Query jurusan berulang: 400', async () => { assert.equal((await json('/mahasiswa?jurusan=a&jurusan=b', 400)).message, 'Jurusan harus berupa teks'); });
test('06 GET ID tidak valid: 400', async () => {
  for (const id of ['abc', '0', '-1', '1abc', '9007199254740992']) assert.equal((await json('/mahasiswa/' + id, 400)).message, 'ID harus berupa bilangan bulat positif');
});
test('07 GET data hilang: 404', async () => { assert.equal((await json('/mahasiswa/99', 404)).message, 'Data tidak ditemukan'); });
test('08 POST: 201 dan data tersimpan', async () => {
  const row = await json('/mahasiswa', 201, 'POST', { nama: 'Citra', jurusan: 'Sistem Informasi' });
  assert.deepEqual(row, { id: 3, nama: 'Citra', jurusan: 'Sistem Informasi' }); assert.deepEqual(await json('/mahasiswa/3', 200), row);
});
test('09 POST tidak lengkap: 400 tanpa perubahan data', async () => {
  assert.equal((await json('/mahasiswa', 400, 'POST', { nama: 'Citra' })).message, 'nama dan jurusan wajib diisi'); assert.equal((await json('/mahasiswa', 200)).length, 2);
});
test('10 POST tanpa body: 400', async () => { await json('/mahasiswa', 400, 'POST'); });
test('11 PUT merge: 200, ID URL tetap dan GET terbarui', async () => {
  const row = await json('/mahasiswa/1', 200, 'PUT', { nama: 'Andi Baru', id: 999 });
  assert.deepEqual(row, { id: 1, nama: 'Andi Baru', jurusan: 'Sistem Informasi' }); assert.deepEqual(await json('/mahasiswa/1', 200), row);
});
test('12 PUT data hilang: 404', async () => { await json('/mahasiswa/99', 404, 'PUT', { nama: 'Baru' }); });
test('13 DELETE: 204 kosong, GET dan penghapusan ulang 404', async () => {
  const r = await req('/mahasiswa/2', 'DELETE'); assert.equal(r.status, 204); assert.equal(await r.text(), '');
  await json('/mahasiswa/2', 404); await json('/mahasiswa/2', 404, 'DELETE');
});
test('14 ID baru tidak bentrok setelah DELETE', async () => {
  await json('/mahasiswa', 201, 'POST', { nama: 'Citra', jurusan: 'SI' });
  assert.equal((await req('/mahasiswa/2', 'DELETE')).status, 204);
  const row = await json('/mahasiswa', 201, 'POST', { nama: 'Dewi', jurusan: 'SI' }); assert.equal(row.id, 4);
  const rows = await json('/mahasiswa', 200); assert.equal(new Set(rows.map(x => x.id)).size, rows.length);
});
for (const method of ['POST', 'PUT', 'DELETE']) {
  for (const mode of ['tanpa', 'salah']) test(`Auth ${method} kunci ${mode}: 401 tanpa mutasi`, async () => {
    const url = method === 'POST' ? '/mahasiswa' : '/mahasiswa/1';
    const r = await req(url, method, method === 'DELETE' ? undefined : { nama: 'X', jurusan: 'SI' }, false, mode === 'salah' ? { 'x-api-key': 'not-the-fixture' } : {});
    assert.equal(r.status, 401); assert.deepEqual(await r.json(), { message: 'API key tidak valid' });
    assert.equal((await json('/mahasiswa', 200)).length, 2); assert.equal((await json('/mahasiswa/1', 200)).nama, 'Andi');
  });
}
test('21 Konfigurasi API_KEY kosong tetap menolak: 401', async () => {
  await stop(); await start({ API_KEY: '' }); await json('/mahasiswa', 401, 'POST', { nama: 'X', jurusan: 'SI' }, false);
});
test('22 JSON rusak: 400 JSON terkontrol', async () => {
  const r = await fetch(base + '/mahasiswa', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key }, body: '{"nama":', signal: AbortSignal.timeout(5000) });
  assert.equal(r.status, 400); assert.deepEqual(await r.json(), { message: 'Format JSON tidak valid' });
});
test('23 Rute hilang: 404 JSON', async () => { assert.deepEqual(await json('/abc', 404), { message: 'Rute GET /abc tidak ditemukan' }); });
test('24 Error tak terduga: 500 hanya pesan generik', async () => {
  assert.deepEqual(await json('/error-uji', 500), { message: 'Terjadi kesalahan pada server' });
});
test('25 Production menonaktifkan error-uji: 404', async () => {
  await stop(); await start({ NODE_ENV: 'production' }); await json('/error-uji', 404);
});
test('26 CORS origin cocok: header sesuai', async () => {
  const r = await req('/mahasiswa', 'GET', undefined, false, { Origin: origin }); assert.equal(r.status, 200); assert.equal(r.headers.get('access-control-allow-origin'), origin);
});
test('27 CORS origin berbeda: header tidak cocok origin peminta', async () => {
  const other = 'https://example.invalid'; const r = await req('/mahasiswa', 'GET', undefined, false, { Origin: other });
  assert.equal(r.status, 200); assert.notEqual(r.headers.get('access-control-allow-origin'), other);
});
test('28 Preflight tanpa API key: 204 dan methods/headers', async () => {
  const r = await req('/mahasiswa/1', 'OPTIONS', undefined, false, { Origin: origin, 'Access-Control-Request-Method': 'DELETE', 'Access-Control-Request-Headers': 'content-type,x-api-key' });
  assert.equal(r.status, 204); assert.equal(await r.text(), ''); assert.equal(r.headers.get('access-control-allow-origin'), origin);
  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) assert.ok(r.headers.get('access-control-allow-methods').split(',').includes(method));
  assert.match(r.headers.get('access-control-allow-headers'), /x-api-key/i);
  assert.match(r.headers.get('access-control-allow-headers'), /content-type/i);
});
