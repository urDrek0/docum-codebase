# 📘 Dokumentasi Arsitektur & Panduan Setup Projek SABR Report App

Aplikasi **SABR Report App** adalah aplikasi web manajemen laporan medis harian bertipe *Single Page Application* (SPA) sederhana yang dibuat menggunakan **Vanilla JavaScript**, **Tailwind CSS**, dan **FullCalendar JS**. Dokumen ini berfungsi sebagai referensi teknis lengkap untuk alur kerja data, integrasi API CRUD, dan panduan *deployment* ke Vercel.

---

## 🛠️ 1. Tech Stack & Arsitektur Projek

* **Frontend:** Vanilla JavaScript (ES6+ Native DOM API), Tailwind CSS (CDN/CSS Utility), FullCalendar v7.
* **Backend Endpoint:** RESTful API (Express.js / Node.js / Serverless Backend).
* **Database Target:** PostgreSQL / Supabase / MongoDB (via REST backend).
* **Hosting Frontend & Backend:** Vercel (Static Web & Serverless Functions).

### Struktur Folder Projek

```text
project-root/
│
├── index.html            # Core HTML Layout & Modals Container
├── style.css             # Tailwind / Custom CSS
├── logo/                 # Asset Gambar & Icon UI
└── app/
    └── main.js           # Core App Logic, State, Async API, & DOM Manipulations
```

---

## 🌐 2. Konfigurasi API Base URL (Dev vs Production)

Untuk kebutuhan *deployment* ke Vercel atau pengujian di lokal, pastikan deklarasi `API_URL` mudah disesuaikan:

```javascript
// Atur URL sesuai environment
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://sabr-backend.vercel.app';
```

---

## 🔄 3. Cheat Sheet Integration REST API (CRUD Pattern)

Pola integrasi API menggunakan `async/await`, `fetch`, dan penanganan *error* terstandarisasi.

### A. GET Data (Read)

Mengambil data dari backend untuk kemudian disimpan ke dalam global state.

```javascript
async function fetchDataSabr() {
    try {
        const response = await fetch(`${API_URL}/api/sabr_report`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Gagal mengambil data SABR:", error);
        return [];
    }
}
```

### B. POST & PUT Data (Create & Update)

Pola ini menggunakan pendekatan **Single Form Modal** di mana status pembuatan (Create) atau pengeditan (Update) ditentukan berdasarkan variabel `state.editId`.

```javascript
async function submitNewReport() {
    const payload = {
        tanggal_shift: document.getElementById('date-input').value,
        shift: document.getElementById('modal-shift-selector').value,
        pasien_id: selectedPasienId,
        situation: document.getElementById('situation-input').value,
        background: document.getElementById('background-input').value,
        assessment: document.getElementById('assessment-input').value,
        recommendation: document.getElementById('recommendation-input').value
    };

    // Tentukan Endpoint & HTTP Method berdasarkan keberadaan editId
    let endpoint = `${API_URL}/api/sabr_report`;
    let method = 'POST';

    if (state.editId) {
        endpoint = `${API_URL}/api/sabr_report/${state.editId}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            alert(`Gagal: ${errorData.error || 'Terjadi kesalahan saat menyimpan.'}`);
            return;
        }

        alert(method === 'POST' ? "Data Berhasil Ditambahkan" : "Data Berhasil Diperbaharui");
        
        // Refresh local state & UI
        state.dataReport = await fetchDataSabr();
        renderCurrentPage();
        state.editId = null; // Reset state edit
    } catch (error) {
        console.error("Error submitting report:", error);
        alert("Terjadi Kesalahan Jaringan.");
    }
}
```

### C. DELETE Data (Delete)

Menghapus data spesifik berdasarkan ID melalui modal konfirmasi global.

```javascript
async function executeDelete() {
    if (!state.idToDelete) return;

    try {
        const response = await fetch(`${API_URL}/api/sabr_report/${state.idToDelete}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Laporan Berhasil Dihapus');
            document.getElementById('modal-delete').classList.add('hidden');
            
            // Re-fetch data terbaru
            state.dataReport = await fetchDataSabr();
            renderCurrentPage();
        }
    } catch (error) {
        console.error("Error during deletion:", error);
        alert("Terjadi Kesalahan Jaringan.");
    }
}
```

---

## 🧠 4. Global State & Lifecycle Synchronous Execution

### Centralized State Object

Seluruh variabel pendukung antarmuka disimpan dalam satu objek `state` terpusat:

```javascript
let state = {
    currentPage: 'dashboard',
    selectedDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
    selectedShift: 'pagi',
    dataReport: [],
    dataShift: [],
    dataPegawai: [],
    dataPasien: [],
    dataShiftCounter: [],
    idToDelete: null,
    deleteType: null,
    editId: null
};
```

### Urutan Eksekusi DOMContentLoaded (CRITICAL)

Aplikasi harus menyelesaikan `initData()` **sebelum** mengeksekusi manipulasi DOM atau kalkulasi statistik:

```javascript
document.addEventListener('DOMContentLoaded', async function () {
    // 1. Inisialisasi Kalender & Event Listener UI awal
    setupCalendar();
    
    // 2. Fetch data dari backend hingga selesai (AWAIT)
    await initData();
    
    // 3. Render halaman utama & dropdown berbasis data async
    renderCurrentPage();
    statisticOptionDropdown(); 
});
```

---

## ⚡ 5. Logika Kunci & Penanganan Bug Klasik

### A. Format Index Bulan JavaScript (`0-11`)

Di JavaScript, `Date.getMonth()` mengembalikan angka dari `0` (Januari) hingga `11` (Desember).
Gunakan Objek *Dictionary* untuk *mapping* angka ke teks UI manusiawi:

```javascript
const bulanDictionary = {
    0: 'Januari', 1: 'Februari', 2: 'Maret', 3: 'April',
    4: 'Mei', 5: 'Juni', 6: 'Juli', 7: 'Agustus',
    8: 'September', 9: 'Oktober', 10: 'November', 11: 'Desember'
};
```

### B. Perbandingan Tipe Data (String vs Number)

Nilai `.value` dari elemen `<select>` HTML selalu bertipe **`String`**, sedangkan `date.getMonth()` bertipe **`Number`**.

* ❌ `"8" === 8` ➔ `false` (Bisa menyebabkan data dianggap kosong/0)
* ✅ `date.getMonth() === parseInt(monthStats)` ➔ `true`

### C. Keamanan Pengisian Teks (Anti-XSS / Safe HTML Convert)

Fungsi sanitasi untuk mencegah injeksi script jahat pada input user:

```javascript
function safeHTMLConvert(str){
    if (typeof str !== 'string') return str;
    return str.replace(/[$<>'"]/g, function(tag){
        const charsToReplace = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            "'": '&#39;', '"': '&quot;'
        };
        return charsToReplace[tag];
    });
}
```

### D. Penggabungan Option Default pada Select DOM

Untuk mencegah terhapusnya opsi "Pilih Bulan" (*placeholder*) saat pengisian dinamik:

```javascript
const defaultOption = `<option value="" selected disabled hidden>Pilih Bulan</option>`;
targetMonth.innerHTML = defaultOption + uniqueMonth.map(m => 
    `<option value="${m}">${bulanDictionary[m]}</option>`
).join('');
```

---

## 🚀 6. Panduan Deploy ke Vercel (Frontend & Backend Express.js)

### A. Deploy Frontend (Static Web)

1. **Persiapan Repositori GitHub:**
   * Pastikan struktur folder rapi (`index.html` ada di *root* atau folder terkonfigurasi).
   * Pastikan `API_URL` menunjuk ke server backend produksi Vercel kamu.

2. **Deploy via Vercel Dashboard:**
   * Login ke [Vercel Dashboard](https://vercel.com).
   * Klik **"Add New"** ➔ **"Project"** ➔ Import repositori frontend.
   * **Framework Preset:** Pilih `Other` / `Static HTML`.
   * Klik **Deploy**.

3. **Routing Configuration (`vercel.json` Frontend):**
   Jika memerlukan penanganan routing SPA agar halaman tidak 404 saat di-refresh:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

---

### B. Deploy Backend Express.js (Serverless Function)

Di Vercel, *backend* Express.js tidak dijalankan memakai `app.listen(3000)` terus-menerus, melainkan di-wrap sebagai **Serverless Function**.

#### 1. Struktur Folder Backend yang Diharuskan Vercel

```text
sabr-backend/
├── api/
│   └── index.js      <-- Entry point serverless Vercel (KODE EXPRESS ADA DI SINI)
├── package.json
└── vercel.json       <-- Konfigurasi route serverless
```

#### 2. Kode Express.js (`api/index.js`)

Pastikan kamu meng-export `app` pakai `module.exports = app;`, bukan memanggil `app.listen()`.

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// WAJIB: Atur CORS agar frontend kamu diizinkan mengambil data
app.use(cors({
    origin: '*', // Atau ganti dengan domain frontend kamu, misal 'https://sabr-app.vercel.app'
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes API kamu
app.get('/api/pasien', async (req, res) => {
    // ... logika ambil pasien
    res.json([{ id_pasien: 1, nama: 'Budi' }]);
});

app.get('/api/sabr_report', async (req, res) => {
    // ... logika ambil laporan
    res.json([]);
});

// PENTING: Export instance Express, JANGAN panggil app.listen()
module.exports = app;
```

#### 3. Konfigurasi `vercel.json` (di Root Folder Backend)

File ini menginstruksikan Vercel bahwa semua *request* HTTP yang masuk harus diarahkan ke `api/index.js`.

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.js"
    }
  ]
}
```

#### 4. Setup Environment Variables di Vercel Dashboard

Jika backend kamu terhubung ke Database (misal Supabase/PostgreSQL/MongoDB):
1. Buka project backend kamu di Vercel Dashboard.
2. Masuk ke **Settings** ➔ **Environment Variables**.
3. Tambahkan variabel kamu, misalnya:
   * `DATABASE_URL` = `postgresql://user:pass@ep-xyz.supabase.co/db`
4. Di kode Node.js, kamu tinggal panggil pakai `process.env.DATABASE_URL`.

---

## 📦 7. Panduan Environment, Installation, Stack Setup & Troubleshooting

Bagian ini dibuat sebagai panduan teknis umum ketika kamu ingin membuat projek baru, menginstal modul Node.js, atau menyelesaikan masalah pertentangan dependensi (*dependency error*).

### A. Memahami Beda Install "Satuan" vs "Sekaligus (Bundled Stack)"

| Metode | Kapan Digunakan? | Kelebihan | Kekurangan |
| :--- | :--- | :--- | :--- |
| **Satuan (Manual)** | Menambahkan modul ke projek Vanilla JS/Node yang sudah ada | Lebih ringan, kontrol penuh atas modul yang masuk | Rawan *peer dependency error* jika versi tidak cocok |
| **Sekaligus (Bundler/Starter)** | Membuat projek baru dengan *stack* modern (React, TS, Tailwind) | Otomatis terkonfigurasi, pasti kompatibel | Menghasilkan struktur folder awal yang ramai |

---

### B. Panduan Instalasi Satuan (Manual / Standalone)

Panduan ini untuk halaman HTML biasa tanpa React atau framework UI. Tailwind CSS v4 tetap memerlukan alat build; pada setup ini Vite menyajikan halaman saat development dan plugin Tailwind menghasilkan CSS dari utility class yang digunakan.

#### 1. Inisialisasi Projek Node.js
Untuk projek baru:
```bash
npm init -y
```
Jika projek sudah memiliki `package.json`, lewati langkah ini.

#### 2. Install Vite dan Tailwind CSS v4
```bash
npm install -D vite tailwindcss @tailwindcss/vite
```

#### 3. Tambahkan perintah development dan build
Tambahkan scripts berikut ke bagian `"scripts"` di `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

#### 4. Konfigurasikan Vite dengan plugin Tailwind
Buat `vite.config.mjs`. Contoh ini memakai folder `public` sebagai root halaman:
```javascript
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "public",
  plugins: [tailwindcss()],
  publicDir: false,
});
```

#### 5. Import Tailwind ke CSS
Buat `public/src/app/style.css`:
```css
@import "tailwindcss";
```

#### 6. Hubungkan CSS dan JavaScript ke HTML
Di dalam elemen `<head>` pada `public/index.html`, tambahkan:
```html
<link rel="stylesheet" href="/src/app/style.css">
```

Jika halaman menggunakan JavaScript, muat sebagai modul sebelum `</body>`:
```html
<script type="module" src="/src/app/main.js"></script>
```

Contoh penggunaan utility class:
```html
<div class="bg-blue-500 p-4 text-white">
  <h1 class="text-3xl font-bold">Tailwind aktif</h1>
</div>
```

#### 7. Menambahkan Google Fonts (Gloock dan Lexend Deca)
Google Fonts dapat dipakai langsung tanpa menginstal paket npm. Tambahkan koneksi font ke dalam `<head>` pada `public/index.html`, sebelum stylesheet:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gloock&family=Lexend+Deca&display=swap" rel="stylesheet">
```

Tambahkan class font ke `public/src/app/style.css`, setelah `@import` Tailwind. Pastikan setiap statement CSS diakhiri titik koma:
```css
@import "tailwindcss";

.font-title {
  font-family: "Gloock", serif;
  font-weight: 400;
  font-style: normal;
}

.font-content {
  font-family: "Lexend Deca", sans-serif;
  font-weight: 400;
  font-style: normal;
}
```

Gunakan class tersebut pada elemen HTML:
```html
<h1 class="font-title">Judul dengan Gloock</h1>
<p class="font-content">Teks isi dengan Lexend Deca</p>
```

#### 8. Code Base: Menampilkan Struktur Folder sebagai Kode di HTML
Kalau struktur folder ingin **ditampilkan sebagai teks di halaman web**, gunakan elemen `<pre>` dan `<code>`.

```html
<section id="code">
  <h2>Code Base</h2>
  <pre class="mt-4 overflow-x-auto rounded-lg bg-gray-900 p-6 text-sm text-green-300"><code class="language-bash">project-root/
│
├── index.html            # Core HTML Layout &amp; Modals Container
├── style.css             # Tailwind / Custom CSS
├── logo/                 # Asset Gambar &amp; Icon UI
└── app/
    └── main.js           # Core App Logic, State, Async API, &amp; DOM Manipulations</code></pre>
</section>
```

#### 9. Jalankan projek
```bash
# Menjalankan server development
npm run dev

# Membuat hasil produksi
npm run build
```

---

### C. Panduan Instalasi Stack Sekaligus (Cara Modern & Direkomendasikan)

#### 1. Setup React + TypeScript (Menggunakan Vite)
Gunakan **Vite** untuk membuat projek SPA React modern yang super cepat.
```bash
# Step 1: Jalankan wizard instalasi Vite
npm create vite@latest nama-projek-kamu -- --template react-ts

# Step 2: Masuk ke folder & install seluruh dependensinya
cd nama-projek-kamu
npm install

# Step 3: Tambahkan Tailwind CSS v4 ke dalam projek Vite ini
npm install -D tailwindcss @tailwindcss/vite
```

#### 2. Setup Fullstack React + TS + Tailwind Sekaligus (Menggunakan Next.js)
Jika butuh pengerjaan cepat dengan sistem routing otomatis:
```bash
npx create-next-app@latest nama-projek-kamu
```

---

### D. Pertolongan Pertama Error Dependensi (Troubleshooting Checklist)

Ketika muncul error berwarna merah saat `npm install`, ikuti urutan pertolongan pertama berikut:

#### 1. Error Bentrok Versi (*Peer Dependency Conflicts*)
```bash
# Solusi 1: Abaikan konflik versi ringan
npm install nama-package --legacy-peer-deps

# Solusi 2: Paksa instalasi
npm install nama-package --force
```

#### 2. Modul Korup atau Beliung (*node_modules Errors*)
```bash
# Langkah "Sapu Bersih" (Nuklir node_modules):

# Windows PowerShell:
Remove-Item -Recurse -Force node_modules, package-lock.json

# Mac/Linux/Bash:
rm -rf node_modules package-lock.json

# Bersihkan cache npm & install ulang
npm cache clean --force
npm install
```

#### 3. Versi Node.js Tidak Sesuai (*Engine Mismatch*)
```bash
# Cek versi Node.js saat ini
node -v

# Ganti versi via NVM:
nvm install 18
nvm use 18
```

---

*Dokumentasi ini diperbarui secara otomatis dengan panduan deploy Backend Serverless Express.js di Vercel.*