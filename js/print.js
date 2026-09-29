/* ==========================================================================
   PRINT CONTROLLER (print.js)
   Triggers browser print with ornate decorative frame
   ========================================================================== */

const PrintManager = {
  triggerPrint() {
    let frame = document.getElementById('print-family-frame');
    if (!frame) {
      frame = document.createElement('div');
      frame.id = 'print-family-frame';
      frame.className = 'print-family-frame';
      document.body.prepend(frame);
    }

    const todayStr = new Date().toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    frame.innerHTML = `
      <div class="print-header-banner">
        <h1>${Utils.escapeHtml(CONFIG.FAMILY_NAME)} SOYAĞACI</h1>
        <div class="print-subtitle">${Utils.escapeHtml(CONFIG.APP_SLOGAN)} • Bireysel Aile Arşivi (${todayStr})</div>
      </div>
    `;

    window.print();
  }
};
