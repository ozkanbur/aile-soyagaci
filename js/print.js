/* ==========================================================================
   PRINT CONTROLLER (print.js)
   Uygulamanın görünümüyle (lacivert zemin, altın çerçeve, koleksiyon kartları)
   tek parça vektör (SVG) poster üretir:
   - Tek SVG: zemin, çerçeve, başlık, kartlar ve alt bilgi sayfaya tam oturur
   - Ağaç dikse A4 dikey, genişse A4 yatay seçilir
   - Katlanmış dallar gizli kalır (ekranda ne görünüyorsa o basılır)
   ========================================================================== */

const PrintManager = {
  CARD_W: 220,
  CARD_H: 310,
  MARGIN_MM: 5,
  isPrepared: false,

  init() {
    window.addEventListener('beforeprint', () => this.prepare());
    window.addEventListener('afterprint', () => this.cleanup());
  },

  /** Yazdır butonu: önce fotoğrafları yükle, sonra yazdır */
  async triggerPrint() {
    const cards = document.querySelectorAll('#nodes-group foreignObject');
    if (!cards.length) {
      Utils.showToast('Yazdırılacak ağaç bulunamadı.', 'error');
      return;
    }
    await this.preloadPhotos();
    this.prepare();
    setTimeout(() => window.print(), 200);
  },

  preloadPhotos() {
    const urls = Object.values(Database.cache.people || {}).map(p => p.photoUrl).filter(Boolean);
    const loads = urls.map(u => new Promise(res => {
      const img = new Image();
      img.onload = img.onerror = () => res();
      img.src = u;
    }));
    return Promise.race([Promise.all(loads), new Promise(res => setTimeout(res, 3000))]);
  },

  /** Kart yerleşimini ekrandaki foreignObject'lerden okur (katlanmış dallar dahil edilmez) */
  readLayout() {
    const nodes = [];
    document.querySelectorAll('#nodes-group foreignObject').forEach(fo => {
      const badge = fo.querySelector('.card-generation-badge');
      nodes.push({
        id: fo.getAttribute('data-person-id'),
        x: parseFloat(fo.getAttribute('x')),
        y: parseFloat(fo.getAttribute('y')),
        gen: badge ? badge.textContent.trim() : '',
        isCenter: !!fo.querySelector('.person-card.is-center')
      });
    });
    return nodes;
  },

  truncate(str, max) {
    str = str || '';
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  },

  defs() {
    return `
      <defs>
        <linearGradient id="pBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a1128"/><stop offset="1" stop-color="#0d1731"/>
        </linearGradient>
        <radialGradient id="pGlowTop" cx="0.5" cy="0" r="0.75">
          <stop offset="0" stop-color="#d4af37" stop-opacity="0.20"/>
          <stop offset="1" stop-color="#d4af37" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="pGlowBr" cx="0.85" cy="0.9" r="0.6">
          <stop offset="0" stop-color="#3b82f6" stop-opacity="0.10"/>
          <stop offset="1" stop-color="#3b82f6" stop-opacity="0"/>
        </radialGradient>
        <pattern id="pGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1"/>
        </pattern>
        <linearGradient id="pGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d4af37"/><stop offset="0.5" stop-color="#f4e285"/><stop offset="1" stop-color="#aa820a"/>
        </linearGradient>
        <linearGradient id="pGoldH" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#aa820a"/><stop offset="0.3" stop-color="#f4e285"/>
          <stop offset="0.5" stop-color="#d4af37"/><stop offset="0.7" stop-color="#f4e285"/><stop offset="1" stop-color="#aa820a"/>
        </linearGradient>
        <linearGradient id="pCard" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stop-color="#1c2541"/><stop offset="1" stop-color="#0e1529"/>
        </linearGradient>
        <linearGradient id="pCardC" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stop-color="#253257"/><stop offset="1" stop-color="#121d3a"/>
        </linearGradient>
        <radialGradient id="pAvM" cx="0.3" cy="0.3" r="0.85">
          <stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#0a1128"/>
        </radialGradient>
        <radialGradient id="pAvF" cx="0.3" cy="0.3" r="0.85">
          <stop offset="0" stop-color="#831843"/><stop offset="1" stop-color="#0a1128"/>
        </radialGradient>
        <linearGradient id="pDiv" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#d4af37" stop-opacity="0"/>
          <stop offset="0.5" stop-color="#d4af37" stop-opacity="0.65"/>
          <stop offset="1" stop-color="#d4af37" stop-opacity="0"/>
        </linearGradient>
      </defs>`;
  },

  cardSvg(node, person, idx, counts) {
    const W = this.CARD_W, H = this.CARD_H;
    const { x, y } = node;
    const esc = Utils.escapeHtml;
    const female = person.gender === 'female';
    const accent = female ? '#ec4899' : '#3b82f6';
    const deceased = !!person.deathDate;
    const fullName = `${person.firstName} ${person.lastName}`.trim();
    const nameSize = fullName.length > 20 ? 13 : (fullName.length > 15 ? 15 : 17);
    const initials = ((person.firstName || '').charAt(0) + (person.lastName || '').charAt(0)).toUpperCase() || 'A';
    const cx = x + W / 2;
    const cy = y + 98;
    const isC = node.isCenter;
    const topOffset = isC ? 12 : 0;   // merkez kişi bandı için aşağı kaydır
    const occupation = this.truncate(person.occupation, 28);
    const place = this.truncate(person.birthPlace, 28);

    const avatar = person.photoUrl
      ? `<clipPath id="pc${idx}"><circle cx="${cx}" cy="${cy}" r="49"/></clipPath>
         <circle cx="${cx}" cy="${cy}" r="49" fill="#0a1128"/>
         <image href="${esc(person.photoUrl)}" x="${cx - 49}" y="${cy - 49}" width="98" height="98"
                preserveAspectRatio="xMidYMid slice" clip-path="url(#pc${idx})"/>`
      : `<circle cx="${cx}" cy="${cy}" r="49" fill="url(#${female ? 'pAvF' : 'pAvM'})"/>
         <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="Cinzel, Georgia, serif"
               font-size="34" font-weight="700" fill="#f4e285">${esc(initials)}</text>
         <text x="${cx}" y="${cy + 24}" text-anchor="middle" font-family="Outfit, Arial, sans-serif"
               font-size="10" fill="#94a3b8">${esc(this.truncate(person.firstName, 14))}</text>`;

    const statusFill = deceased ? '#6b7280' : '#10b981';

    const countCols = `
        <text x="${cx}" y="${y + H - 22}" text-anchor="middle"
              font-family="Outfit, Arial, sans-serif" font-size="14" font-weight="700" fill="#f4e285">${counts.children}</text>
        <text x="${cx}" y="${y + H - 10}" text-anchor="middle"
              font-family="Outfit, Arial, sans-serif" font-size="9" fill="#94a3b8">Çocuk</text>`;

    return `
      <g>
        <clipPath id="cc${idx}"><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="14"/></clipPath>
        ${isC ? `<rect x="${x - 5}" y="${y - 5}" width="${W + 10}" height="${H + 10}" rx="18" fill="none" stroke="#d4af37" stroke-opacity="0.35" stroke-width="6"/>` : ''}
        <rect x="${x}" y="${y}" width="${W}" height="${H}" rx="14" fill="url(#${isC ? 'pCardC' : 'pCard'})"
              stroke="#d4af37" stroke-opacity="${isC ? 1 : 0.6}" stroke-width="${isC ? 3 : 2}"/>
        <rect x="${x}" y="${y}" width="${W}" height="5" fill="${accent}" clip-path="url(#cc${idx})"/>
        ${isC ? `
          <rect x="${x}" y="${y}" width="${W}" height="16" fill="url(#pGold)" clip-path="url(#cc${idx})"/>
          <text x="${cx}" y="${y + 12}" text-anchor="middle" font-family="Outfit, Arial, sans-serif"
                font-size="9" font-weight="800" letter-spacing="1.6" fill="#0a1128">★ MERKEZ KİŞİ ★</text>` : ''}

        <rect x="${x + 10}" y="${y + 16 + topOffset}" width="${Math.max(56, node.gen.length * 6.4 + 14)}" height="18" rx="9"
              fill="#0a1128" fill-opacity="0.85" stroke="#d4af37" stroke-opacity="0.6"/>
        <text x="${x + 17}" y="${y + 29 + topOffset}" font-family="Outfit, Arial, sans-serif" font-size="9.5"
              font-weight="700" letter-spacing="0.6" fill="#f4e285">${esc(node.gen)}</text>

        <rect x="${x + W - 38}" y="${y + 16 + topOffset}" width="28" height="18" rx="9"
              fill="${statusFill}" fill-opacity="0.18" stroke="${statusFill}" stroke-opacity="0.45"/>
        ${deceased
          ? `<text x="${x + W - 24}" y="${y + 29.5 + topOffset}" text-anchor="middle" font-size="11">🎗️</text>`
          : `<circle cx="${x + W - 24}" cy="${y + 25 + topOffset}" r="4.5" fill="#10b981"/>`}

        <circle cx="${cx}" cy="${cy}" r="54" fill="url(#pGold)"/>
        ${avatar}

        <text x="${cx}" y="${y + 178}" text-anchor="middle" font-family="Cinzel, Georgia, serif"
              font-size="${nameSize}" font-weight="700" fill="#f8f9fa">${esc(fullName)}</text>
        ${person.nickname ? `<text x="${cx}" y="${y + 195}" text-anchor="middle" font-family="Outfit, Arial, sans-serif"
              font-size="12" font-style="italic" fill="#f4e285">"${esc(this.truncate(person.nickname, 24))}"</text>` : ''}
        <text x="${cx}" y="${y + 216}" text-anchor="middle" font-family="Outfit, Arial, sans-serif"
              font-size="13" font-weight="600" letter-spacing="0.6" fill="#94a3b8">${esc(Utils.getLifeSpan(person.birthDate, person.deathDate))}</text>

        <rect x="${x + W * 0.1}" y="${y + 226}" width="${W * 0.8}" height="1.5" fill="url(#pDiv)"/>
        ${occupation ? `<text x="${cx}" y="${y + 243}" text-anchor="middle" font-family="Outfit, Arial, sans-serif"
              font-size="11.5" fill="#cbd5e1">${esc(occupation)}</text>` : ''}
        ${place ? `<text x="${cx}" y="${y + 257}" text-anchor="middle" font-family="Outfit, Arial, sans-serif"
              font-size="10.5" fill="#94a3b8">${esc(place)}</text>` : ''}

        <line x1="${x + 14}" y1="${y + H - 40}" x2="${x + W - 14}" y2="${y + H - 40}" stroke="#ffffff" stroke-opacity="0.08"/>
        ${countCols}
      </g>`;
  },

  /** Bağlantı çizgileri: ekrandakiyle aynı renkler (altın eş çizgisi, mavi dal çizgileri) */
  linesSvg() {
    const group = document.getElementById('lines-group');
    if (!group) return '';
    let out = '';
    Array.from(group.children).forEach(el => {
      const tag = el.tagName.toLowerCase();
      const cls = el.getAttribute('class') || '';
      if (tag === 'path') {
        let color = '#3b82f6';
        if (cls.includes('spouse-line')) color = '#d4af37';
        else if (cls.includes('parent-trunk-line')) color = '#f4e285';
        out += `<path d="${el.getAttribute('d')}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      } else if (tag === 'g' && cls.includes('spouse-junction-node')) {
        const c = el.querySelector('circle');
        if (c) {
          const mx = c.getAttribute('cx'), my = c.getAttribute('cy');
          out += `<circle cx="${mx}" cy="${my}" r="12" fill="#d4af37" stroke="#0a1128" stroke-width="2.5"/>
                  <text x="${mx}" y="${parseFloat(my) + 4.5}" text-anchor="middle" font-size="12">💍</text>`;
        }
      } else if (tag === 'circle') {
        out += `<circle cx="${el.getAttribute('cx')}" cy="${el.getAttribute('cy')}" r="5" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>`;
      }
    });
    return out;
  },

  prepare() {
    const nodes = this.readLayout();
    if (!nodes.length) return;

    // 1. Ağacın sınırları
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + this.CARD_W);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + this.CARD_H);
    });
    const treeW = maxX - minX;
    const treeH = maxY - minY;

    // 2. Başlık/alt bilgi ölçüleri (ağaç genişliğine orantılı)
    const titleSize = Math.min(96, Math.max(46, treeW / 17));
    const headerH = titleSize * 2.7;
    const footerH = titleSize * 1.0;
    const pad = 50;
    const framePad = 90;

    const contentW = treeW + pad * 2 + framePad * 2;
    const contentH = headerH + treeH + pad * 2 + footerH + framePad * 2;

    // 3. Yönelim ve sayfa ölçüsü
    const landscape = contentW / contentH > 1.1;
    const pageW = landscape ? 297 : 210;
    const pageH = landscape ? 210 : 297;
    const innerW = pageW - this.MARGIN_MM * 2 - 0.6;
    const innerH = pageH - this.MARGIN_MM * 2 - 1.2;
    const scale = Math.min(innerW / contentW, innerH / contentH);   // mm / birim
    const vbW = innerW / scale;
    const vbH = innerH / scale;
    const contentX = minX - pad - framePad;
    const contentY = minY - headerH - pad - framePad;
    const vbX = contentX - (vbW - contentW) / 2;
    const vbY = contentY - (vbH - contentH) / 2;

    let pageStyle = document.getElementById('print-page-style');
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = 'print-page-style';
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: ${this.MARGIN_MM}mm; }`;

    // 4. Kişi kartları
    const people = Database.cache.people || {};
    const rels = Database.cache.relationships || {};
    const cardsSvg = nodes.map((n, i) => {
      const p = people[n.id];
      if (!p) return '';
      const counts = {
        parents: Relationships.getParents(p.id, people, rels).length,
        spouses: Relationships.getSpouses(p.id, people, rels).length,
        children: Relationships.getChildren(p.id, people, rels).length
      };
      return this.cardSvg(n, p, i, counts);
    }).join('');

    // 5. Başlık, çerçeve, alt bilgi
    const cxMid = (minX + maxX) / 2;
    const headTop = minY - pad - headerH;
    const u = 1 / scale;                          // 1 mm = u birim
    const frameOuter = 2.2 * u, frameInner = 5 * u;
    const peopleArr = Object.values(people);
    const living = peopleArr.filter(p => !p.deathDate).length;
    const todayStr = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    const footY = maxY + pad + footerH * 0.55;
    const footSize = titleSize * 0.27;
    const orn = titleSize * 0.22;
    const ornY = headTop + titleSize * 2.25;
    const halfLine = Math.min(treeW * 0.28, titleSize * 7);

    const header = `
      <text x="${cxMid}" y="${headTop + titleSize * 1.0}" text-anchor="middle" font-family="Cinzel, Georgia, serif"
            font-size="${titleSize}" font-weight="800" letter-spacing="${titleSize * 0.08}" fill="url(#pGoldH)">${Utils.escapeHtml(CONFIG.FAMILY_NAME)} SOYAĞACI</text>
      <text x="${cxMid}" y="${headTop + titleSize * 1.6}" text-anchor="middle" font-family="Outfit, Arial, sans-serif"
            font-size="${titleSize * 0.3}" font-style="italic" fill="#94a3b8">${Utils.escapeHtml(CONFIG.APP_SLOGAN)}</text>
      <line x1="${cxMid - halfLine}" y1="${ornY}" x2="${cxMid - orn * 2}" y2="${ornY}" stroke="#d4af37" stroke-width="${0.5 * u}" stroke-opacity="0.8"/>
      <line x1="${cxMid + orn * 2}" y1="${ornY}" x2="${cxMid + halfLine}" y2="${ornY}" stroke="#d4af37" stroke-width="${0.5 * u}" stroke-opacity="0.8"/>
      <rect x="${cxMid - orn}" y="${ornY - orn}" width="${orn * 2}" height="${orn * 2}" fill="#d4af37" transform="rotate(45 ${cxMid} ${ornY})"/>`;

    const footer = `
      <text x="${minX - pad + 20}" y="${footY}" font-family="Outfit, Arial, sans-serif" font-size="${footSize}" fill="#94a3b8">${peopleArr.length} birey • ${living} yaşayan • ${peopleArr.length - living} vefat</text>
      <text x="${cxMid}" y="${footY}" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="${footSize}" letter-spacing="${footSize * 0.2}" fill="#d4af37">DİJİTAL AİLE ARŞİVİ</text>
      <text x="${maxX + pad - 20}" y="${footY}" text-anchor="end" font-family="Outfit, Arial, sans-serif" font-size="${footSize}" fill="#94a3b8">${todayStr}</text>`;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}"
           width="${innerW}mm" height="${innerH}mm" preserveAspectRatio="xMidYMid meet">
        ${this.defs()}
        <rect x="${vbX - 2}" y="${vbY - 2}" width="${vbW + 4}" height="${vbH + 4}" fill="url(#pBg)"/>
        <rect x="${vbX - 2}" y="${vbY - 2}" width="${vbW + 4}" height="${vbH + 4}" fill="url(#pGlowTop)"/>
        <rect x="${vbX - 2}" y="${vbY - 2}" width="${vbW + 4}" height="${vbH + 4}" fill="url(#pGlowBr)"/>
        <rect x="${vbX - 2}" y="${vbY - 2}" width="${vbW + 4}" height="${vbH + 4}" fill="url(#pGrid)"/>

        <rect x="${vbX + frameOuter}" y="${vbY + frameOuter}" width="${vbW - frameOuter * 2}" height="${vbH - frameOuter * 2}"
              rx="${2 * u}" fill="none" stroke="url(#pGold)" stroke-width="${1.2 * u}"/>
        <rect x="${vbX + frameInner}" y="${vbY + frameInner}" width="${vbW - frameInner * 2}" height="${vbH - frameInner * 2}"
              rx="${1.2 * u}" fill="none" stroke="#d4af37" stroke-opacity="0.45" stroke-width="${0.3 * u}"/>

        ${header}
        <g>${this.linesSvg()}</g>
        <g>${cardsSvg}</g>
        ${footer}
      </svg>`;

    let root = document.getElementById('print-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'print-root';
      document.body.appendChild(root);
    }
    root.style.width = innerW + 'mm';
    root.style.height = innerH + 'mm';
    root.innerHTML = svg;

    document.body.classList.add('is-printing');
    this.isPrepared = true;
  },

  cleanup() {
    document.body.classList.remove('is-printing');
    const root = document.getElementById('print-root');
    if (root) root.innerHTML = '';
    this.isPrepared = false;
  }
};

PrintManager.init();
