/* ==========================================================================
   TÜRKÇE AKRABALIK MOTORU (kinship.js)
   "Ben kimim?" seçimine göre her kişinin akrabalık adını hesaplar:
   Amca, Dayı, Hala, Teyze, Yenge, Enişte, Kayınpeder, Elti, Bacanak, Gelin...
   Seçim tarayıcıda (localStorage) saklanır, giriş gerektirmez.
   ========================================================================== */

const Kinship = {
  KEY_ME: 'family_tree_me',
  KEY_PROMPTED: 'family_tree_me_prompted',

  /* ---------- "Ben kimim" seçimi ---------- */
  getMeId(people) {
    try {
      const id = localStorage.getItem(this.KEY_ME);
      return id && people && people[id] ? id : null;
    } catch (e) { return null; }
  },
  setMe(id) { try { localStorage.setItem(this.KEY_ME, id); } catch (e) {} },
  clearMe() { try { localStorage.removeItem(this.KEY_ME); } catch (e) {} },

  /* ---------- Graf ---------- */
  buildGraph(people, rels) {
    const up = {}, down = {}, sp = {};
    Object.keys(people).forEach(id => { up[id] = []; down[id] = []; sp[id] = []; });
    Object.values(rels || {}).forEach(r => {
      if (!people[r.from] || !people[r.to]) return;
      if (r.type === 'parent') {
        up[r.to].push(r.from);
        down[r.from].push(r.to);
      } else if (r.type === 'spouse') {
        sp[r.from].push(r.to);
        sp[r.to].push(r.from);
      }
    });
    return { up, down, sp };
  },

  /**
   * meId'ye göre herkesin akrabalık adını döndürür: { personId: "Amca", ... }
   */
  computeAll(meId, people, rels) {
    const result = {};
    if (!people || !people[meId]) return result;
    const g = this.buildGraph(people, rels);

    const dist = { [meId]: 0 };
    const preds = { [meId]: [] };
    const queue = [meId];
    const MAX_DEPTH = 6;

    while (queue.length) {
      const cur = queue.shift();
      if (dist[cur] >= MAX_DEPTH) continue;
      [['U', g.up[cur]], ['D', g.down[cur]], ['S', g.sp[cur]]].forEach(([step, list]) => {
        list.forEach(n => {
          if (dist[n] === undefined) {
            dist[n] = dist[cur] + 1;
            preds[n] = [{ prev: cur, step }];
            queue.push(n);
          } else if (dist[n] === dist[cur] + 1) {
            preds[n].push({ prev: cur, step });
          }
        });
      });
    }

    Object.keys(dist).forEach(t => {
      result[t] = this.pickLabel(meId, t, people, g, preds);
    });
    return result;
  },

  labelFor(meId, targetId, people, rels) {
    return this.computeAll(meId, people, rels)[targetId] || '';
  },

  pickLabel(meId, t, people, g, preds) {
    if (t === meId) return 'Ben';

    // En kısa yolların hepsini çıkar (en fazla 40)
    const paths = [];
    const walk = (node, steps, nodes) => {
      if (paths.length >= 40) return;
      if (node === meId) {
        paths.push({ steps: steps.split('').reverse().join(''), nodes: nodes.slice().reverse() });
        return;
      }
      preds[node].forEach(p => walk(p.prev, steps + p.step, nodes.concat(p.prev)));
    };
    walk(t, '', [t]);

    // Evlilik adımı az olan (kan bağı) yolları önce dene
    paths.sort((a, b) => (a.steps.split('S').length - b.steps.split('S').length));
    for (const p of paths) {
      const term = this.termFor(p.steps, p.nodes, people, g);
      if (term) return term;
    }
    const any = paths[0] ? paths[0].steps : '';
    if (any.startsWith('S')) return 'Eşinin akrabası';
    if (any.endsWith('S')) return 'Akrabanın eşi';
    return 'Uzak akraba';
  },

  /* ---------- Akrabalık adı tablosu ---------- */
  termFor(steps, nodes, people, g) {
    const n = nodes.length - 1;
    const G = id => (people[id] && people[id].gender === 'female') ? 'female' : 'male';
    const gt = G(nodes[n]);            // hedef kişinin cinsiyeti
    const gme = G(nodes[0]);           // bakan kişinin cinsiyeti
    const fem = gt === 'female';

    // Anne/baba tarafına göre amca-hala-dayı-teyze
    const uncleTerm = (gTarget, gParent) => {
      if (gParent === 'male') return gTarget === 'male' ? 'Amca' : 'Hala';
      return gTarget === 'male' ? 'Dayı' : 'Teyze';
    };

    switch (steps) {
      case 'U':   return fem ? 'Anne' : 'Baba';
      case 'D':   return fem ? 'Kız' : 'Oğul';
      case 'S':   return fem ? 'Eş (Karı)' : 'Eş (Koca)';
      case 'UU':  return fem ? (G(nodes[1]) === 'male' ? 'Babaanne' : 'Anneanne') : 'Dede';
      case 'DD':  return 'Torun';
      case 'UUU': return fem ? 'Büyük nine' : 'Büyük dede';
      case 'DDD': return 'Torunun çocuğu';

      case 'UD': { // kardeş
        const me = people[nodes[0]], t = people[nodes[2]];
        const common = g.up[nodes[0]].filter(x => g.up[nodes[2]].includes(x));
        let label;
        let older = null;
        if (me.birthDate && t.birthDate) older = t.birthDate < me.birthDate;
        if (older === true) label = fem ? 'Abla' : 'Abi';
        else if (older === false) label = fem ? 'Kız kardeş' : 'Erkek kardeş';
        else label = 'Kardeş';
        if (common.length === 1 && (g.up[nodes[0]].length > 1 || g.up[nodes[2]].length > 1)) {
          label += G(common[0]) === 'female' ? ' (anne bir)' : ' (baba bir)';
        }
        return label;
      }
      case 'UDD':   return 'Yeğen';
      case 'UDDD':  return 'Yeğenin çocuğu';

      case 'UUD':   return uncleTerm(gt, G(nodes[1]));
      case 'UUDD':  return uncleTerm(G(nodes[3]), G(nodes[1])) + (fem ? ' kızı' : ' oğlu');
      case 'UUDDD': return 'Kuzenin çocuğu';
      case 'UUUD':  return 'Büyük ' + uncleTerm(gt, G(nodes[2])).toLowerCase();

      // Eş tarafı
      case 'SU':    return fem ? 'Kayınvalide' : 'Kayınpeder';
      case 'SUU':   return fem ? 'Eşin ninesi' : 'Eşin dedesi';
      case 'SUD':   return gt === 'male' ? 'Kayınbirader' : (gme === 'female' ? 'Görümce' : 'Baldız');
      case 'SUDD':  return 'Eşinin yeğeni';
      case 'SD':    return fem ? 'Üvey kız' : 'Üvey oğul';
      case 'SUDS':
        if (gme === 'female' && gt === 'female') return 'Elti';
        if (gme === 'male' && gt === 'male') return 'Bacanak';
        return 'Eşin kardeşinin eşi';

      // Kardeşin / amca-dayı-hala-teyzenin eşi
      case 'UDS': {
        const sibG = G(nodes[2]);
        if (sibG === 'male' && fem) return 'Yenge';
        if (sibG === 'female' && !fem) return 'Enişte';
        return 'Kardeşinin eşi';
      }
      case 'UUDS': {
        const uG = G(nodes[3]);
        if (uG === 'male' && fem) return 'Yenge';
        if (uG === 'female' && !fem) return 'Enişte';
        return null;
      }

      // Çocuk tarafı
      case 'DS':  return fem ? 'Gelin' : 'Damat';
      case 'DDS': return 'Torunun eşi';
      case 'DSU': return 'Dünür';
      case 'US':  return fem ? 'Üvey anne' : 'Üvey baba';
      default:    return null;
    }
  },

  /* ---------- Arayüz: "Ben kimim?" penceresi ---------- */
  openPicker() {
    const search = document.getElementById('me-search');
    if (search) search.value = '';
    this.renderPickerList();
    Modal.open('#me-picker-modal');
  },

  renderPickerList() {
    const box = document.getElementById('me-list');
    if (!box) return;
    const people = Database.cache.people || {};
    const q = Utils.normalizeTr((document.getElementById('me-search') || {}).value || '');
    const currentMe = this.getMeId(people);

    const list = Object.values(people)
      .filter(p => !q || Utils.normalizeTr(`${p.firstName} ${p.lastName} ${p.nickname || ''}`).includes(q))
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'tr'));

    box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 10px;">Eşleşen kişi yok.</div>';
      return;
    }

    list.forEach(p => {
      const row = document.createElement('div');
      row.className = 'relation-chip';
      row.style.cssText = 'width:100%; justify-content:space-between; margin-bottom:6px;';
      const yr = p.birthDate ? p.birthDate.substring(0, 4) : '';
      row.innerHTML = `
        <span>${p.gender === 'female' ? '👩' : '👨'} ${Utils.escapeHtml(p.firstName)} ${Utils.escapeHtml(p.lastName)}
          ${p.nickname ? `<em style="opacity:.7;">"${Utils.escapeHtml(p.nickname)}"</em>` : ''}</span>
        <span style="opacity:.75; font-size:12px;">${yr}${p.id === currentMe ? ' ✓' : ''}</span>`;
      row.onclick = () => this.choose(p.id);
      box.appendChild(row);
    });
  },

  choose(id) {
    const p = Database.cache.people[id];
    if (!p) return;
    this.setMe(id);
    Modal.close('#me-picker-modal');
    this.updateButtons();
    App.renderTree({ keepView: true });
    Utils.showToast(`✓ Akrabalık adları artık ${p.firstName} kişisine göre gösterilecek.`, 'success');
  },

  clear() {
    this.clearMe();
    Modal.close('#me-picker-modal');
    this.updateButtons();
    App.renderTree({ keepView: true });
    Utils.showToast('Akrabalık adları kapatıldı.', 'info');
  },

  updateButtons() {
    const people = Database.cache.people || {};
    const meId = this.getMeId(people);
    const btn = document.getElementById('header-me-btn');
    const nav = document.getElementById('nav-me-label');
    const name = meId ? people[meId].firstName : null;
    if (btn) btn.innerText = name ? `👤 Ben: ${name}` : '👤 Ben Kimim?';
    if (nav) nav.innerText = name ? name : 'Ben';
  },

  /** İlk ziyarette bir kez sor */
  maybePrompt() {
    try {
      if (this.getMeId(Database.cache.people)) return;
      if (localStorage.getItem(this.KEY_PROMPTED)) return;
      localStorage.setItem(this.KEY_PROMPTED, '1');
    } catch (e) { return; }
    setTimeout(() => this.openPicker(), 900);
  }
};
