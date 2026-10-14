/* ==========================================================================
   BURÇLAR (zodiac.js) - Batı burçları ve Çin burçları
   Çin burcu, her yılın Çin Yeni Yılı tarihine göre hesaplanır (Ocak/Şubat
   doğumlular bir önceki yılın hayvanına ait olabilir).
   ========================================================================== */

const Zodiac = {
  WESTERN: [
    { id: 'koc',     name: 'Koç',      emoji: '♈' },
    { id: 'boga',    name: 'Boğa',     emoji: '♉' },
    { id: 'ikizler', name: 'İkizler',  emoji: '♊' },
    { id: 'yengec',  name: 'Yengeç',   emoji: '♋' },
    { id: 'aslan',   name: 'Aslan',    emoji: '♌' },
    { id: 'basak',   name: 'Başak',    emoji: '♍' },
    { id: 'terazi',  name: 'Terazi',   emoji: '♎' },
    { id: 'akrep',   name: 'Akrep',    emoji: '♏' },
    { id: 'yay',     name: 'Yay',      emoji: '♐' },
    { id: 'oglak',   name: 'Oğlak',    emoji: '♑' },
    { id: 'kova',    name: 'Kova',     emoji: '♒' },
    { id: 'balik',   name: 'Balık',    emoji: '♓' }
  ],

  CHINESE: [
    { id: 'fare',    name: 'Fare',     emoji: '🐀' },
    { id: 'okuz',    name: 'Boğa',     emoji: '🐂' },
    { id: 'kaplan',  name: 'Kaplan',   emoji: '🐅' },
    { id: 'tavsan',  name: 'Tavşan',   emoji: '🐇' },
    { id: 'ejderha', name: 'Ejderha',  emoji: '🐉' },
    { id: 'yilan',   name: 'Yılan',    emoji: '🐍' },
    { id: 'at',      name: 'At',       emoji: '🐎' },
    { id: 'keci',    name: 'Keçi',     emoji: '🐐' },
    { id: 'maymun',  name: 'Tilki',    emoji: '🦊' },
    { id: 'horoz',   name: 'Horoz',    emoji: '🐓' },
    { id: 'kopek',   name: 'Köpek',    emoji: '🐕' },
    { id: 'domuz',   name: 'Geyik',    emoji: '🦌' }
  ],

  ELEMENTS: ['Maden', 'Maden', 'Su', 'Su', 'Ağaç', 'Ağaç', 'Ateş', 'Ateş', 'Toprak', 'Toprak'],

  /** Batı burcu indeksi (WESTERN dizisi) */
  westernIndex(m, d) {
    const md = m * 100 + d;
    if (md >= 1222 || md <= 119) return 9;   // Oğlak
    if (md <= 218) return 10;                // Kova
    if (md <= 320) return 11;                // Balık
    if (md <= 419) return 0;                 // Koç
    if (md <= 520) return 1;                 // Boğa
    if (md <= 620) return 2;                 // İkizler
    if (md <= 722) return 3;                 // Yengeç
    if (md <= 822) return 4;                 // Aslan
    if (md <= 922) return 5;                 // Başak
    if (md <= 1022) return 6;                // Terazi
    if (md <= 1121) return 7;                // Akrep
    return 8;                                // Yay (22 Kasım - 21 Aralık)
  },

  western(m, d) {
    const idx = this.westernIndex(m, d);
    return Object.assign({ index: idx }, this.WESTERN[idx]);
  },

  /** Çin burcu: { index, name, emoji, element, lunarYear } */
  chinese(y, m, d) {
    let cy = y;
    const table = (typeof GeoData !== 'undefined' && GeoData.cny) ? GeoData.cny : null;
    const cnyMD = table && table[y - 1900];
    if (cnyMD && (m * 100 + d) < cnyMD) cy = y - 1;
    const idx = ((cy - 4) % 12 + 12) % 12;
    return Object.assign({ index: idx, lunarYear: cy, element: this.ELEMENTS[((cy % 10) + 10) % 10] }, this.CHINESE[idx]);
  }
};
