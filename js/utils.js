/* ==========================================================================
   UTILITY & HELPER FUNCTIONS (utils.js)
   ========================================================================== */

const Utils = {
  /**
   * Display a sleek notification toast message
   * @param {string} message 
   * @param {'success'|'error'|'info'} type 
   */
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span style="font-weight: bold; font-size: 16px;">${iconMap[type] || 'ℹ'}</span>
      <span>${Utils.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
   * Format Turkish date strings (e.g. 1988-11-24 to 24 Kasım 1988 or just year 1988)
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
      const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
      const day = parseInt(parts[2], 10);
      return `${day} ${month} ${year}`;
    }
    return dateStr;
  },

  /**
   * Get display year range (e.g. "1935 — 2010" or "1988 — ")
   */
  getLifeSpan(birthDate, deathDate) {
    const birthYear = birthDate ? birthDate.substring(0, 4) : '?';
    if (deathDate) {
      const deathYear = deathDate.substring(0, 4);
      return `${birthYear} — ${deathYear}`;
    }
    return birthYear !== '?' ? `${birthYear} —` : 'Tarih bilinmiyor';
  },

  /**
   * Calculate exact age or age at death
   */
  calculateAge(birthDate, deathDate) {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const end = deathDate ? new Date(deathDate) : new Date();
    let age = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  },

  /**
   * Turkish string normalization for search indexing
   */
  normalizeTr(text) {
    if (!text) return '';
    return text
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  },

  /**
   * Escape raw strings for safe HTML rendering
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Convert Roman Numerals for generation display (1 -> I, 2 -> II, 3 -> III, 4 -> IV)
   */
  toRomanGeneration(num) {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return (roman[num] || num) + ". KUŞAK";
  }
};
