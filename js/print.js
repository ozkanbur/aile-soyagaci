/* ==========================================================================
   PRINT CONTROLLER (print.js)
   Ekrandaki ağaçtan bağımsız, yazıcıya özel vektör (SVG) bir poster üretir:
   - Sayfaya tam sığar, kesilme olmaz
   - Ağaç dikse A4 dikey, genişse A4 yatay seçilir
   - Çerçeveli başlık, alt bilgi, net çizgiler ve renkli kartlar
   ========================================================================== */

const PrintManager = {
  CARD_W: 220,
  CARD_H: 310,
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
    setTimeout(() => window.print(), 150);
  },

  preloadPhotos() {
    const urls = Object.values(Database.cache.people || {})
      .map(p => p.photoUrl)
      .filter(Boolean);
    const loads = urls.map(u => new Promise(res => {
      const img = new Image();
      img.onload = img.onerror = () => res();
      img.src = u;
    }));
    // En fazla 3 saniye bekle
    return Promise.race([
      Promise.all(loads),
      new Promise(res => setTimeout(res, 3000))
    ]);
  },

  /** Kart yerleşimini (x,y) ekrandaki foreignObject'lerden okur */
  readLayout() {
    const nodes = [];
    document.querySelectorAll('#nodes-group foreignObject').forEach(fo => {
      const pid = fo.getAttribute('data-person-id');
      const badge = fo.querySelector('.card-generation-badge');
      nodes.push({
        id: pid,
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

  cardSvg(node, person, idx) {
    const W = this.CARD_W, H = this.CARD_H;
    const { x, y } = node;
    const esc = Utils.escapeHtml;
    const isFemale = person.gender === 'female';
    const accent = isFemale ? '#ec4899' : '#3b82f6';
    const deceased = !!person.deathDate;
    const fullName = `${person.firstName} ${person.lastName}`.trim();
    const nameSize = fullName.length > 20 ? 14 : (fullName.length > 15 ? 16 : 19);
    const initials = ((person.firstName || '').charAt(0) + (person.lastName || '').charAt(0)).toUpperCase() || 'A';
    const cx = x + W / 2;
    const cy = y + 108;
    const ringColor = node.isCenter ? '#d4af37' : '#1e3a8a';
    const cardFill = node.isCenter ? '#fffbeb' : '#ffffff';
    const cardStroke = node.isCenter ? '#d4af37' : '#1e3a8a';
    const cardStrokeW = node.isCenter ? 5 : 2.5;

    const avatar = person.photoUrl
      ? `<clipPath id="pc${idx}"><circle cx="${cx}" cy="${cy}" r="50"/></clipPath>
         <circle cx="${cx}" cy="${cy}" r="50" fill="#e2e8f0"/>
         <image href="${esc(person.photoUrl)}" x="${cx - 50}" y="${cy - 50}" width="100" height="100"
                preserveAspectRatio="xMidYMid slice" clip-path="url(#pc${idx})"/>`
      : `<circle cx="${cx}" cy="${cy}" r="50" fill="#e2e8f0"/>
         <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-family="Cinzel, Georgia, serif"
               font-size="36" font-weight="700" fill="#1e3a8a">${esc(initials)}</text>`;

    const statusText = deceased ? 'Vefat' : 'Yaşıyor';
    const statusColor = deceased ? '#6b7280' : '#15803d';
    const statusBg = deceased ? '#f3f4f6' : '#dcfce7';

    const occupation = this.truncate(person.occupation, 26);
    const place = this.truncate(person.birthPlace, 26);

    return `
      <g>
        <rect x="${x}" y="${y}" width="${W}" height="${H}" rx="14" fill="${cardFill}" stroke="${cardStroke}" stroke-width="${cardStrokeW}"/>
        <rect x="${x + 16}" y="${y + 1}" width="${W - 32}" height="7" rx="3.5" fill="${accent}"/>
        ${node.isCenter ? `<text x="${cx}" y="${y + 26}" text-anchor="middle" font-family="Outfit, Arial, sans-serif" font-size="11" font-weight="700" fill="#b45309" letter-spacing="1.5">★ MERKEZ KİŞİ ★</text>` : ''}

        <text x="${x + 16}" y="${y + 46}" font-family="Outfit, Arial, sans-serif" font-size="12" font-weight="700" fill="#475569">${esc(node.gen)}</text>
        <rect x="${x + W - 88}" y="${y + 33}" width="72" height="18" rx="9" fill="${statusBg}"/>
        <circle cx="${x + W - 77}" cy="${y + 42}" r="3.5" fill="${statusColor}"/>
        <text x="${x + W - 69}" y="${y + 46}" font-family="Outfit, Arial, sans-serif" font-size="11" font-weight="600" fill="${statusColor}">${statusText}</text>

        <circle cx="${cx}" cy="${cy}" r="56" fill="none" stroke="${ringColor}" stroke-width="3"/>
        <circle cx="${cx}" cy="${cy}" r="53" fill="none" stroke="#d4af37" stroke-width="1.5"/>
        ${avatar}

        <text x="${cx}" y="${y + 198}" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="${nameSize}" font-weight="700" fill="#1e3a8a">${esc(fullName)}</text>
        ${person.nickname ? `<text x="${cx}" y="${y + 219}" text-anchor="middle" font-family="Outfit, Arial, sans-serif" font-size="14" font-style="italic" fill="#a16207">"${esc(this.truncate(person.nickname, 24))}"</text>` : ''}
        <text x="${cx}" y="${y + 245}" text-anchor="middle" font-family="Outfit, Arial, sans-serif" font-size="16" font-weight="600" fill="#334155">${esc(Utils.getLifeSpan(person.birthDate, person.deathDate))}</text>

        <line x1="${x + 40}" y1="${y + 257}" x2="${x + W - 40}" y2="${y + 257}" stroke="#d4af37" stroke-width="1.2"/>
        ${occupation ? `<text x="${cx}" y="${y + 277}" text-anchor="middle" font-family="Outfit, Arial, sans-serif" font-size="13" fill="#475569">${esc(occupation)}</text>` : ''}
        ${place ? `<text x="${cx}" y="${y + 295}" text-anchor="middle" font-family="Outfit, Arial, sans-serif" font-size="12" fill="#64748b">${esc(place)}</text>` : ''}
      </g>`;
  },

  /** Ekrandaki bağlantı çizgilerini yazıcı için kalın/net biçimde kopyalar */
  linesSvg() {
    const group = document.getElementById('lines-group');
    if (!group) return '';
    let out = '';
    Array.from(group.children).forEach(el => {
      const tag = el.tagName.toLowerCase();
      const cls = el.getAttribute('class') || '';
      if (tag === 'path') {
        const isSpouse = cls.includes('spouse-line');
        const color = isSpouse ? '#b45309' : '#1d4ed8';
        out += `<path d="${el.getAttribute('d')}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
      } else if (tag === 'g' && cls.includes('spouse-junction-node')) {
        const c = el.querySelector('circle');
        if (c) {
          out += `<circle cx="${c.getAttribute('cx')}" cy="${c.getAttribute('cy')}" r="11" fill="#b45309" stroke="#ffffff" stroke-width="3"/>
                  <circle cx="${c.getAttribute('cx')}" cy="${c.getAttribute('cy')}" r="4" fill="#ffffff"/>`;
        }
      } else if (tag === 'circle') {
        out += `<circle cx="${el.getAttribute('cx')}" cy="${el.getAttribute('cy')}" r="6" fill="#1d4ed8" stroke="#ffffff" stroke-width="2"/>`;
      }
    });
    return out;
  },

  prepare() {
    const nodes = this.readLayout();
    if (!nodes.length) return;

    // Sınırlar
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + this.CARD_W);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + this.CARD_H);
    });
    const pad = 40;
    const vbX = minX - pad, vbY = minY - pad;
    const vbW = (maxX - minX) + pad * 2;
    const vbH = (maxY - minY) + pad * 2;

    // Yönelim: geniş ağaç yatay, uzun ağaç dikey
    const landscape = vbW / vbH > 1.1;
    const margin = 8;                        // mm
    const pageW = landscape ? 297 : 210;
    const pageH = landscape ? 210 : 297;
    const rootW = pageW - margin * 2 - 1;
    const rootH = pageH - margin * 2 - 2;

    let pageStyle = document.getElementById('print-page-style');
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = 'print-page-style';
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: ${margin}mm; }`;

    // İçerik
    const people = Database.cache.people || {};
    const cardsSvg = nodes
      .map((n, i) => people[n.id] ? this.cardSvg(n, people[n.id], i) : '')
      .join('');

    const peopleArr = Object.values(people);
    const living = peopleArr.filter(p => !p.deathDate).length;
    const todayStr = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

    let root = document.getElementById('print-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'print-root';
      document.body.appendChild(root);
    }
    root.style.width = rootW + 'mm';
    root.style.height = rootH + 'mm';

    root.innerHTML = `
      <div class="pr-frame">
        <div class="pr-header">
          <div class="pr-title">${Utils.escapeHtml(CONFIG.FAMILY_NAME)} SOYAĞACI</div>
          <div class="pr-subtitle">${Utils.escapeHtml(CONFIG.APP_SLOGAN)}</div>
        </div>
        <div class="pr-tree">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
            <g>${this.linesSvg()}</g>
            <g>${cardsSvg}</g>
          </svg>
        </div>
        <div class="pr-footer">
          <span>${peopleArr.length} birey • ${living} yaşayan • ${peopleArr.length - living} vefat</span>
          <span>${todayStr}</span>
        </div>
      </div>`;

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
