/* ==========================================================================
   İSTATİSTİK SAYFASI ARAYÜZÜ (stats-page.js)
   StatsEngine'in sonuçlarını bölümlere çizer; dokunulan gruplarda kişi listesi açar.
   ========================================================================== */

const StatsPage = {
  reg: {},
  seq: 0,

  esc(s) { return Utils.escapeHtml(s); },
  name(p) { return StatsEngine.fullName(p); },
  num(n) { return Number(n).toLocaleString('tr-TR'); },
  oneDec(n) { return n.toFixed(1).replace('.', ','); },

  pct(p) {
    if (p >= 0.9995) return '%99,9+';
    const v = p * 100;
    return '%' + (v > 99 ? v.toFixed(2) : v.toFixed(1)).replace('.', ',');
  },

  /* ---------------- Kişi listesi penceresi (sheet) ---------------- */

  register(title, rows, sub) {
    const id = 'g' + (++this.seq);
    this.reg[id] = { title, sub: sub || '', rows };
    return id;
  },

  rows(list, noteFn) {
    return list.map(x => {
      const p = x.p || x;
      return { p, note: noteFn ? noteFn(x) : '' };
    });
  },

  defaultNote(p) {
    const b = StatsEngine.parse(p.birthDate);
    if (!b) return '';
    const date = Utils.formatDate(p.birthDate);
    if (p.deathDate) return `${date} · ${Utils.getLifeSpan(p.birthDate, p.deathDate)} 🎗️`;
    const age = Utils.calculateAge(p.birthDate, '');
    return `${date}${age !== null ? ` · ${age} yaşında` : ''}`;
  },

  open(id) {
    const g = this.reg[id];
    if (!g) return;
    const body = g.rows.length ? g.rows.map(r => `
      <div class="st-person">
        <span class="pi">${r.p.gender === 'female' ? '👩' : '👨'}</span>
        <div>
          <div class="pn">${this.esc(this.name(r.p))}${r.p.nickname ? ` <span style="color:var(--gold-light);font-weight:400;">"${this.esc(r.p.nickname)}"</span>` : ''}</div>
          <div class="pd">${this.esc(r.note || this.defaultNote(r.p))}</div>
        </div>
      </div>`).join('')
      : '<div style="padding:24px 16px; text-align:center; color:var(--text-muted); font-size:13px;">Bu günde kimsenin doğum günü yok 🎈</div>';

    document.getElementById('st-sheet-content').innerHTML = `
      <div class="st-sheet-head">
        <div>
          <div class="st-sheet-title">${this.esc(g.title)}</div>
          <div class="st-sheet-sub">${this.esc(g.sub || (g.rows.length + ' kişi'))}</div>
        </div>
        <button class="st-sheet-close" onclick="StatsPage.close()">&times;</button>
      </div>${body}`;
    document.getElementById('st-sheet-backdrop').classList.add('open');
  },

  close() {
    document.getElementById('st-sheet-backdrop').classList.remove('open');
  },

  /* ---------------- Ortak bileşenler ---------------- */

  barRow(label, count, max, regId) {
    const w = max > 0 ? Math.max(2, Math.round(count / max * 100)) : 0;
    return `<button class="bar-row" ${regId ? `onclick="StatsPage.open('${regId}')"` : ''}>
      <span class="bl">${this.esc(label)}</span>
      <span class="bar-track"><span class="bar-fill" style="display:block;width:${w}%"></span></span>
      <span class="bc">${count}</span></button>`;
  },

  level(n) { return n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 7 ? 3 : 4; },

  /* ---------------- Ana çizim ---------------- */

  render() {
    const root = document.getElementById('st-root');
    const people = Database.cache.people || {};
    if (!Object.keys(people).length) {
      root.innerHTML = '<div class="st-empty">Veriler yükleniyor…</div>';
      return;
    }
    this.reg = {};
    this.seq = 0;
    const S = StatsEngine.compute(people, new Date());
    root.innerHTML = [
      this.secSummary(S),
      this.secYear(S),
      this.secMonth(S),
      this.secDay(S),
      this.secCalendar(S),
      this.secZodiac(S),
      this.secMaps(S)
    ].join('');

    const modeEl = document.getElementById('st-mode');
    if (modeEl) modeEl.textContent = Database.isLiveFirebase ? '🔥' : '⚡';
  },

  /* ---------------- 1) Özet ---------------- */
  secSummary(S) {
    const s = S.summary;
    const tile = (v, l, sub) => `<div class="st-tile"><div class="v">${v}</div><div class="l">${l}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
    return `
    <section class="st-section" id="st-ozet">
      <h2>🌳 Ailemiz Bir Bakışta</h2>
      <div class="st-lead">Doğum tarihlerinden otomatik hesaplanan genel tablo.</div>
      <div class="st-tiles">
        ${tile(this.num(s.total), 'Kişi', `${s.living} yaşayan · ${s.deceased} vefat`)}
        ${tile(`${s.dated}`, 'Doğum tarihi kayıtlı', s.undated ? `${s.undated} kişinin tarihi yok` : 'Herkesin tarihi var ✓')}
        ${s.avgAge !== null ? tile(this.oneDec(s.avgAge), 'Ortalama yaş', `Medyan ${s.medianAge} · yaşayanlar`) : ''}
        ${s.avgAge !== null ? tile(this.num(s.totalYears), 'Toplam yaş (yıl)', 'Yaşayanların yaşları toplamı') : ''}
        ${s.oldest ? tile(`${s.oldest.age}`, 'En yaşlı (yaşayan)', this.esc(this.name(s.oldest.p))) : ''}
        ${s.youngest ? tile(`${s.youngest.age}`, 'En genç', this.esc(this.name(s.youngest.p))) : ''}
      </div>
    </section>`;
  },

  /* ---------------- 2) Aynı yıl ---------------- */
  secYear(S) {
    const Y = S.years;
    if (!Y.groups.length) return this.emptySection('st-yil', '📅 Aynı Yıl Doğanlar');
    const maxDec = Math.max(...Y.decades.map(d => d.people.length));
    const decBars = Y.decades.map(d => {
      const id = this.register(`${d.start}'lerde doğanlar`, this.rows(d.people.slice().sort((a, b) => a.birthDate.localeCompare(b.birthDate))));
      return this.barRow(`${d.start}'ler`, d.people.length, maxDec, id);
    }).join('');

    const chips = Y.clusters.map(g => {
      const id = this.register(`${g.year} doğumlular`, this.rows(g.people));
      return `<button class="chip" onclick="StatsPage.open('${id}')">${g.year} <b>${g.people.length}</b></button>`;
    }).join('');

    const top = Y.top;
    return `
    <section class="st-section" id="st-yil">
      <h2>📅 Aynı Yıl Doğanlar</h2>
      <div class="st-lead">Hangi yıllarda ailemize kaç kişi katılmış?</div>
      <div class="st-insight">
        ${top ? `En kalabalık doğum yılı <b>${top.year}</b>: tam <b>${top.people.length}</b> kişi.` : 'Aynı yılda doğan akraba yok.'}
        Ailemiz <b>${Y.distinctYears}</b> farklı yılda doğan kişilerden oluşuyor; <b>${Y.clusters.length}</b> yılda birden fazla kişi doğmuş.
      </div>
      <div class="st-sub">ONYILLARA GÖRE</div>
      ${decBars}
      ${Y.clusters.length ? `<div class="st-sub">AYNI YILDA DOĞANLAR (dokunun, isimleri görün)</div><div class="chips">${chips}</div>` : ''}
    </section>`;
  },

  /* ---------------- 3) Aynı ay ---------------- */
  secMonth(S) {
    const M = S.months;
    if (!M.max) return this.emptySection('st-ay', '🗓️ Aynı Ay Doğanlar');
    const cols = M.list.map(m => {
      const h = Math.max(2, Math.round(m.people.length / M.max * 100));
      const id = this.register(`${m.name} ayında doğanlar`, this.rows(m.people.slice().sort((a, b) => (a.birthDate.slice(5)).localeCompare(b.birthDate.slice(5)))));
      return `<button class="month-col ${m.people.length === M.max ? 'is-max' : ''}" onclick="StatsPage.open('${id}')">
        <span class="mc">${m.people.length}</span>
        <span class="mb ${m.people.length === M.min && M.min !== M.max ? 'low' : ''}" style="height:${h}%"></span>
        <span class="ml">${StatsEngine.MONTHS_SHORT[m.month - 1]}</span></button>`;
    }).join('');

    const busy = M.busiest.map(b => b.name).join(', ');
    const quiet = M.quietest.slice(0, 3).map(b => b.name).join(', ') + (M.quietest.length > 3 ? '…' : '');
    const first = M.busiest[0].month;
    const conception = StatsEngine.MONTHS[((first - 10 + 12) % 12)];
    return `
    <section class="st-section" id="st-ay">
      <h2>🗓️ Aynı Ay Doğanlar</h2>
      <div class="st-lead">Hangi aylar ailemizde doğum yoğunluğu yaşıyor?</div>
      <div class="st-insight">
        En çok doğum <b>${busy}</b> ayında (<b>${M.max}</b> kişi), en az <b>${quiet}</b> ayında (<b>${M.min}</b> kişi).<br>
        🍼 En yoğun doğum ayı ${busy.split(',')[0]} olduğuna göre, ailenin en yoğun “başlangıç” ayı yaklaşık <b>${conception}</b> demek.
      </div>
      <div class="month-chart">${cols}</div>
    </section>`;
  },

  /* ---------------- 4) Aynı gün (doğum günü ikizleri) ---------------- */
  secDay(S) {
    const D = S.days;
    const cards = D.twins.map(g => {
      const sameYear = new Set(g.people.map(x => x.year)).size < g.people.length;
      const id = this.register(`${StatsEngine.fmtDM(g.m, g.d)} doğumlular`,
        this.rows(g.people.slice().sort((a, b) => a.year - b.year), x => `${Utils.formatDate(x.p.birthDate)}${x.p.deathDate ? ' 🎗️' : ''}`));
      return `<button class="twin-card" onclick="StatsPage.open('${id}')">
        <div class="tt">🎂 ${StatsEngine.fmtDM(g.m, g.d)} · ${g.people.length} kişi${sameYear ? '<span class="tag">🎯 aynı tarih!</span>' : ''}</div>
        <div class="tn">${g.people.map(x => `${this.esc(this.name(x.p))} (${x.year})`).join(' · ')}</div></button>`;
    }).join('');

    return `
    <section class="st-section" id="st-gun">
      <h2>🎂 Aynı Gün Doğanlar</h2>
      <div class="st-lead">“Doğum günü ikizleri”: aynı gün ve ayda doğan akrabalar.</div>
      ${D.twins.length ? `
      <div class="st-insight"><b>${D.twins.length}</b> farklı günde birden fazla kişi doğmuş. Toplam <b>${D.peopleInTwins}</b> kişi, doğum gününü en az bir akrabasıyla paylaşıyor.</div>
      ${cards}` : `<div class="st-insight">Henüz aynı gün doğan iki akraba yok. İlk “doğum günü ikizi” bulunduğunda burada görünecek.</div>`}
    </section>`;
  },

  /* ---------------- 5) Doğum günü takvimi ---------------- */
  compare(actual, expected, lowerMeansSpread) {
    const diff = actual - expected;
    const rel = expected ? Math.abs(diff) / expected : 0;
    if (rel < 0.06) return 'tam beklenen düzeyde';
    if (diff > 0) return lowerMeansSpread ? 'beklenenden fazla (doğum günleri kümelenmiş)' : 'beklenenden fazla';
    return lowerMeansSpread ? 'beklenenden az (doğum günleri takvime daha dağınık)' : 'beklenenden az';
  },

  secCalendar(S) {
    const C = S.calendar;
    const E = StatsEngine;
    if (!C.n) return this.emptySection('st-takvim', '🗺️ Doğum Günü Takvimi');

    let head = '<div class="cal-head"><span></span>';
    for (let d = 1; d <= 31; d++) head += `<span>${[1, 5, 10, 15, 20, 25, 30].includes(d) ? d : ''}</span>`;
    head += '</div>';

    let rows = '';
    for (let m = 1; m <= 12; m++) {
      let cells = '';
      for (let d = 1; d <= 31; d++) {
        if (d > E.DAYS_IN_MONTH[m - 1]) { cells += '<span class="cal-cell off"></span>'; continue; }
        const idx = E.dayIndex(m, d);
        const list = C.people[idx];
        const cls = list.length >= 3 ? 'c3' : list.length === 2 ? 'c2' : list.length === 1 ? 'c1' : '';
        const isToday = S.today.m === m && S.today.d === d ? ' today' : '';
        if (list.length) {
          const id = this.register(E.fmtDM(m, d), this.rows(list, x => `${Utils.formatDate(x.p.birthDate)}${x.p.deathDate ? ' 🎗️' : ''}`));
          cells += `<button class="cal-cell ${cls}${isToday}" onclick="StatsPage.open('${id}')" title="${this.esc(E.fmtDM(m, d))}: ${this.esc(list.map(x => this.name(x.p)).join(', '))}"></button>`;
        } else {
          cells += `<span class="cal-cell${isToday}" title="${this.esc(E.fmtDM(m, d))}"></span>`;
        }
      }
      rows += `<div class="cal-row"><span class="cal-m">${E.MONTHS_SHORT[m - 1]}</span>${cells}</div>`;
    }

    const runTxt = r => `${E.fmtDM(r.from.m, r.from.d)} → ${E.fmtDM(r.to.m, r.to.d)}`;
    const bw = C.busiestWeek;
    const bwId = this.register(`${E.fmtDM(bw.from.m, bw.from.d)} – ${E.fmtDM(bw.to.m, bw.to.d)} haftası`, this.rows(bw.people));
    const busiestTxt = C.busiestDays.slice(0, 3).map(d => E.fmtDM(d.m, d.d)).join(', ') + (C.busiestDays.length > 3 ? '…' : '');

    const up = C.upcoming.slice(0, 5).map(u => {
      const when = u.inDays === 0 ? '🎉 Bugün!' : u.inDays === 1 ? 'Yarın' : `${u.inDays} gün sonra`;
      return `<div class="up-item"><span>🎂 ${this.esc(this.name(u.p))} <span style="color:var(--text-muted)">· ${u.turning}. yaş</span></span><span class="d">${when} · ${E.fmtDM(u.date.m, u.date.d)}</span></div>`;
    }).join('');

    const emptyList = C.emptyByMonth.map(x => x.days.length
      ? `<div class="dm"><b>${E.MONTHS[x.m - 1]}</b> (${x.days.length}): ${x.days.join(', ')}</div>` : '').join('');

    return `
    <section class="st-section" id="st-takvim">
      <h2>🗺️ Doğum Günü Takvimi</h2>
      <div class="st-lead">Yılın 366 gününde kimin doğum günü var? Renkli kutulara dokunun.</div>
      <div class="cal-wrap">${head}${rows}</div>
      <div class="cal-legend">
        <span><i style="background:rgba(255,255,255,0.12)"></i>Boş gün</span>
        <span><i style="background:#d4af37"></i>1 kişi</span>
        <span><i style="background:#fb923c"></i>2 kişi</span>
        <span><i style="background:#ef4444"></i>3+ kişi</span>
        <span><i style="background:transparent;outline:2px solid #34d399"></i>Bugün</span>
      </div>

      <div class="st-sub">TAKVİMİN ANALİZİ</div>
      <div class="st-insight">
        <b>${C.n}</b> kişi için rastgele dağılımda yılın ortalama <b>${this.num(Math.round(C.expectedEmpty))}</b> günü boş kalır.
        Bizde <b>${C.empty}</b> gün boş: bu, ${this.compare(C.empty, C.expectedEmpty, false)}.
        Aynı gün doğan çift sayısı <b>${C.pairs}</b>, rastgelelikte beklenen yaklaşık <b>${this.oneDec(C.expectedPairs)}</b>: ${this.compare(C.pairs, C.expectedPairs, true)}.
      </div>

      <div class="cal-stats">
        <div class="cal-stat"><div class="v">${C.nonEmpty} / 366</div><div class="l">Doğum günü olan gün</div><div class="s">Boş gün: ${C.empty}</div></div>
        <div class="cal-stat"><div class="v">${this.pct(C.probShared)}</div><div class="l">Doğum günü paradoksu</div><div class="s">${C.n} kişide en az iki kişinin aynı gün doğma ihtimali</div></div>
        <div class="cal-stat"><div class="v">${C.emptyRun.len} gün</div><div class="l">En uzun boş dönem</div><div class="s">${runTxt(C.emptyRun)}</div></div>
        <div class="cal-stat"><div class="v">${C.fullRun.len} gün</div><div class="l">Üst üste doğum günü serisi</div><div class="s">${runTxt(C.fullRun)}</div></div>
        <button class="cal-stat" onclick="StatsPage.open('${bwId}')"><div class="v">${bw.count} kişi</div><div class="l">En yoğun hafta</div><div class="s">${E.fmtDM(bw.from.m, bw.from.d)} – ${E.fmtDM(bw.to.m, bw.to.d)} (dokunun)</div></button>
        <div class="cal-stat"><div class="v">${C.maxCount} kişi</div><div class="l">En kalabalık gün</div><div class="s">${busiestTxt}</div></div>
      </div>

      ${up ? `<div class="st-sub">SIRADAKİ DOĞUM GÜNLERİ</div><div class="up-list">${up}</div>` : ''}

      <details class="st-details">
        <summary>Hiç doğum günü olmayan günler (${C.empty})</summary>
        ${emptyList}
      </details>
    </section>`;
  },

  /* ---------------- 6) Burçlar ---------------- */
  zodiacGrid(list, isChinese, detail) {
    const max = Math.max(...list.map(z => z.people.length));
    return `<div class="zodiac-grid">` + list.map(z => {
      const id = this.register(`${z.emoji} ${z.name} ${isChinese ? 'yılında' : 'burcunda'} doğanlar`,
        this.rows(z.people, isChinese ? (p => { const d = detail[p.id]; return d ? `${Utils.formatDate(p.birthDate)} · ${d.element} ${z.name} (${d.lunarYear})` : ''; }) : null));
      const cls = z.people.length === max && max > 0 ? 'top' : (z.people.length === 0 ? 'zero' : '');
      return `<button class="zt ${cls}" onclick="StatsPage.open('${id}')"><span class="ze">${z.emoji}</span><span class="zn">${z.name}</span><span class="zc">${z.people.length}</span></button>`;
    }).join('') + `</div>`;
  },

  secZodiac(S) {
    const Z = S.zodiac;
    if (!S.summary.dated) return this.emptySection('st-burc', '♈ Burçlar');
    const names = items => items.map(z => `${z.emoji} <b>${z.name}</b>`).join(' ve ');
    return `
    <section class="st-section" id="st-burc">
      <h2>♈ Batı Burçları</h2>
      <div class="st-lead">Ailemizde hangi burçtan kaç kişi var?</div>
      <div class="st-insight">En yaygın burç: ${names(Z.topWestern.items)} — <b>${Z.topWestern.max}</b> kişi.</div>
      ${this.zodiacGrid(Z.western, false)}

      <h2 style="margin-top:22px;">🐉 Çin Burçları</h2>
      <div class="st-lead">Yıla göre 12 hayvanlı döngü (Çin Yeni Yılı tarihine göre hesaplanır).</div>
      <div class="st-insight">En yaygın hayvan: ${names(Z.topChinese.items)} — <b>${Z.topChinese.max}</b> kişi.
        <br><span style="color:var(--text-muted);font-size:12px;">Ocak–Şubat doğumlularda burç, bir önceki yılın hayvanı çıkabilir.</span></div>
      ${this.zodiacGrid(Z.chinese, true, Z.chineseDetail)}
    </section>`;
  },

  /* ---------------- 7) Haritalar ---------------- */
  rankList(list, labelFn, regTitleFn) {
    const max = Math.max(...list.map(x => x.people.length), 0);
    const bar = x => this.barRow(labelFn(x), x.people.length, max, this.register(regTitleFn(x), this.rows(x.people)));
    const first = list.slice(0, 8).map(bar).join('');
    const rest = list.slice(8);
    return first + (rest.length ? `<details class="st-details"><summary>Diğer ${rest.length} yer</summary>${rest.map(bar).join('')}</details>` : '');
  },

  /**
   * Harita etiketlerini birbirine binmeyecek şekilde dikey kaydırarak yerleştirir.
   * items: [{ x, y, w, priority }], anchor: 'middle' | 'start'
   */
  placeLabels(items, h, anchor, maxX) {
    const placed = [];
    const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4];
    const hit = (a, b) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
    items.slice().sort((a, b) => b.priority - a.priority).forEach(it => {
      // Etiket harita dışına taşmasın
      if (anchor === 'middle') it.x = Math.min(Math.max(it.x, it.w / 2 + 4), maxX - it.w / 2 - 4);
      else it.x = Math.min(it.x, maxX - it.w - 4);
      for (const k of offsets) {
        const y = it.y + k * h;
        const x1 = anchor === 'middle' ? it.x - it.w / 2 : it.x;
        const box = { x1, x2: x1 + it.w, y1: y - h * 0.8, y2: y + h * 0.25 };
        if (!placed.some(b => hit(b, box))) { placed.push(box); it.py = y; return; }
      }
      it.py = it.y;
    });
    return items;
  },

  mapLegend() {
    return `<div class="map-legend">
      <span><i style="background:rgba(255,255,255,0.12)"></i>Kimse doğmamış</span>
      <span><i style="background:#7a6422"></i>1</span>
      <span><i style="background:#b8962e"></i>2–3</span>
      <span><i style="background:#e6c85a"></i>4–7</span>
      <span><i style="background:#fff2b3"></i>8+</span></div>`;
  },

  secMaps(S) {
    const P = S.places;
    const T = GeoData.turkey, G = GeoData.germany;

    // Türkiye haritası
    let trPaths = '', trLabels = '';
    const trItems = [];
    T.provinces.forEach(pr => {
      const list = P.tr[pr.n] || [];
      const lv = this.level(list.length);
      if (list.length) {
        const id = this.register(`${pr.n} doğumlular`, this.rows(list));
        trPaths += `<path class="mp m${lv}" data-has="1" d="${pr.d}" onclick="StatsPage.open('${id}')"><title>${pr.n}: ${list.length} kişi</title></path>`;
        const txt = `${pr.n} ${list.length}`;
        trItems.push({ x: pr.lx, y: pr.ly, w: txt.length * 8.6, priority: list.length, txt });
      } else {
        trPaths += `<path class="mp" d="${pr.d}"><title>${pr.n}</title></path>`;
      }
    });

    this.placeLabels(trItems, 16, 'middle', T.w).forEach(it => {
      trLabels += `<text class="map-lbl" x="${it.x}" y="${it.py}">${this.esc(it.txt)}</text>`;
    });

    // Almanya haritası
    let dePaths = '', deDots = '', deLabels = '';
    const deItems = [];
    G.states.forEach(st => {
      const list = P.deStates[st.n] || [];
      const lv = this.level(list.length);
      dePaths += `<path class="mp ${lv ? 'm' + lv : ''}" d="${st.d}"><title>${st.n}${list.length ? ': ' + list.length + ' kişi' : ''}</title></path>`;
    });
    P.deList.forEach(c => {
      const geo = G.cities.find(x => x.n === c.city);
      if (!geo) return;
      const id = this.register(`${c.city} doğumlular`, this.rows(c.people), c.state);
      const r = 6 + 2.6 * Math.sqrt(c.people.length);
      deDots += `<circle class="city-dot" cx="${geo.x}" cy="${geo.y}" r="${r.toFixed(1)}" onclick="StatsPage.open('${id}')"><title>${c.city}: ${c.people.length} kişi</title></circle>`;
      const txt = `${c.city} ${c.people.length}`;
      deItems.push({ x: geo.x + r + 4, y: geo.y + 6, w: txt.length * 9.6, priority: c.people.length, txt });
    });
    this.placeLabels(deItems, 20, 'start', G.w).forEach(it => {
      deLabels += `<text class="city-lbl" x="${it.x}" y="${it.py}">${this.esc(it.txt)}</text>`;
    });

    const notFound = [];
    P.otherList.forEach(o => notFound.push({ label: o.label, people: o.people }));
    if (P.deCountry.length) notFound.push({ label: 'Almanya (şehir yazılmamış)', people: P.deCountry });
    if (P.empty.length) notFound.push({ label: 'Doğum yeri boş', people: P.empty });
    const nfChips = notFound.map(x => {
      const id = this.register(x.label, this.rows(x.people));
      return `<button class="chip" onclick="StatsPage.open('${id}')">${this.esc(x.label)} <b>${x.people.length}</b></button>`;
    }).join('');

    const trTop = P.trList[0];
    return `
    <section class="st-section" id="st-harita">
      <h2>🇹🇷 Türkiye Haritası</h2>
      <div class="st-lead">Aile üyelerinin doğduğu iller boyandı. Renkli ile dokunun.</div>
      <div class="st-insight">
        <b>${P.trTotal}</b> kişi Türkiye'de doğmuş, <b>${P.trList.length}</b> farklı ilde.
        ${trTop ? `En çok doğum: <b>${this.esc(trTop.name)}</b> (${trTop.people.length} kişi).` : ''}
      </div>
      <div class="map-wrap"><svg viewBox="0 0 ${T.w} ${T.h}" xmlns="http://www.w3.org/2000/svg">${trPaths}${trLabels}</svg></div>
      ${this.mapLegend()}
      ${P.trList.length ? `<div class="st-sub">İLLERE GÖRE</div>${this.rankList(P.trList, x => x.name, x => `${x.name} doğumlular`)}` : ''}

      <h2 style="margin-top:26px;">🇩🇪 Almanya Haritası</h2>
      <div class="st-lead">Doğum şehirleri işaretlendi, eyaletler boyandı.</div>
      ${P.deTotal ? `<div class="st-insight">
        <b>${P.deTotal}</b> kişi Almanya'da doğmuş${P.deList.length ? `, <b>${P.deList.length}</b> farklı şehirde` : ''}${P.deCountry.length ? ` (${P.deCountry.length} kişide şehir yazılmamış)` : ''}.
      </div>` : `<div class="st-insight">Henüz Almanya'da doğan kayıt yok. Doğum yerini “Stuttgart” ya da “Köln, Almanya” gibi yazarsanız burada görünür.</div>`}
      <div class="map-wrap de"><svg viewBox="0 0 ${G.w} ${G.h}" xmlns="http://www.w3.org/2000/svg">${dePaths}${deDots}${deLabels}</svg></div>
      ${P.deList.length ? `<div class="st-sub">ŞEHİRLERE GÖRE</div>${this.rankList(P.deList, x => x.city, x => `${x.city} doğumlular`)}` : ''}

      ${notFound.length ? `
      <div class="st-sub">HARİTADA GÖSTERİLEMEYENLER</div>
      <div class="chips">${nfChips}</div>
      <div class="st-lead" style="margin-top:10px;">İpucu: Haritada çıkması için doğum yerini “İlçe, İl” (örn. <i>Çayeli, Rize</i>) veya “Şehir, Almanya” biçiminde yazın.</div>` : ''}
    </section>`;
  },

  emptySection(id, title) {
    return `<section class="st-section" id="${id}"><h2>${title}</h2><div class="st-insight">Bu bölüm için yeterli doğum tarihi verisi yok.</div></section>`;
  }
};
