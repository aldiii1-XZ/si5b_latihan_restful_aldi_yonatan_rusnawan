require('dotenv').config(); // Muat konfigurasi sebelum membuat aplikasi.

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Logger dijalankan sebelum middleware dan route lainnya.
function logger(req, res, next) {
  const waktu = new Date().toISOString();
  console.log(`[${waktu}] ${req.method} ${req.url}`);
  next();
}

// Middleware khusus route penulisan; kunci tidak ditulis di kode.
function cekApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!process.env.API_KEY || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: 'API key tidak valid' });
  }
  next();
}

function errorHttp(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

app.use(logger);
// CORS harus sebelum route agar preflight OPTIONS dapat dijawab.
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log('1. middleware A');
  next();
});

app.use((req, res, next) => {
  console.log('2. middleware B');
  next();
});

app.get('/', (req, res) => {
  console.log('3. route handler');
  res.send('Halo');
});

app.use((req, res, next) => {
  console.log('4. middleware C');
  next();
});

app.get('/profil', (req, res) => {
  res.send('Ini adalah halaman profil.');
});

app.get('/hubungi', (req, res) => {
  res.send('hubungi saya disini.');
});

const mahasiswa = [
  { id: 1, nama: 'Andi', jurusan: 'Sistem Informasi' },
  { id: 2, nama: 'Budi', jurusan: 'Informatika' },
];

// Penghitung ID agar ID baru tidak bentrok setelah data dihapus.
let nextId = 3;

// POST /mahasiswa -> tambah data ke array (hilang saat server restart).
app.post('/mahasiswa', cekApiKey, (req, res, next) => {
  const { nama, jurusan } = req.body || {};

  if (!nama || !jurusan) {
    return next(errorHttp(400, 'nama dan jurusan wajib diisi'));
  }

  const baru = { id: nextId++, nama, jurusan };
  mahasiswa.push(baru);
  res.status(201).json(baru);
});

app.get('/mahasiswa', (req, res, next) => {
  const { jurusan } = req.query;

  if (jurusan !== undefined && typeof jurusan !== 'string') {
    return next(errorHttp(400, 'Jurusan harus berupa teks'));
  }

  if (jurusan && jurusan.trim()) {
    const filterJurusan = jurusan.trim().toLowerCase();
    const hasil = mahasiswa.filter((m) => m.jurusan.toLowerCase() === filterJurusan);
    return res.json(hasil);
  }

  res.json(mahasiswa);
});

app.get('/mahasiswa/:id', (req, res, next) => {
  const id = Number(req.params.id);

  if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id < 1) {
    return next(errorHttp(400, 'ID harus berupa bilangan bulat positif'));
  }

  const data = mahasiswa.find((m) => m.id === id);

  if (!data) return next(errorHttp(404, 'Data tidak ditemukan'));
  res.json(data);
});

// PUT /mahasiswa/:id -> ubah data; ID tetap mengikuti parameter URL.
app.put('/mahasiswa/:id', cekApiKey, (req, res, next) => {
  const id = parseInt(req.params.id);
  const index = mahasiswa.findIndex((m) => m.id === id);

  if (index === -1) {
    return next(errorHttp(404, 'Data tidak ditemukan'));
  }

  mahasiswa[index] = { ...mahasiswa[index], ...req.body, id };
  res.json(mahasiswa[index]);
});

// DELETE /mahasiswa/:id -> hapus data, respons sukses tanpa isi.
app.delete('/mahasiswa/:id', cekApiKey, (req, res, next) => {
  const id = parseInt(req.params.id);
  const index = mahasiswa.findIndex((m) => m.id === id);

  if (index === -1) {
    return next(errorHttp(404, 'Data tidak ditemukan'));
  }

  mahasiswa.splice(index, 1);
  res.status(204).send();
});

// Hanya untuk latihan lokal. Jangan aktifkan di aplikasi produksi.
if (process.env.NODE_ENV !== 'production') {
  app.get('/error-uji', () => {
    throw new Error('Kesalahan tak terduga untuk pengujian');
  });
}

// Handler 404 setelah seluruh route.
app.use((req, res) => {
  res.status(404).json({ message: `Rute ${req.method} ${req.originalUrl} tidak ditemukan` });
});

// Error handler wajib empat parameter dan berada paling bawah.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Format JSON tidak valid' });
  }

  const status = err.status || 500;
  if (status === 500) {
    console.error(err.stack);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
  res.status(status).json({ message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
