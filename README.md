# Laporan Praktikum — Latihan RESTful API

| Identitas | Keterangan |
| --- | --- |
| Nama | Aldi Yonatan Rusnawan |
| NPM | 2428240089 |
| Kelas | SI5B |
| Repository tugas | `si5b_latihan_restful_aldi_yonatan_rusnawan` |
| Tanggal pengujian | 30 September 2026, WIB |
| Status GitHub Public | **BELUM — URL menunggu publikasi dan verifikasi** |
| Status Vercel | **BELUM — URL menunggu deployment dan verifikasi** |
| Status SPON | **BELUM dikumpulkan** |

Instruksi LMS yang diberikan: laporan praktikum dalam repository GitHub Public dengan format `si5b_latihan_restful_nama`, lalu kumpulkan URL repository dan aplikasi Vercel melalui SPON. Deadline: **Kamis, 1 Oktober 2026 pukul 13:30 WIB**. Dokumen ini melaporkan hasil lokal, bukan bukti publikasi. Tidak ada screenshot atau URL deployment rekaan.

## 1. Tujuan

1. Membuat layanan HTTP data mahasiswa dengan operasi create, read, update, delete (CRUD).
2. Memahami penggunaan method, parameter URL, query string, JSON request body, dan kode status HTTP.
3. Menerapkan middleware pencatatan request, CORS, API key, pembacaan konfigurasi lingkungan, serta penanganan error terpusat.
4. Memverifikasi perilaku aplikasi melalui request HTTP nyata pada server lokal terisolasi.
5. Menyiapkan kode dan laporan untuk publikasi tanpa membocorkan konfigurasi rahasia.

## 2. Dasar konsep dan ruang lingkup

API memakai resource `/mahasiswa`. GET membaca data, POST menambah data, PUT memperbarui data, dan DELETE menghapus data. JSON menjadi format pertukaran data. Status `200` menyatakan operasi berhasil dengan respons, `201` data dibuat, `204` operasi berhasil tanpa body, `400` input bermasalah, `401` kunci tidak valid, `404` rute/data tidak ditemukan, dan `500` kesalahan server tak terduga.

- `req.params.id` berasal dari path, misalnya `/mahasiswa/1`.
- `req.query.jurusan` berasal dari query, misalnya `/mahasiswa?jurusan=Informatika`.
- `req.body` berasal dari JSON yang diproses `express.json()`.
- Middleware memproses request sesuai urutan pendaftaran. `next()` meneruskan request; `next(err)` mengirim error ke error handler.
- API key hanya melindungi POST/PUT/DELETE. GET tetap publik. CORS adalah mekanisme browser lintas origin, **bukan pengganti autentikasi**; klien HTTP non-browser tetap harus diamankan oleh cek API key.

**Penyimpanan hanya array in-memory, bukan database persisten.** Data awal adalah Andi dan Budi. Restart mengembalikan kondisi awal. Pada serverless, tidak ada jaminan data dibagikan antar-instance atau bertahan setelah cold start. `DB_URI` di `.env.example` hanya persiapan materi berikutnya; kode tidak menghubungkan database.

## 3. Alat dan versi terverifikasi

Versi berikut dibaca dari alat lokal dan hasil instalasi lockfile, bukan klaim versi terbaru:

| Alat | Hasil lokal |
| --- | --- |
| Sistem operasi | Windows, build 26200 (Python melaporkan `Windows-10-10.0.26200-SP0`) |
| Node.js | v26.9.0 |
| npm | 11.19.1 |
| Express | 5.2.1 |
| cors | 2.8.6 |
| dotenv | 18.0.4 |
| nodemon | 3.1.14 |
| Pengujian | `node:test`, `assert/strict`, dan `fetch` bawaan Node |

`npm ci` berhasil memasang 97 package, audit 98 package, dan melaporkan **0 vulnerabilities** pada saat dijalankan. Hasil audit ini bukan jaminan keamanan seluruh aplikasi. Output eksekusi ulang, versi, dan tes tersimpan di `docs/hasil-pengujian.txt`.

## 4. Struktur berkas

```text
si5b_latihan_restful_aldi_yonatan_rusnawan/
├── app.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── .vercelignore
├── README.md
├── DEPLOYMENT.md
├── requests.http
├── frontend-uji/
│   └── index.html
├── tests/
│   ├── http.test.cjs
│   └── server.cjs
└── docs/
    ├── hasil-pengujian.txt
    └── manifest-sumber.json
```

`node_modules/` hanya hasil instalasi lokal dan tidak disertakan dalam ZIP. `.env` tidak disalin dari proyek asal dan tidak dibuat sebagai bagian paket. Tidak ada inisialisasi Git/commit/push pada tahap persiapan ini.

## 5. Implementasi endpoint

| Method dan path | Fungsi | Respons utama | API key |
| --- | --- | --- | --- |
| GET `/` | Mempertahankan halaman awal latihan | 200 teks `Halo` | Tidak |
| GET `/profil` | Halaman profil latihan lama | 200 teks | Tidak |
| GET `/hubungi` | Halaman kontak latihan lama | 200 teks | Tidak |
| GET `/mahasiswa` | Seluruh data | 200 array JSON | Tidak |
| GET `/mahasiswa?jurusan=Informatika` | Filter jurusan, abaikan kapital dan spasi tepi | 200 array; 400 query bukan string | Tidak |
| GET `/mahasiswa/:id` | Detail mahasiswa | 200 objek; 400 ID tidak valid; 404 data tidak ada | Tidak |
| POST `/mahasiswa` | Tambah `nama` dan `jurusan` dengan `nextId++` | 201 objek; 400 field tidak lengkap; 401 auth | Ya |
| PUT `/mahasiswa/:id` | Gabungkan field body dengan data lama; ID URL dipertahankan | 200 objek; 404 data tidak ada; 401 auth | Ya |
| DELETE `/mahasiswa/:id` | Hapus satu data | 204 kosong; 404 data tidak ada; 401 auth | Ya |
| GET `/error-uji` | Simulasi error lokal | 500 pesan generik; **404 dalam production** | Tidak |
| OPTIONS (preflight) | Respons middleware CORS | 204 dan header CORS | Tidak |
| Rute lain | Handler rute hilang | 404 JSON | Tidak |

Contoh body POST (contoh input, bukan bukti output):

```json
{"nama":"Citra","jurusan":"Sistem Informasi"}
```

POST memeriksa keberadaan/truthiness `nama` dan `jurusan`, lalu menambah objek dengan ID otomatis. PUT mengikuti materi berupa **merge**, bukan penggantian total: field yang tidak dikirim tetap ada dan body tidak dapat mengganti ID URL. DELETE menggunakan `splice` dan mengirim body kosong. Penghitung `nextId` mencegah bentrok ID akibat penghapusan.

### Batas validasi yang sengaja tidak diubah

Kode sumber dosen/latihan tetap dipertahankan. POST belum memvalidasi tipe string atau spasi kosong secara menyeluruh; PUT belum memvalidasi setiap field atau membatasi field tambahan. PUT/DELETE memakai `parseInt`, tidak seketat GET detail, sehingga input seperti `1abc` dapat dibaca sebagai `1`. Nilai jurusan bukan string dapat membuat filter melempar error. Karena itu, laporan tidak mengklaim validasi produksi lengkap. Gunakan payload sesuai skema latihan; perbaikan lanjutan sebaiknya dimulai dengan tes gagal spesifik.

## 6. Middleware dan konfigurasi

Urutan utama: dotenv → pembuatan app → logger → CORS → parser JSON → middleware A/B → route root → middleware C → route lain → handler 404 → error handler empat parameter.

- Logger mencatat timestamp, method, dan URL. Ia ditempatkan sebelum route agar request gagal pun melewatinya.
- `cors({ origin: process.env.CORS_ORIGIN, methods: [...] })` ditempatkan sebelum route agar OPTIONS tidak terhalang auth.
- `express.json()` mengubah JSON menjadi `req.body`; JSON rusak diberi `400` dengan pesan `Format JSON tidak valid`.
- `cekApiKey` membandingkan header `x-api-key` dengan `API_KEY`. Konfigurasi kosong juga ditolak (fail-closed).
- `errorHttp` membawa status/pesan ke handler terpusat.
- Error 500 hanya mengembalikan `{ "message": "Terjadi kesalahan pada server" }`; detail stack dicatat pada stderr server, tidak dikirim ke klien.
- `NODE_ENV=production` menonaktifkan route simulasi `/error-uji`.

`PORT` default 3000. `API_KEY` harus diganti secara privat. `CORS_ORIGIN` contoh adalah `http://localhost:5173`, sesuai frontend lokal pada port tersebut. Restart backend setelah mengubah `.env`.

## 7. Cara menjalankan lokal

Prasyarat: Node dan npm tersedia. Perintah berikut dijalankan dari folder paket, bukan folder sumber PAW2.

```bash
npm ci
npm test
node --check app.js
```

Untuk menjalankan manual:

1. Salin `.env.example` menjadi `.env` menggunakan editor/file manager.
2. Ganti placeholder `API_KEY` dengan kunci lokal privat. Jangan memasukkan kunci asli ke README, frontend, atau `requests.http` yang dipublikasikan.
3. Pertahankan `PORT=3000` jika port kosong dan `CORS_ORIGIN=http://localhost:5173` bila memakai frontend contoh.
4. Jalankan `npm start` (atau `npm run dev` untuk nodemon).
5. Buka `http://localhost:3000/` dan `http://localhost:3000/mahasiswa`.
6. Gunakan contoh `requests.http` lewat alat HTTP pilihan. Untuk mengisi kunci, buat salinan bernama `requests.local.http` yang diabaikan Git. Body mutasi harus JSON dengan `Content-Type: application/json` dan header `x-api-key`.
7. Hentikan server dengan Ctrl+C. Jangan menjalankan server kedua pada port yang sudah dipakai.

Opsional untuk frontend CORS lokal: pada terminal kedua, jalankan `python -m http.server 5173 --directory frontend-uji`, lalu buka `http://localhost:5173`. Python hanya dibutuhkan untuk cara penyajian frontend ini, bukan API. Tombol melakukan GET ke localhost:3000. **Pengujian browser ini belum dilakukan dalam bukti paket**; jangan membuka file langsung dengan `file://` dan menganggap origin-nya sama.

## 8. Metode dan bukti pengujian asli

Pengujian otomatis menggunakan request HTTP nyata melalui `fetch` ke server Express pada `127.0.0.1` dan port acak dari OS (`PORT=0`). Setiap test memperoleh child process/server baru sehingga data tidak mengotori test berikutnya. API key fixture dibuat acak per server dan tidak dicetak/disimpan. Harness menangkap port listener melalui IPC; ia memuat `app.js` asli tanpa mengubah source. Child dimatikan setelah test. Server development milik pengguna tidak menjadi target.

Ini adalah penambahan regression tests terhadap kode yang sudah ada, **bukan klaim siklus RED-GREEN untuk kode aplikasi baru**. Tidak diperlukan perubahan `app.js`, sehingga tidak ada bug fix aplikasi tanpa tes terlebih dahulu. Hasil: **28 test lulus, 0 gagal, 0 dilewati**. Log mentah run ada di `docs/hasil-pengujian.txt`. Tabel berikut merangkum assertion yang benar-benar dijalankan, bukan screenshot atau respons buatan.

| Test | Bukti yang diperiksa | Hasil |
| --- | --- | --- |
| 01 | Root `Halo`, profil, hubungi: 200 dan teks cocok | LULUS |
| 02 | GET publik: tepat dua data awal | LULUS |
| 03 | Detail ID 1: 200 Andi | LULUS |
| 04 | Filter trim/case-insensitive: hanya Budi | LULUS |
| 05 | Query jurusan berulang: 400 | LULUS |
| 06 | ID abc, 0, -1, 1abc, di luar safe integer: 400 pada GET | LULUS |
| 07 | GET ID 99: 404 | LULUS |
| 08 | POST: 201 ID 3; GET membuktikan objek tersimpan | LULUS |
| 09 | POST tidak lengkap: 400; panjang data tetap dua | LULUS |
| 10 | POST tanpa body: 400 | LULUS |
| 11 | PUT: 200; field lama dipertahankan, ID tidak tertimpa; GET cocok | LULUS |
| 12 | PUT ID 99: 404 | LULUS |
| 13 | DELETE: 204 body kosong; GET/DELETE ulang: 404 | LULUS |
| 14 | POST setelah DELETE: ID 4, tidak bentrok | LULUS |
| 15–20 | POST/PUT/DELETE tanpa dan dengan kunci salah: enam test 401; data tidak berubah | LULUS |
| 21 | API_KEY server kosong: request tanpa kunci tetap 401 | LULUS |
| 22 | JSON rusak: 400 dengan pesan terkontrol | LULUS |
| 23 | Rute `/abc`: 404 JSON | LULUS |
| 24 | `/error-uji`: 500 hanya pesan generik, tidak ada stack klien | LULUS |
| 25 | NODE_ENV production: `/error-uji` 404 | LULUS |
| 26 | Origin cocok: header Allow-Origin cocok | LULUS |
| 27 | Origin berbeda: header Allow-Origin tidak cocok peminta | LULUS |
| 28 | OPTIONS tanpa kunci: 204; allow-methods dan allow-headers sesuai | LULUS |

CORS di sini diuji pada level header HTTP, **belum pada browser**. Origin yang tidak cocok masih dapat menerima status 200 lewat klien HTTP; browser yang menegakkan pembatasan origin. Tes tidak memverifikasi hosting Vercel, rendering UI, atau persistensi data serverless. Versi runtime Vercel perlu dikonfirmasi saat deployment.

## 9. Pelestarian sumber dan perubahan paket

Sumber `PAW2` tidak diedit. `app.js` (170 baris), `package.json`, `package-lock.json`, `.env.example`, dan `frontend-uji/index.html` disalin byte-identik. Hash pembanding ada di `docs/manifest-sumber.json`. Nama package internal `paw2` dipertahankan agar package/lockfile tetap sinkron; nama folder/repository mengikuti format tugas.

Berkas tambahan: README ini, panduan `DEPLOYMENT.md`, `requests.http`, dua berkas tests, log bukti, manifest hash, serta ignore rules yang mengecualikan rahasia, dependency, backup, dan log lokal. Tidak ada database/UI berlebihan, refactor source, kunci asli, atau perubahan route lama. ZIP publikasi dibuat menggunakan daftar berkas eksplisit, bukan menyalin seluruh direktori kerja.

## 10. Kesimpulan

Praktikum berhasil mempertahankan API CRUD mahasiswa dan middleware latihan, dibuktikan oleh 28 test HTTP lokal yang lulus. Pemisahan konfigurasi rahasia dari source memungkinkan persiapan repository public tanpa menyalin `.env`. Pengujian memeriksa status dan isi respons serta membaca ulang perubahan data, bukan sekadar memeriksa proses dapat dimulai.

Aplikasi tetap latihan in-memory dengan batas validasi sederhana, bukan sistem produksi atau database persisten. Langkah berikutnya adalah publikasi GitHub Public dan deployment Vercel oleh akun yang dikonfirmasi, verifikasi URL nyata serta akses tanpa login, lalu pengumpulan melalui SPON. Panduan terpisah tersedia di `DEPLOYMENT.md`.

## 11. Referensi

Materi dosen dibaca pada 30 September 2026 melalui versi Markdown halaman GitBook:

1. Rachmat Nur, **04 praktik crud** — https://rachmat-nur.gitbook.io/express/restful-api/04-praktik-crud
2. Rachmat Nur, **03 kode lengkap — Middleware dan Konfigurasi Backend** — https://rachmat-nur.gitbook.io/express/middleware-and-konfigurasi-backend/03-praktik/03-kode-lengkap
3. Vercel, **Express on Vercel**, dokumentasi resmi, diperiksa 30 September 2026 — https://vercel.com/docs/frameworks/backend/express
4. Kode lokal PAW2 dan keluaran alat: `docs/manifest-sumber.json`, `docs/hasil-pengujian.txt`.
