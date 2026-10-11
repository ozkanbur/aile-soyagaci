/* ==========================================================================
   İSTATİSTİK MOTORU (stats-engine.js)
   Arayüzden bağımsız, yalnızca hesaplama yapar:
   aynı yıl / ay / gün, doğum günü takvimi, burçlar ve doğum yeri dağılımı.
   ========================================================================== */

const StatsEngine = {
  MONTHS: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  MONTHS_SHORT: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  DAYS_IN_MONTH: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],   // Şubat 29 (artık yıl dahil)

  fullName(p) { return `${p.firstName || ''} ${p.lastName || ''}`.trim(); },

  parse(str) {
    if (!str) return null;
    const a = String(str).split('-');
    if (a.length !== 3) return null;
    const o = { y: parseInt(a[0], 10), m: parseInt(a[1], 10), d: parseInt(a[2], 10) };
    if (isNaN(o.y) || isNaN(o.m) || isNaN(o.d) || o.m < 1 || o.m > 12 || o.d < 1 || o.d > 31) return null;
    return o;
  },

  ageAt(b, ref) {
    let age = ref.y - b.y;
    if (ref.m < b.m || (ref.m === b.m && ref.d < b.d)) age--;
    return age;
  },

  fmtDM(m, d) { return `${d} ${this.MONTHS[m - 1]}`; },

  /** Yılın gün indeksi (0-365), Şubat 29 dahil */
  dayIndex(m, d) {
    let i = 0;
    for (let k = 1; k < m; k++) i += this.DAYS_IN_MONTH[k - 1];
    return i + d - 1;
  },

  fromDayIndex(i) {
    let m = 1;
    while (i >= this.DAYS_IN_MONTH[m - 1]) { i -= this.DAYS_IN_MONTH[m - 1]; m++; }
    return { m, d: i + 1 };
  },

  isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; },

  /** Doğum günü ertesi yıl 29 Şubat'a denk gelmiyorsa 28 Şubat sayılır */
  nextBirthdayDate(b, today) {
    const mk = y => {
      let d = b.d;
      if (b.m === 2 && b.d === 29 && !this.isLeap(y)) d = 28;
      return { y, m: b.m, d };
    };
    let cand = mk(today.y);
    const key = x => x.y * 10000 + x.m * 100 + x.d;
    if (key(cand) < key(today)) cand = mk(today.y + 1);
    return cand;
  },

  daysBetween(a, b) {
    const ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
    return Math.round(ms / 86400000);
  },

  compute(peopleDict, todayDate) {
    const all = Object.values(peopleDict || {});
    const t = todayDate || new Date();
    const today = { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };

    const dated = [];
    all.forEach(p => {
      const b = this.parse(p.birthDate);
      if (b) dated.push({ p, b });
    });

    return {
      today,
      summary: this.summary(all, dated, today),
      years: this.years(dated),
      months: this.months(dated),
      days: this.days(dated),
      calendar: this.calendar(dated, today),
      zodiac: this.zodiac(dated),
      places: this.places(all)
    };
  },

  /* ---------------------------- Özet ---------------------------- */
  summary(all, dated, today) {
    const living = dated.filter(x => !x.p.deathDate);
    const ages = living.map(x => ({ p: x.p, age: this.ageAt(x.b, today) })).filter(x => x.age >= 0);
    ages.sort((a, b) => a.age - b.age);
    const sum = ages.reduce((s, x) => s + x.age, 0);
    const mid = ages.length ? ages[Math.floor(ages.length / 2)].age : null;
    return {
      total: all.length,
      dated: dated.length,
      undated: all.length - dated.length,
      living: all.filter(p => !p.deathDate).length,
      deceased: all.filter(p => !!p.deathDate).length,
      avgAge: ages.length ? sum / ages.length : null,
      medianAge: mid,
      oldest: ages.length ? ages[ages.length - 1] : null,
      youngest: ages.length ? ages[0] : null,
      totalYears: sum
    };
  },

  /* ---------------------------- Aynı yıl ---------------------------- */
  years(dated) {
    const map = {};
    dated.forEach(x => { (map[x.b.y] = map[x.b.y] || []).push(x.p); });
    const list = Object.keys(map).map(y => ({ year: parseInt(y, 10), people: map[y] }));
    const clusters = list.filter(g => g.people.length >= 2)
      .sort((a, b) => b.people.length - a.people.length || a.year - b.year);

    const decMap = {};
    list.forEach(g => {
      const dec = Math.floor(g.year / 10) * 10;
      (decMap[dec] = decMap[dec] || []).push(...g.people);
    });
    const decades = Object.keys(decMap).map(k => ({ start: parseInt(k, 10), people: decMap[k] }))
      .sort((a, b) => a.start - b.start);

    return {
      groups: list.sort((a, b) => a.year - b.year),
      clusters,
      decades,
      distinctYears: list.length,
      top: clusters[0] || null
    };
  },

  /* ---------------------------- Aynı ay ---------------------------- */
  months(dated) {
    const arr = [];
    for (let m = 1; m <= 12; m++) arr.push({ month: m, name: this.MONTHS[m - 1], people: [] });
    dated.forEach(x => arr[x.b.m - 1].people.push(x.p));
    const counts = arr.map(a => a.people.length);
    const max = Math.max(...counts), min = Math.min(...counts);
    return {
      list: arr,
      max,
      min,
      busiest: arr.filter(a => a.people.length === max && max > 0),
      quietest: arr.filter(a => a.people.length === min)
    };
  },

  /* ---------------------------- Aynı gün (doğum günü ikizleri) ---------------------------- */
  days(dated) {
    const map = {};
    dated.forEach(x => {
      const k = x.b.m * 100 + x.b.d;
      (map[k] = map[k] || []).push({ p: x.p, year: x.b.y });
    });
    const twins = Object.keys(map).map(k => {
      const key = parseInt(k, 10);
      return { m: Math.floor(key / 100), d: key % 100, people: map[k] };
    }).filter(g => g.people.length >= 2)
      .sort((a, b) => b.people.length - a.people.length || (a.m - b.m) || (a.d - b.d));
    return { twins, peopleInTwins: twins.reduce((s, g) => s + g.people.length, 0), map };
  },

  /* ---------------------------- Doğum günü takvimi ---------------------------- */
  calendar(dated, today) {
    const N = 366;
    const people = Array.from({ length: N }, () => []);
    dated.forEach(x => { people[this.dayIndex(x.b.m, x.b.d)].push(x); });
    const counts = people.map(a => a.length);
    const n = dated.length;

    const nonEmpty = counts.filter(c => c > 0).length;
    const empty = N - nonEmpty;
    const expectedEmpty = N * Math.pow(1 - 1 / N, n);

    let pairs = 0;
    counts.forEach(c => { pairs += c * (c - 1) / 2; });
    const expectedPairs = (n * (n - 1) / 2) / N;

    // En az iki kişinin aynı gün doğma olasılığı (klasik doğum günü paradoksu, 365 gün)
    let probNoShare = 1;
    for (let i = 0; i < n && i < 365; i++) probNoShare *= (365 - i) / 365;
    const probShared = n > 365 ? 1 : 1 - probNoShare;

    // Dairesel en uzun boş seri / en uzun dolu seri
    const longestRun = (pred) => {
      let best = { len: 0, start: 0 }, cur = 0, start = 0;
      for (let i = 0; i < N * 2; i++) {
        if (pred(counts[i % N])) {
          if (cur === 0) start = i;
          cur++;
          if (cur > best.len) best = { len: Math.min(cur, N), start: start % N };
        } else cur = 0;
      }
      return best;
    };
    const emptyRun = longestRun(c => c === 0);
    const fullRun = longestRun(c => c > 0);
    const runInfo = r => ({
      len: r.len,
      from: this.fromDayIndex(r.start),
      to: this.fromDayIndex((r.start + r.len - 1) % N)
    });

    // En yoğun 7 günlük pencere (dairesel)
    let bestWeek = { count: -1, start: 0 };
    for (let s = 0; s < N; s++) {
      let c = 0;
      for (let k = 0; k < 7; k++) c += counts[(s + k) % N];
      if (c > bestWeek.count) bestWeek = { count: c, start: s };
    }
    const weekPeople = [];
    for (let k = 0; k < 7; k++) people[(bestWeek.start + k) % N].forEach(x => weekPeople.push(x.p));

    const maxCount = Math.max(...counts);
    const busiestDays = [];
    counts.forEach((c, i) => { if (c === maxCount && c > 0) busiestDays.push(this.fromDayIndex(i)); });

    // Ay ay boş günler
    const emptyByMonth = [];
    for (let m = 1; m <= 12; m++) {
      const list = [];
      for (let d = 1; d <= this.DAYS_IN_MONTH[m - 1]; d++) {
        if (counts[this.dayIndex(m, d)] === 0) list.push(d);
      }
      emptyByMonth.push({ m, days: list });
    }

    // Sıradaki doğum günleri (hayattaki kişiler)
    const upcoming = dated.filter(x => !x.p.deathDate).map(x => {
      const nb = this.nextBirthdayDate(x.b, today);
      return { p: x.p, date: nb, inDays: this.daysBetween(today, nb), turning: nb.y - x.b.y };
    }).sort((a, b) => a.inDays - b.inDays || this.fullName(a.p).localeCompare(this.fullName(b.p), 'tr'));

    return {
      n, counts, people, nonEmpty, empty, expectedEmpty,
      pairs, expectedPairs, probShared,
      emptyRun: runInfo(emptyRun),
      fullRun: runInfo(fullRun),
      busiestWeek: {
        count: bestWeek.count,
        from: this.fromDayIndex(bestWeek.start),
        to: this.fromDayIndex((bestWeek.start + 6) % N),
        people: weekPeople
      },
      maxCount, busiestDays, emptyByMonth, upcoming
    };
  },

  /* ---------------------------- Burçlar ---------------------------- */
  zodiac(dated) {
    const western = Zodiac.WESTERN.map(z => Object.assign({ people: [] }, z));
    const chinese = Zodiac.CHINESE.map(z => Object.assign({ people: [] }, z));
    const chineseDetail = {};   // personId -> {element, lunarYear}
    dated.forEach(x => {
      western[Zodiac.westernIndex(x.b.m, x.b.d)].people.push(x.p);
      const c = Zodiac.chinese(x.b.y, x.b.m, x.b.d);
      chinese[c.index].people.push(x.p);
      chineseDetail[x.p.id] = { element: c.element, lunarYear: c.lunarYear };
    });
    const top = list => {
      const max = Math.max(...list.map(z => z.people.length));
      return { max, items: list.filter(z => z.people.length === max && max > 0) };
    };
    return { western, chinese, chineseDetail, topWestern: top(western), topChinese: top(chinese) };
  },

  /* ---------------------------- Doğum yerleri ---------------------------- */
  places(all) {
    const tr = {}, deCities = {}, deStates = {}, other = {};
    const empty = [], deCountry = [];
    all.forEach(p => {
      const r = Places.resolve(p.birthPlace);
      if (r.kind === 'empty') empty.push(p);
      else if (r.kind === 'tr') (tr[r.province] = tr[r.province] || []).push(p);
      else if (r.kind === 'de') {
        const c = deCities[r.city] = deCities[r.city] || { city: r.city, state: r.state, people: [] };
        c.people.push(p);
        (deStates[r.state] = deStates[r.state] || []).push(p);
      } else if (r.kind === 'deCountry') deCountry.push(p);
      else (other[r.label] = other[r.label] || []).push(p);
    });

    const trList = Object.keys(tr).map(n => ({ name: n, people: tr[n] })).sort((a, b) => b.people.length - a.people.length || a.name.localeCompare(b.name, 'tr'));
    const deList = Object.values(deCities).sort((a, b) => b.people.length - a.people.length || a.city.localeCompare(b.city, 'tr'));
    const otherList = Object.keys(other).map(l => ({ label: l, people: other[l] })).sort((a, b) => b.people.length - a.people.length);

    const sum = list => list.reduce((s, x) => s + x.people.length, 0);
    return {
      tr, trList, trTotal: sum(trList),
      deCities, deList, deStates, deTotal: sum(deList) + deCountry.length, deCountry,
      otherList, otherTotal: sum(otherList),
      empty
    };
  }
};
