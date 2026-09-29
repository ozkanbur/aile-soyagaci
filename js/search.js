/* ==========================================================================
   GLOBAL SEARCH & FILTER MODULE (search.js)
   Instant multi-field indexing across name, nickname, occupation, & birth place
   ========================================================================== */

const Search = {
  inputEl: null,
  resultsEl: null,

  init(inputSelector, resultsSelector) {
    this.inputEl = document.querySelector(inputSelector);
    this.resultsEl = document.querySelector(resultsSelector);
    if (!this.inputEl) return;

    this.inputEl.addEventListener('input', (e) => {
      const query = e.target.value;
      this.performSearch(query);
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-search')) {
        this.hideResults();
      }
    });
  },

  performSearch(query) {
    if (!query || !query.trim() || query.length < 2) {
      this.hideResults();
      return;
    }

    const normQuery = Utils.normalizeTr(query);
    const peopleDict = Database.cache.people || {};
    const matches = [];

    Object.values(peopleDict).forEach(person => {
      const targetStr = Utils.normalizeTr(
        `${person.firstName} ${person.lastName} ${person.nickname} ${person.occupation} ${person.birthPlace}`
      );
      if (targetStr.includes(normQuery)) {
        matches.push(person);
      }
    });

    this.renderResults(matches);
  },

  renderResults(matches) {
    if (!this.resultsEl) return;
    this.resultsEl.innerHTML = '';

    if (matches.length === 0) {
      this.resultsEl.innerHTML = `
        <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 13px;">
          Aramanızla eşleşen aile bireyi bulunamadı.
        </div>
      `;
      this.showResults();
      return;
    }

    matches.forEach(person => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        cursor: pointer;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        transition: background 0.15s ease;
      `;

      item.onmouseenter = () => item.style.background = 'rgba(212, 175, 55, 0.15)';
      item.onmouseleave = () => item.style.background = 'transparent';

      const birthYear = person.birthDate ? person.birthDate.substring(0, 4) : '';
      const photoSrc = person.photoUrl || '';
      const avatarHtml = photoSrc 
        ? `<img src="${photoSrc}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1px solid var(--gold-primary);">`
        : `<div style="width: 38px; height: 38px; border-radius: 50%; background: #253257; color: var(--gold-light); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">${person.firstName.charAt(0)}</div>`;

      item.innerHTML = `
        ${avatarHtml}
        <div style="display: flex; flex-direction: column;">
          <div style="font-weight: 600; color: var(--text-main); font-size: 14px;">${Utils.escapeHtml(person.firstName)} ${Utils.escapeHtml(person.lastName)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">
            ${person.occupation ? Utils.escapeHtml(person.occupation) + ' • ' : ''} Doğlu: ${birthYear || 'Bilinmiyor'}
          </div>
        </div>
      `;

      item.onclick = () => {
        App.setCenterPerson(person.id);
        this.hideResults();
        this.inputEl.value = '';
      };

      this.resultsEl.appendChild(item);
    });

    this.showResults();
  },

  showResults() {
    if (this.resultsEl) this.resultsEl.style.display = 'block';
  },

  hideResults() {
    if (this.resultsEl) this.resultsEl.style.display = 'none';
  }
};
