# Panduan publikasi GitHub dan deployment Vercel

**Status: SUDAH dipublikasikan ke GitHub Public dan SUDAH dideploy ke Vercel (1 Oktober 2026). BELUM dikumpulkan ke SPON.**
URL repository public: https://github.com/aldiii1-XZ/si5b_latihan_restful_aldi_yonatan_rusnawan
URL aplikasi Vercel: https://si5blatihanrestfulaldiyonatanrusnaw.vercel.app
Kedua URL di atas diverifikasi langsung dari keluaran GitHub CLI dan Vercel CLI, bukan ditebak dari nama.

## 1. Pemeriksaan sebelum publikasi

- Repository tugas: `si5b_latihan_restful_aldi_yonatan_rusnawan`.
- Akun GitHub dan Vercel harus milik akun yang telah dikonfirmasi Aldi.
- Isi publik hanya kode, lockfile, contoh konfigurasi tanpa rahasia, laporan dan pengujian.
- Jangan unggah `.env`, `node_modules`, backup, `requests.local.http`, token, atau kunci API asli.
- Jalankan `npm ci`, `npm test`, dan `node --check app.js`. Baca kembali file yang akan masuk Git; ignore rules tidak membersihkan file yang telanjur dilacak atau riwayat Git.
- Jangan memasukkan kunci ke source frontend. API GET tetap publik; POST/PUT/DELETE memerlukan header rahasia.
- Paket ini belum berisi `.git`; inisialisasi, commit, pembuatan repository **Public**, dan push dilakukan terpisah oleh pemilik setelah pemeriksaan.

## 2. Konfigurasi Vercel

Dokumentasi resmi Express on Vercel diperiksa 30 September 2026:
https://vercel.com/docs/frameworks/backend/express

Vercel mendukung `app.js` di root serta pola `app.listen`. Karena itu, kode sumber tidak dirombak menjadi folder `api/` atau diekspor ulang. Gunakan deteksi Express tanpa konfigurasi routing tambahan. Proyek ini tidak memerlukan `vercel.json`.

1. Setelah repository public tersedia, masuk Vercel dengan akun yang dikonfirmasi.
2. Import repository tugas dan pilih root proyek tempat `package.json` dan `app.js` berada.
3. Gunakan preset Express yang terdeteksi. Jangan menetapkan output directory frontend atau build command yang tidak ada di package scripts.
4. Pilih versi Node yang tersedia di dashboard. Pengujian lokal memakai Node v26.9.0; ketersediaan versi tersebut di proyek Vercel belum diverifikasi. Bila versi runtime berbeda, ulang pengujian pada versi itu sebelum mengklaim kesetaraan.
5. Atur environment variables untuk target Production (juga Preview bila diperlukan):

| Nama | Nilai yang harus diatur |
| --- | --- |
| `API_KEY` | Kunci baru rahasia, bukan placeholder `.env.example`; jangan dicantumkan ke laporan |
| `NODE_ENV` | `production` agar `/error-uji` tidak aktif |
| `CORS_ORIGIN` | Origin frontend yang benar, format scheme + host + port opsional, tanpa path/trailing slash |

Jangan salin `.env` ke repository. `PORT` tidak perlu dipaksa menjadi 3000 di dashboard. `DB_URI` pada contoh tidak dipakai aplikasi dan tidak membuat database.

6. Jalankan deploy melalui dashboard. Setelah perubahan environment, deploy ulang agar konfigurasi baru digunakan.
7. Catat URL yang benar-benar diberikan Vercel. Jangan menebak domain dari nama repository (nama repository memakai underscore; domain platform dapat berbeda).

## 3. Verifikasi setelah deployment

Gunakan URL hasil dashboard, bukan placeholder sebagai alamat sungguhan:

- Buka `/`: harus `200` dan `Halo`.
- GET `/mahasiswa`: `200`, JSON daftar mahasiswa.
- GET `/mahasiswa/1`: `200` pada instance dengan data awal.
- GET `/abc`: `404` JSON.
- GET `/error-uji`: harus `404` di Production; bila `500`, periksa `NODE_ENV` dan redeploy.
- POST tanpa API key: `401`; jangan mengirim kunci melalui query string.
- POST dengan kunci dan JSON valid: `201`; PUT dengan kunci: `200`; DELETE dengan kunci: `204` kosong. Verifikasi perubahan dengan GET, tetapi pahami batas array serverless di bawah.
- Uji CORS/preflight sesuai origin frontend sebenarnya; tes header bukan bukti browser telah lolos CORS.
- Buka URL aplikasi melalui jendela privat/tanpa login. Pastikan penilai dapat mengaksesnya dan tidak terhalang pengaturan akses deployment.
- Jangan mengubah status README menjadi terpublikasi sebelum repository public dan URL deployment dibaca ulang serta diuji.

## 4. Frontend dan batas deployment

`frontend-uji/index.html` dipertahankan sebagai latihan CORS **lokal**; fetch-nya menuju localhost:3000, bukan Vercel. Ia bukan halaman landing deployment dan dikecualikan dari upload Vercel. Endpoint root tetap `Halo`.

Bila nanti menambahkan halaman uji live, simpan sebagai `public/uji.html` dan gunakan `fetch('/mahasiswa')`. Dokumentasi Vercel menetapkan aset statis di `public/**`; `express.static()` diabaikan. Paket ini sengaja tidak menambah UI baru.

Data mahasiswa hanya array di memori. Bukan database persisten: restart/cold start dapat mengembalikan data awal; instance serverless berbeda tidak dijamin berbagi data. POST sukses tidak menjamin GET berikutnya pada instance lain melihat perubahan. Ini batas tugas latihan, bukan jaminan aplikasi produksi. Jangan mengisi data pribadi sungguhan untuk pengujian publik.

## 5. Pengumpulan

Setelah seluruh verifikasi selesai, isikan URL aktual repository GitHub **Public** dan URL aplikasi Vercel ke SPON sesuai instruksi LMS. Deadline yang diberikan: **Kamis, 1 Oktober 2026 pukul 13:30 WIB**. Belum ada submit dari paket lokal ini.
