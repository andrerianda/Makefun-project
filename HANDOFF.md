# Serah terima: CAMPANILE (bounty make.fun `threejs-fps-02`)

Catatan untuk sesi berikutnya. Pemilik repo kerja dari HP: lapor singkat, bahasa Indonesia santai.
Hapus file ini dan `tools/` sebelum submit final kalau mau repo rapi (tidak wajib; juri hanya membaca `game/` dan `screenshots/`).

## Aturan dari pemilik

- Jangan pernah commit API key atau keypair. Simpan di luar repo.
- Submit: sudah ada izin tetap "submit + boleh resubmit", tapi pemilik mau game diuji dulu. Kalau dia bilang "tahan", tahan.
- **Tanya dulu sebelum claim hadiah.**
- Hanya kerja di branch `claude/makefun-bounty-setup-dzhuji`. Bounty catur dikerjakan sesi lain: jangan disentuh.
- Nama, peta, karakter, suara harus orisinal (jangan pakai nama game komersial). Tim: Smugglers (serang) / Wardens (bertahan).

## Larangan keras (melanggar = entri ditolak)

- **Jangan ubah**: `game/vendor/` (three.js 0.187.0 dicek byte-per-byte), `vendor/makefun-threejs.ts`, `LICENSE`, `.makefun/owner.json`, lencana di README, dan import map tunggal di `game/index.html`.
- **Jangan menyalin kode atau aset dari luar**, termasuk dari repo lain milik pemilik: semua harus ditulis di dalam sesi, karena gate transkrip mencocokkan kode dengan log. Tanpa CDN, tanpa URL luar, tanpa addon three.js lain, tanpa paket npm; `main.ts` hanya pustaka standar Node.
- Semua file game ada di dalam `game/` dengan referensi relatif (maks 993 file / 48 MiB).
- **Jangan commit rahasia** dalam bentuk apa pun, dan jangan minta pemilik menempelkannya di sesi ini.
- **Jangan force-push atau menulis ulang riwayat**, jangan push ke branch lain, jangan buat PR.
- **Jangan submit dan jangan claim.**
- Jangan pakai nama, peta, karakter, atau aset game komersial.
- Sebelum setiap push: `node tools/errs.mjs` dan `node tools/simtest.mjs 1` harus bersih.

## Tenggat dan status

- Deadline **2026-11-16T21:30Z** (17 Nov 04:30 WIB). Submission terakhir sebelum deadline yang dihitung. Kuota 5 per hari UTC, 10 total.
- **Belum ada submission.** Commit `db5fa4a` (v1) pernah lolos semua pre-submit check; v2 belum dicek ulang.
- Screenshot di `screenshots/` masih v1: **harus diambil ulang**.

## Yang dinilai (juri AI, tidak menjalankan game)

Membaca 3–4 screenshot + maksimal **163.840 byte** teks sumber, urutan: `index.html`, lalu JS urutan import dari `src/main.js`, lalu `style.css` paling akhir.
Rubrik berurutan: (1) game lengkap, (2) gunplay & gerak, (3) taktik, (4) peta & tampilan ("its own art or carefully styled geometry", "reads at a glance"), (5) kode (satu tugas per modul, sim fixed-step terpisah dari render, tanpa alokasi per-frame, state di satu tempat, tanpa duplikasi/kode mati).
Aturan lengkap: `RULES.txt` di kit (`/c/threejs-fps-02/kit`).

### Anggaran byte (kritis)

- JS + HTML sekarang **≈160,9 KB**. Semua JS hanya muat sampai ≈161,1 KB; `style.css` sudah terpotong seluruhnya dari bacaan juri.
- **Setiap tambahan JS harus dibayar dengan pemangkasan.** File model di `game/assets/*.txt` adalah aset: gratis, tidak dibaca juri.
- Cek: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`, lalu lihat baris `[Cut at ...]` di `out/dossier.json` (`text`).
- Ide pangkas: pindahkan geometri yang masih dibuat di kode (menara campanile di `level.js`) ke model kit; rapikan `index.html`.

## Arsitektur singkat

- `game/src/sim/`: simulasi murni 60 Hz, jalan headless di Node. Satu objek `state`; event ring `emit`/`drain`.
- `game/src/render/`: three.js. `kit.js` membaca model dari `assets/kit.txt` (figur, senjata, tangan), `props.txt` (properti jalan), `land.txt` (tong, mercusuar, pantai jauh). `level.js` membangun kota dari kotak tabrakan yang sama dengan sim, AO di-bake per vertex, semua properti diam digabung jadi satu mesh.
- `game/src/ui/`, `audio.js`, `input.js`: HUD, suara sintetis WebAudio, kontrol.
- `mobile/`: halaman uji HP (di luar entri).
- `tools/`: alat uji (di luar entri). Path di dalamnya mengarah ke `/home/user/Makefun-project` dan `/root/makefun/shots`; server yang diharapkan: `node tools/serve.mjs game 8124`, `node tools/serve.mjs . 8125`, `node tools/serve.mjs / 8127`.

## Cara uji

```sh
node tools/simtest.mjs 1 2 3            # pertandingan bot headless
FULL=1 node tools/balance.mjs 32        # keseimbangan sisi (12 ronde penuh)
node tools/errs.mjs                     # muat game di Chromium headless, cetak error
node tools/soak.mjs 7                   # satu pertandingan penuh di browser
node tools/deadcode.mjs                 # import/ekspor/konfig tak terpakai
W=1280 H=720 node tools/tour.mjs nama:kolom:baris:yaw:pitch   # screenshot di sel peta
node tools/scene.mjs out.jpg <seed> <detik> "<predikat js (s, a)>" 1280 720
```

`?sharp=1` mengunci resolusi (wajib untuk screenshot); `?watch=1` bot main sendiri; `?level=0..2` tingkat bot.
Chromium headless pakai swiftshader: lambat, screenshot 1280×720 bisa timeout kalau CPU sibuk.

## Sudah selesai di v2

Peta baru (gang berkelok, penutup baru), kota dari model kit, figur + senjata + tangan baru (tangan memegang senjata di FP dan TPP), audio baru (reverb, senjata berlapis, ambience), perintah radio Z/X/G, kamera bahu V, tingkat bot, senjata jatuh bisa dipungut, indikator arah tembakan, rekap kematian, resolusi adaptif, HUD tanpa alokasi per-frame, relief bump, jendela berpendar, pendar lampu, awan dan bintang, scope diperbesar.
Keseimbangan terakhir (32 pertandingan bot): penyerang 52% ronde; tim A 13, tim B 12, seri 7. **Ukur ulang sebelum menulis angka di README** (angka di README sekarang sudah usang).

## Yang masih harus dikerjakan (urut prioritas)

1. **Properti kota** (`game/assets/props.txt`): masih model sementara yang kasar. Keluhan pemilik: "obstacle harus perfect". Butuh 27 model: lamp (dengan bone `glow`), bollard, boat, table, cypress, cart, balcony, chimney, fishcrate, barrels, awning, pipe, washing, bench, pots, nets, lobsterpots, anchor, signpost, rowboat, crates, sacks, fountain, bell, stall, hull, bunting.
   Tapak tabrakan (lebar × tinggi, m) yang harus pas: barrels 1,2×1,1; stall 1,7×1; fountain 1,9×0,7 (+ pancuran 0,5×1,9); hull 1,8×1,5; cart 1,5×1,3; table 1×0,8; nets 1,4×1; sacks 1,3×0,9; cypress berdiri di atas pot batu 1,5×0,8. Properti dinding menghadap +z. Cek pas-nya: `node tools/kitshot.mjs out.jpg "m=cart,table&box=1.5x1.3,1x0.8&d=6&h=2&gap=2.6"`.
2. **Review menyeluruh v2** lalu perbaiki: juri-rubrik atas dossier, bug sim, bot/coach, klien (render/ui/input/audio), kualitas kode, kepatuhan gate, halaman HP.
3. `audio.js` mengekspor `createSynth` hanya untuk tes: jadikan non-ekspor.
4. Scope sniper: sudah diperbesar dan sekelilingnya tembus pandang; pemilik masih bisa minta lebih (mis. tanda jarak).
5. Ide pemilik: suara TTS. Tanpa aset bisa pakai `speechSynthesis` browser untuk membacakan baris radio; biayanya byte JS.
6. Ambil ulang 4 screenshot (JPEG/PNG ≤256 KiB, sisi panjang ≤1280, pendek ≥480), perbarui README (gambar + angka).
7. Bundle transkrip → `check` → submit → cek status.

## Submit: BUKAN tugas sesi ini

Submit dilakukan oleh **sesi pertama** (yang menulis catatan ini) setelah limitnya pulih: API key, keypair, kit dan log sesi pertama semuanya sudah ada di container itu. Sesi lanjutan **tidak perlu** API key, keypair, atau akses ke make.fun, dan pemilik tidak perlu menyerahkan file apa pun.

Tugas sesi lanjutan hanya:

1. Lanjutkan pekerjaan di daftar atas, commit dan push ke branch `claude/makefun-bounty-setup-dzhuji` sesering mungkin.
2. **Setiap kali berhenti (dan di akhir), push log sesi sendiri ke repo**, karena make.fun mewajibkan transkrip semua sesi yang membangun entri:

   ```sh
   tar -czf sesi2-log.tar.gz -C ~/.claude/projects -- "$(ls ~/.claude/projects | grep -i makefun | head -1)"
   git add -f sesi2-log.tar.gz && git commit -m "Add the second session's logs for the transcript bundle" && git push
   ```

   Log itu ikut publik, jadi **jangan pernah menempel API key, keypair, atau rahasia lain di sesi lanjutan** (repo yang riwayatnya memuat rahasia otomatis ditolak make.fun: `committed_secret`). Sesi pertama akan menghapus file itu dari commit final setelah membundelnya.
3. Perbarui bagian "Yang masih harus dikerjakan" di file ini supaya sesi pertama tahu apa yang sudah beres.

Yang nanti dijalankan sesi pertama (untuk catatan): `bundle` dengan `--session` untuk tiap `.jsonl` sesi lain dan sub-agen, lalu `check`, `submit`, `status` dari folder kit.
Check yang harus lolos: lencana README, About repo (website + topik `makefun`), LICENSE dengan baris SPDX, `.makefun/owner.json`, three.js 0.187.0 byte-per-byte + satu import map, semua referensi relatif di dalam `game/`, dossier identik dengan `buildDossier`, transkrip mencakup ≥30% baris kode.
