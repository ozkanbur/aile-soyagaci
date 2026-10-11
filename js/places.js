/* ==========================================================================
   DOĞUM YERİ ÇÖZÜMLEYİCİ (places.js)
   Serbest metni ("Rize", "Çayeli, Rize", "Stuttgart, Almanya") il / şehre çevirir.
   Sonuç türleri: tr (Türkiye ili), de (Almanya şehri), deCountry (sadece Almanya),
                  other (tanınmayan / yurt dışı), empty (boş)
   ========================================================================== */

const Places = {
  ready: false,
  trIndex: {},
  distIndex: {},
  deIndex: {},

  // Sık kullanılan eski/kısa il adları
  TR_ALIASES: {
    'afyonkarahisar': 'Afyon', 'urfa': 'Şanlıurfa', 'sanliurfa': 'Şanlıurfa', 'antep': 'Gaziantep',
    'maras': 'Kahramanmaraş', 'k maras': 'Kahramanmaraş', 'kmaras': 'Kahramanmaraş',
    'icel': 'Mersin', 'izmit': 'Kocaeli', 'adapazari': 'Sakarya'
  },

  // İlçe -> il (en çok kullanılanlar). Listede olmayan ilçeler "il, ilçe" yazılırsa yine bulunur.
  DISTRICTS: {
    'Rize': ['Çayeli', 'Pazar', 'Ardeşen', 'Fındıklı', 'Hemşin', 'Çamlıhemşin', 'İkizdere', 'İyidere', 'Güneysu', 'Derepazarı', 'Kalkandere'],
    'Trabzon': ['Akçaabat', 'Araklı', 'Arsin', 'Beşikdüzü', 'Çarşıbaşı', 'Çaykara', 'Dernekpazarı', 'Düzköy', 'Hayrat', 'Köprübaşı', 'Maçka', 'Of', 'Ortahisar', 'Sürmene', 'Şalpazarı', 'Tonya', 'Vakfıkebir', 'Yomra'],
    'Artvin': ['Hopa', 'Arhavi', 'Borçka', 'Yusufeli', 'Şavşat', 'Murgul', 'Ardanuç', 'Kemalpaşa'],
    'Giresun': ['Bulancak', 'Espiye', 'Tirebolu', 'Görele', 'Eynesil', 'Keşap', 'Şebinkarahisar', 'Dereli', 'Piraziz', 'Alucra'],
    'Ordu': ['Ünye', 'Fatsa', 'Perşembe', 'Altınordu', 'Gülyalı', 'Korgan', 'Kumru', 'Mesudiye'],
    'Samsun': ['Bafra', 'Çarşamba', 'Terme', 'Tekkeköy', 'Atakum', 'İlkadım', 'Canik', 'Vezirköprü'],
    'İstanbul': ['Kadıköy', 'Üsküdar', 'Beşiktaş', 'Fatih', 'Şişli', 'Bakırköy', 'Beyoğlu', 'Sarıyer', 'Maltepe', 'Kartal', 'Pendik', 'Ümraniye', 'Ataşehir', 'Bağcılar', 'Esenyurt', 'Başakşehir', 'Avcılar', 'Beylikdüzü', 'Zeytinburnu', 'Bayrampaşa', 'Eyüpsultan', 'Gaziosmanpaşa', 'Küçükçekmece', 'Sultangazi', 'Esenler', 'Güngören', 'Bahçelievler', 'Kağıthane', 'Beykoz', 'Çekmeköy', 'Sancaktepe', 'Sultanbeyli', 'Tuzla', 'Silivri', 'Çatalca', 'Büyükçekmece', 'Arnavutköy', 'Adalar', 'Şile', 'Bebek'],
    'Ankara': ['Çankaya', 'Keçiören', 'Mamak', 'Yenimahalle', 'Etimesgut', 'Sincan', 'Altındağ', 'Pursaklar', 'Gölbaşı', 'Polatlı'],
    'İzmir': ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Bayraklı', 'Çiğli', 'Karabağlar', 'Gaziemir', 'Menemen', 'Torbalı', 'Çeşme', 'Urla', 'Ödemiş', 'Tire'],
    'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'İnegöl', 'Gemlik', 'Mudanya', 'Mustafakemalpaşa'],
    'Kocaeli': ['Gebze', 'Gölcük', 'Darıca', 'Körfez', 'Derince', 'Kartepe', 'Karamürsel', 'Başiskele'],
    'Sakarya': ['Serdivan', 'Akyazı', 'Hendek', 'Karasu', 'Sapanca', 'Arifiye'],
    'Konya': ['Selçuklu', 'Meram', 'Karatay', 'Ereğli', 'Akşehir', 'Beyşehir'],
    'Antalya': ['Muratpaşa', 'Konyaaltı', 'Kepez', 'Alanya', 'Manavgat', 'Kemer', 'Serik'],
    'Adana': ['Seyhan', 'Çukurova', 'Yüreğir', 'Ceyhan', 'Kozan'],
    'Mersin': ['Tarsus', 'Erdemli', 'Silifke', 'Anamur', 'Mezitli', 'Yenişehir'],
    'Gaziantep': ['Şahinbey', 'Şehitkamil', 'Nizip', 'İslahiye'],
    'Diyarbakır': ['Bağlar', 'Kayapınar', 'Sur', 'Yenişehir', 'Bismil'],
    'Kayseri': ['Melikgazi', 'Kocasinan', 'Talas', 'Develi'],
    'Eskişehir': ['Odunpazarı', 'Tepebaşı'],
    'Tekirdağ': ['Çorlu', 'Çerkezköy', 'Süleymanpaşa', 'Malkara'],
    'Balıkesir': ['Bandırma', 'Edremit', 'Ayvalık', 'Gönen'],
    'Manisa': ['Akhisar', 'Turgutlu', 'Salihli', 'Alaşehir'],
    'Denizli': ['Pamukkale', 'Merkezefendi', 'Çivril'],
    'Muğla': ['Bodrum', 'Marmaris', 'Fethiye', 'Milas', 'Dalaman'],
    'Hatay': ['Antakya', 'İskenderun', 'Defne', 'Dörtyol'],
    'Malatya': ['Battalgazi', 'Yeşilyurt'],
    'Erzurum': ['Yakutiye', 'Palandöken', 'Aziziye'],
    'Sivas': ['Zara', 'Şarkışla'],
    'Tokat': ['Erbaa', 'Niksar', 'Turhal', 'Zile'],
    'Çorum': ['Sungurlu', 'Osmancık'],
    'Zonguldak': ['Ereğli', 'Çaycuma', 'Devrek'],
    'Kastamonu': ['Tosya', 'Taşköprü', 'Cide', 'İnebolu'],
    'Bolu': ['Gerede', 'Mudurnu']
  },

  /** Eşleştirme anahtarı: küçük harf, aksansız, noktalamasız */
  key(s) {
    s = String(s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
    s = s.replace(/ı/g, 'i').replace(/ß/g, 'ss');
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/[^a-z0-9]+/g, ' ').trim();
  },

  /** Almanca için ae/oe/ue yazımlarını da eşitler (München = Muenchen) */
  deKey(s) {
    return this.key(s).replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
  },

  init() {
    if (this.ready) return;
    (GeoData.turkey.provinces || []).forEach(p => { this.trIndex[this.key(p.n)] = p.n; });
    Object.keys(this.TR_ALIASES).forEach(a => { this.trIndex[this.key(a)] = this.TR_ALIASES[a]; });
    Object.keys(this.DISTRICTS).forEach(prov => {
      this.DISTRICTS[prov].forEach(d => {
        const k = this.key(d);
        if (!this.trIndex[k] && !this.distIndex[k]) this.distIndex[k] = prov;
      });
    });
    (GeoData.germany.cities || []).forEach(c => {
      this.deIndex[this.deKey(c.n)] = c;
      (c.a || []).forEach(a => { this.deIndex[this.deKey(a)] = c; });
    });
    this.ready = true;
  },

  candidates(text) {
    const pieces = String(text).split(/[,\/;()\n]+/).map(x => x.trim()).filter(Boolean);
    const out = [];
    const add = x => { if (x && !out.includes(x)) out.push(x); };
    add(text);
    pieces.forEach(p => add(p));
    pieces.forEach(p => p.split(/[\s\-–]+/).forEach(w => add(w)));
    return out;
  },

  resolve(raw) {
    const text = String(raw || '').trim();
    if (!text) return { kind: 'empty' };
    this.init();

    const cands = this.candidates(text);
    const hasDE = /almanya|germany|deutschland/.test(this.key(text));

    const tryTR = () => {
      for (const c of cands) {
        const k = this.key(c);
        if (this.trIndex[k]) return { kind: 'tr', province: this.trIndex[k] };
        if (this.distIndex[k]) return { kind: 'tr', province: this.distIndex[k] };
      }
      return null;
    };
    const tryDE = () => {
      for (const c of cands) {
        const city = this.deIndex[this.deKey(c)];
        if (city) return { kind: 'de', city: city.n, state: city.s };
      }
      return null;
    };

    if (hasDE) return tryDE() || { kind: 'deCountry', label: text };
    return tryTR() || tryDE() || { kind: 'other', label: text };
  }
};
