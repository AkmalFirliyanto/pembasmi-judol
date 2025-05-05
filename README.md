# Pembersih Komentar Judol

Ekstensi Chrome untuk mendeteksi dan menghapus komentar judol (judi online) di YouTube.

## Apa itu Komentar Judol?

Komentar judol adalah komentar spam dari situs judi online yang seringkali muncul di video YouTube Indonesia. Komentar ini biasanya berisi nama situs judi dengan karakter Unicode khusus untuk menghindari filter YouTube.

## Fitur

- Mendeteksi komentar judol berdasarkan pola yang umum ditemukan
- Pendeteksian karakter Unicode khusus yang sering digunakan untuk mengganti huruf normal
- Normalisasi teks untuk mengenali teknik penggantian karakter yang canggih
- Deteksi berdasarkan konteks dan kombinasi kata-kata yang umum dalam komentar judol
- Menyorot komentar judol yang terdeteksi untuk memudahkan identifikasi
- Opsi untuk menghapus komentar judol secara otomatis atau manual
- Pemindaian otomatis setiap kali membuka video YouTube baru
- Antarmuka pengguna yang sederhana dan mudah digunakan

## Cara Menggunakan

1. **Instal Ekstensi**
   - Unduh repositori ini
   - Buka Chrome dan kunjungi `chrome://extensions/`
   - Aktifkan "Mode Pengembang" dengan toggle di pojok kanan atas
   - Klik "Load unpacked" dan pilih folder ekstensi ini

2. **Penggunaan**
   - Buka video YouTube apa saja
   - Klik ikon ekstensi di toolbar Chrome
   - Gunakan tombol "Pindai Komentar Judol" untuk mendeteksi komentar judol
   - Gunakan tombol "Hapus Semua Komentar Judol" untuk menghapus komentar yang terdeteksi
   - Aktifkan toggle "Hapus otomatis saat menemukan" untuk menghapus komentar secara otomatis

## Teknologi Pendeteksian

Ekstensi ini menggunakan beberapa teknik canggih untuk mendeteksi komentar judol:

1. **Normalisasi Karakter Unicode**: Mengubah karakter Unicode khusus menjadi bentuk ASCII standar untuk mendeteksi upaya penggantian karakter
2. **Analisis Kontekstual**: Memeriksa kombinasi kata dan frasa yang umum dalam komentar judol
3. **Deteksi Pola**: Mengenali pola spesifik seperti nama situs judi diikuti dengan angka (contoh: sgi88, dora77)
4. **Rasio Karakter Khusus**: Mendeteksi penggunaan karakter khusus yang berlebihan
5. **Template Database**: Menggunakan database contoh komentar judol untuk pencocokan pola

## Berkontribusi

Jika Anda menemukan pola komentar judol baru yang tidak terdeteksi, silakan buka issue atau kirim pull request dengan pola tambahan.

## Catatan Penting

Ekstensi ini tidak mengumpulkan data apa pun dan hanya berfungsi di halaman YouTube. Semua pemrosesan dilakukan secara lokal di browser Anda.