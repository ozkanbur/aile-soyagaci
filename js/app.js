/* ==========================================================================
   APPLICATION CORE & CONTROLLER BOOTSTRAP (app.js)
   ========================================================================== */

const Modal = {
  open(selector) {
    const el = document.querySelector(selector);
    if (el) el.classList.add('is-open');
  },
  close(selector) {
    const el = document.querySelector(selector);
    if (el) el.classList.remove('is-open');
  }
};

const App = {
  currentCenterPersonId: null,

  async init() {
    console.log(`🚀 Initializing ${CONFIG.APP_NAME} (${CONFIG.APP_VERSION})`);

    // 1. Setup UI Titles from Config
    document.title = `${CONFIG.FAMILY_NAME} - ${CONFIG.APP_NAME}`;
    const brandTitle = document.getElementById('header-brand-title');
    if (brandTitle) brandTitle.innerText = CONFIG.FAMILY_NAME;

    // Yönetici butonuna hemen varsayılan işlev ata (hata olsa bile çalışsın)
    this.updateAdminVisibility(false);

    // 2. Initialize Tree Engine & Search
    try {
      TreeEngine.init('#tree-canvas-svg');
      Search.init('#header-search-input', '#search-results-dropdown');
    } catch (err) {
      console.error("Ağaç/Arama başlatma hatası:", err);
    }

    // 3. Bind Keyboard ESC key to close open modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.is-open').forEach(m => m.classList.remove('is-open'));
      }
    });

    // 4. ÖNCE Database (Firebase uygulaması burada başlar), SONRA Auth
    try {
      await Database.init();
    } catch (err) {
      console.error("Database başlatma hatası:", err);
    }

    try {
      Auth.init();
    } catch (err) {
      console.error("Auth başlatma hatası:", err);
    }

    // 5. Register Data Change Listener
    Database.onDataChange((people, rels) => {
      this.updateHeaderStats(people, rels);
      this.renderTree();
      this.updateAdminVisibility(Auth.isAdmin());
    });

    // 6. Register Auth Listener
    Auth.onAuthStateChanged((isAdmin) => {
      this.updateAdminVisibility(isAdmin);
    });

    // 7. Initial Tree Recenter
    setTimeout(() => TreeEngine.recenter(), 300);
  },

  setCenterPerson(personId) {
    this.currentCenterPersonId = personId;
    this.renderTree();
    TreeEngine.recenter();
  },

  recenterTree() {
    TreeEngine.recenter();
  },

  onCardClick(personId) {
    this.openPersonDetailModal(personId);
  },

  renderTree() {
    TreeEngine.render(
      this.currentCenterPersonId || CONFIG.DEFAULT_CENTER_PERSON_ID,
      Database.cache.people,
      Database.cache.relationships
    );
  },

  updateHeaderStats(peopleDict, relsDict) {
    const peopleArr = Object.values(peopleDict || {});
    const totalCount = peopleArr.length;
    const livingCount = peopleArr.filter(p => !p.deathDate).length;
    const deceasedCount = peopleArr.filter(p => !!p.deathDate).length;

    const genLevels = Relationships.calculateGenerations(
      this.currentCenterPersonId || CONFIG.DEFAULT_CENTER_PERSON_ID,
      peopleDict || {},
      relsDict || {}
    );
    const uniqueGenCount = new Set(Object.values(genLevels)).size || 1;

    const elTotal = document.getElementById('stat-total-count');
    const elGen = document.getElementById('stat-gen-count');
    const elLiving = document.getElementById('stat-living-count');
    const elDeceased = document.getElementById('stat-deceased-count');

    if (elTotal) elTotal.innerText = totalCount;
    if (elGen) elGen.innerText = uniqueGenCount;
    if (elLiving) elLiving.innerText = livingCount;
    if (elDeceased) elDeceased.innerText = deceasedCount;

    // Update Mode Tag
    const modeBadge = document.getElementById('app-mode-badge');
    if (modeBadge) {
      if (Database.isLiveFirebase) {
        modeBadge.className = 'badge badge-gold';
        modeBadge.innerText = '🔥 Firebase Canlı Mod';
      } else {
        modeBadge.className = 'badge badge-demo';
        modeBadge.innerText = '⚡ Demo Mod Verisi';
      }
    }
  },

  updateAdminVisibility(isAdmin) {
    const adminToolbar = document.getElementById('admin-toolbar');
    const adminLoginBtn = document.getElementById('header-admin-btn');

    if (adminToolbar) {
      adminToolbar.style.display = isAdmin ? 'flex' : 'none';
      const treeView = document.querySelector('.tree-view-wrapper');
      if (treeView) treeView.style.top = isAdmin ? '118px' : '70px';
    }

    if (adminLoginBtn) {
      if (isAdmin) {
        adminLoginBtn.className = 'btn btn-secondary btn-sm';
        adminLoginBtn.innerHTML = '🔓 Çıkış Yap';
        adminLoginBtn.onclick = () => Auth.logout();
      } else {
        adminLoginBtn.className = 'btn btn-primary btn-sm';
        adminLoginBtn.innerHTML = '🔐 Yönetici Girişi';
        adminLoginBtn.onclick = () => { window.location.href = 'login.html'; };
      }
    }
  },

  openPersonDetailModal(personId) {
    const person = Database.cache.people[personId];
    if (!person) return;

    const modalBody = document.getElementById('person-detail-body');
    if (!modalBody) return;

    const parents = Relationships.getParents(personId, Database.cache.people, Database.cache.relationships);
    const spouses = Relationships.getSpouses(personId, Database.cache.people, Database.cache.relationships);
    const children = Relationships.getChildren(personId, Database.cache.people, Database.cache.relationships);
    const siblings = Relationships.getSiblings(personId, Database.cache.people, Database.cache.relationships);

    const isDeceased = !!person.deathDate;
    const age = Utils.calculateAge(person.birthDate, person.deathDate);
    const lifeSpanStr = Utils.getLifeSpan(person.birthDate, person.deathDate);

    const photoHtml = person.photoUrl
      ? `<img src="${person.photoUrl}" onerror="Photos.handleImageError(this, '${person.firstName}', '${person.lastName}', '${person.gender}')">`
      : Photos.getPlaceholderSvg(person.firstName, person.lastName, person.gender);

    const buildChips = (list, label) => {
      if (!list.length) return `<div style="font-size: 12px; color: var(--text-muted); font-style: italic;">${label} kaydı yok</div>`;
      return list.map(p => `
        <div class="relation-chip" onclick="App.setCenterPerson('${p.id}'); Modal.close('#person-detail-modal');">
          <span>${p.gender === 'female' ? '👩' : '👨'}</span>
          <span>${Utils.escapeHtml(p.firstName)} ${Utils.escapeHtml(p.lastName)}</span>
        </div>
      `).join('');
    };

    modalBody.innerHTML = `
      <div class="profile-showcase">
        <div class="profile-avatar-large">
          ${photoHtml}
        </div>
        <div class="profile-main-info">
          <div class="profile-name">${Utils.escapeHtml(person.firstName)} ${Utils.escapeHtml(person.lastName)}</div>
          ${person.nickname ? `<div style="color: var(--gold-light); font-style: italic; font-size: 13px;">"${Utils.escapeHtml(person.nickname)}"</div>` : ''}
          <div style="margin-top: 4px; font-size: 13px; font-weight: 600; color: ${isDeceased ? 'var(--deceased-indicator)' : 'var(--living-indicator)'}">
            ${isDeceased ? '🕊️ Vefat Etmiş' : '🟢 Hayatta'} ${age !== null ? `(${age} yaşında)` : ''}
          </div>

          <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="App.setCenterPerson('${person.id}'); Modal.close('#person-detail-modal');">
              🎯 Merkeze Al
            </button>
            ${Auth.isAdmin() ? `
              <button class="btn btn-secondary btn-sm" onclick="Modal.close('#person-detail-modal'); Admin.openEditPersonModal('${person.id}');">
                ✏️ Düzenle
              </button>
              <button class="btn btn-danger btn-sm" onclick="Admin.confirmDeletePerson('${person.id}');">
                🗑️ Sil
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="profile-meta-grid">
        <div class="meta-field">
          <div class="meta-label">Doğum Tarihi / Yeri</div>
          <div class="meta-value">${Utils.formatDate(person.birthDate) || 'Bilinmiyor'} ${person.birthPlace ? `(${Utils.escapeHtml(person.birthPlace)})` : ''}</div>
        </div>
        <div class="meta-field">
          <div class="meta-label">Vefat Tarihi / Yeri</div>
          <div class="meta-value">${isDeceased ? (Utils.formatDate(person.deathDate) || 'Bilinmiyor') + (person.deathPlace ? ` (${Utils.escapeHtml(person.deathPlace)})` : '') : '—'}</div>
        </div>
        <div class="meta-field">
          <div class="meta-label">Meslek</div>
          <div class="meta-value">${Utils.escapeHtml(person.occupation) || 'Belirtilmedi'}</div>
        </div>
        <div class="meta-field">
          <div class="meta-label">Yaşam Süresi</div>
          <div class="meta-value">${lifeSpanStr}</div>
        </div>
      </div>

      ${person.notes ? `
        <div style="background: rgba(10,17,40,0.5); padding: 12px 16px; border-radius: 8px; border-left: 3px solid var(--gold-primary);">
          <div class="meta-label">Biyografi & Aile Notları</div>
          <div style="font-size: 13px; margin-top: 4px; color: var(--text-main);">${Utils.escapeHtml(person.notes)}</div>
        </div>
      ` : ''}

      <div class="relations-section">
        <div class="relation-group-title">ANNE & BABA</div>
        <div class="relation-chips-list">${buildChips(parents, 'Anne/Baba')}</div>
      </div>

      <div class="relations-section">
        <div class="relation-group-title">EŞ(LER)</div>
        <div class="relation-chips-list">${buildChips(spouses, 'Eş')}</div>
      </div>

      <div class="relations-section">
        <div class="relation-group-title">ÇOCUKLAR</div>
        <div class="relation-chips-list">${buildChips(children, 'Çocuk')}</div>
      </div>

      <div class="relations-section">
        <div class="relation-group-title">KARDEŞLER</div>
        <div class="relation-chips-list">${buildChips(siblings, 'Kardeş')}</div>
      </div>
    `;

    Modal.open('#person-detail-modal');
  }
};

// Bootstrap application on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => App.init());
