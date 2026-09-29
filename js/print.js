/* ==========================================================================
   PRINT CONTROLLER & AUTO-SCALING ENGINE (print.js)
   Triggers browser print with auto-fitted SVG viewBox & ornate frame
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

    // Calculate total SVG tree bounding box for optimal print fit
    const svgEl = document.getElementById('tree-canvas-svg');
    const viewportGroup = document.getElementById('viewport-group');
    const cardNodes = document.querySelectorAll('#nodes-group foreignObject');

    let savedTransform = '';
    let savedViewBox = '';

    if (svgEl && viewportGroup && cardNodes.length > 0) {
      savedTransform = viewportGroup.getAttribute('transform') || '';
      savedViewBox = svgEl.getAttribute('viewBox') || '';

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      cardNodes.forEach(fo => {
        const x = parseFloat(fo.getAttribute('x'));
        const y = parseFloat(fo.getAttribute('y'));
        const w = parseFloat(fo.getAttribute('width')) || 220;
        const h = parseFloat(fo.getAttribute('height')) || 310;
        if (x < minX) minX = x;
        if (x + w > maxX) maxX = x + w;
        if (y < minY) minY = y;
        if (y + h > maxY) maxY = y + h;
      });

      const padding = 60;
      const printMinX = minX - padding;
      const printMinY = minY - padding;
      const printWidth = (maxX - minX) + (padding * 2);
      const printHeight = (maxY - minY) + (padding * 2);

      // Temporarily set viewport transform to 1:1 and fit SVG viewBox
      viewportGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
      svgEl.setAttribute('viewBox', `${printMinX} ${printMinY} ${printWidth} ${printHeight}`);
      svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    // Trigger Print Dialog
    window.print();

    // Restore interactive screen settings after print dialog closes
    const restore = () => {
      if (viewportGroup && savedTransform) {
        viewportGroup.setAttribute('transform', savedTransform);
      }
      if (svgEl) {
        if (savedViewBox) svgEl.setAttribute('viewBox', savedViewBox);
        else svgEl.removeAttribute('viewBox');
      }
    };

    if ('afterprint' in window) {
      window.addEventListener('afterprint', restore, { once: true });
    } else {
      setTimeout(restore, 1000);
    }
  }
};
