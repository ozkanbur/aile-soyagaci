/* ==========================================================================
   DYNAMIC SVG FAMILY TREE RENDERER & ZOOM/PAN ENGINE (tree.js)
   ========================================================================== */

const TreeEngine = {
  svgEl: null,
  viewportGroup: null,
  linesGroup: null,
  nodesGroup: null,

  centerPersonId: null,
  zoomScale: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStart: { x: 0, y: 0 },

  // Touch gesture tracking
  touchStartDist: 0,
  touchStartScale: 1,

  init(svgSelector) {
    this.svgEl = document.querySelector(svgSelector);
    if (!this.svgEl) return;

    // Clear and build SVG internal groups
    this.svgEl.innerHTML = `
      <g id="viewport-group">
        <g id="lines-group"></g>
        <g id="nodes-group"></g>
      </g>
    `;

    this.viewportGroup = document.getElementById('viewport-group');
    this.linesGroup = document.getElementById('lines-group');
    this.nodesGroup = document.getElementById('nodes-group');

    this.bindEvents();
  },

  bindEvents() {
    if (!this.svgEl) return;

    // Mouse Pan Events
    this.svgEl.addEventListener('mousedown', (e) => {
      // Ignore click on person card buttons/chips
      if (e.target.closest('.person-card') || e.target.closest('.control-btn')) return;
      this.isDragging = true;
      this.dragStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.dragStart.x;
      this.panY = e.clientY - this.dragStart.y;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Mouse Wheel Zoom Event
    this.svgEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });

    // Touch Pinch & Drag Events for Android / Mobile
    this.svgEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        if (e.target.closest('.person-card')) return;
        this.isDragging = true;
        this.dragStart = { x: e.touches[0].clientX - this.panX, y: e.touches[0].clientY - this.panY };
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        this.touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this.touchStartScale = this.zoomScale;
      }
    });

    this.svgEl.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        this.panX = e.touches[0].clientX - this.dragStart.x;
        this.panY = e.touches[0].clientY - this.dragStart.y;
        this.updateTransform();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (this.touchStartDist > 0) {
          const factor = dist / this.touchStartDist;
          this.zoomScale = Math.min(Math.max(0.4, this.touchStartScale * factor), 2.5);
          this.updateTransform();
        }
      }
    });

    this.svgEl.addEventListener('touchend', () => {
      this.isDragging = false;
      this.touchStartDist = 0;
    });
  },

  zoom(factor, mouseX, mouseY) {
    const newScale = Math.min(Math.max(0.3, this.zoomScale * factor), 2.5);
    
    // Zoom centered on cursor position if coordinates provided
    if (mouseX !== undefined && mouseY !== undefined) {
      const rect = this.svgEl.getBoundingClientRect();
      const cx = mouseX - rect.left;
      const cy = mouseY - rect.top;
      this.panX = cx - (cx - this.panX) * (newScale / this.zoomScale);
      this.panY = cy - (cy - this.panY) * (newScale / this.zoomScale);
    }
    
    this.zoomScale = newScale;
    this.updateTransform();
  },

  zoomIn() { this.zoom(1.2); },
  zoomOut() { this.zoom(0.8); },

  resetZoom() {
    this.zoomScale = 1;
    this.recenter();
  },

  recenter() {
    const rect = this.svgEl.getBoundingClientRect();
    this.panX = rect.width / 2 - 110;
    this.panY = rect.height / 2 - 150;
    this.updateTransform();
  },

  updateTransform() {
    if (this.viewportGroup) {
      this.viewportGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoomScale})`);
    }
  },

  /**
   * Main Tree Rendering Function
   */
  render(centerPersonId, peopleDict, relsDict) {
    if (!this.svgEl || !peopleDict || Object.keys(peopleDict).length === 0) return;

    this.centerPersonId = centerPersonId || CONFIG.DEFAULT_CENTER_PERSON_ID;
    if (!peopleDict[this.centerPersonId]) {
      this.centerPersonId = Object.keys(peopleDict)[0]; // Fallback if ID doesn't exist
    }

    // 1. Calculate generation depths relative to center person
    const genLevels = Relationships.calculateGenerations(this.centerPersonId, peopleDict, relsDict);
    
    // 2. Group people by generation level
    const levelGroups = {};
    Object.keys(peopleDict).forEach(pid => {
      const lvl = genLevels[pid] !== undefined ? genLevels[pid] : 0;
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push(peopleDict[pid]);
    });

    // 3. Compute (X, Y) layout coordinates for each card
    const nodeCoords = {};
    const cardW = 220;
    const cardH = 310;
    const xSpacing = 280;
    const ySpacing = 380;

    const sortedLevels = Object.keys(levelGroups).map(Number).sort((a, b) => a - b);
    
    sortedLevels.forEach(lvl => {
      const group = levelGroups[lvl];
      const count = group.length;
      const totalWidth = count * xSpacing;
      const startX = - (totalWidth / 2) + (xSpacing / 2);
      const Y = lvl * ySpacing;

      group.forEach((person, idx) => {
        const X = startX + (idx * xSpacing);
        nodeCoords[person.id] = { x: X, y: Y, level: lvl };
      });
    });

    // 4. Render Nodes (ForeignObject Cards)
    this.nodesGroup.innerHTML = '';
    Object.keys(nodeCoords).forEach(pid => {
      const person = peopleDict[pid];
      const { x, y, level } = nodeCoords[pid];
      const isCenter = pid === this.centerPersonId;
      
      const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      fo.setAttribute('x', x);
      fo.setAttribute('y', y);
      fo.setAttribute('width', cardW);
      fo.setAttribute('height', cardH);
      fo.setAttribute('data-person-id', pid);

      const romanGen = Utils.toRomanGeneration(Math.abs(level) + 1);
      const lifeSpan = Utils.getLifeSpan(person.birthDate, person.deathDate);
      const isDeceased = !!person.deathDate;
      const photoHtml = person.photoUrl 
        ? `<img class="card-photo" src="${person.photoUrl}" alt="${Utils.escapeHtml(person.firstName)}" onerror="Photos.handleImageError(this, '${person.firstName}', '${person.lastName}', '${person.gender}')">`
        : Photos.getPlaceholderSvg(person.firstName, person.lastName, person.gender);

      fo.innerHTML = `
        <div class="person-card ${person.gender} ${isCenter ? 'is-center' : ''}" onclick="App.onCardClick('${person.id}')">
          <div class="card-generation-badge">${romanGen}</div>
          <div class="card-status-badge ${isDeceased ? 'deceased' : 'living'}">
            ${isDeceased ? '🕊️ Vefat' : '🟢 Yaşıyor'}
          </div>

          <div class="card-photo-wrapper">
            ${photoHtml}
          </div>

          <div class="card-name-section">
            <div class="card-full-name">${Utils.escapeHtml(person.firstName)} ${Utils.escapeHtml(person.lastName)}</div>
            ${person.nickname ? `<div class="card-nickname">"${Utils.escapeHtml(person.nickname)}"</div>` : ''}
          </div>

          <div class="card-dates">${lifeSpan}</div>
          <div class="card-divider"></div>

          <div class="card-relation-counts">
            <div class="count-chip"><span>${Relationships.getParents(person.id, peopleDict, relsDict).length}</span>Anne/Baba</div>
            <div class="count-chip"><span>${Relationships.getSpouses(person.id, peopleDict, relsDict).length}</span>Eş</div>
            <div class="count-chip"><span>${Relationships.getChildren(person.id, peopleDict, relsDict).length}</span>Çocuk</div>
          </div>
        </div>
      `;

      this.nodesGroup.appendChild(fo);
    });

    // 5. Render SVG Connector Lines (Spouses & Parent-Child)
    this.linesGroup.innerHTML = '';
    Object.values(relsDict).forEach(rel => {
      const fromCoord = nodeCoords[rel.from];
      const toCoord = nodeCoords[rel.to];
      if (!fromCoord || !toCoord) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      if (rel.type === 'spouse') {
        // Horizontal line connecting spouses side-by-side
        const x1 = fromCoord.x + (cardW / 2);
        const y1 = fromCoord.y + 70;
        const x2 = toCoord.x + (cardW / 2);
        const y2 = toCoord.y + 70;
        
        path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
        path.setAttribute('class', 'tree-connector-line spouse-line');
      } else if (rel.type === 'parent') {
        // Curved Vertical Bezier line connecting parent bottom to child top
        const x1 = fromCoord.x + (cardW / 2);
        const y1 = fromCoord.y + cardH;
        const x2 = toCoord.x + (cardW / 2);
        const y2 = toCoord.y;

        const ctrlY1 = y1 + 80;
        const ctrlY2 = y2 - 80;

        path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${ctrlY1}, ${x2} ${ctrlY2}, ${x2} ${y2}`);
        path.setAttribute('class', 'tree-connector-line parent-child-line');
      }

      this.linesGroup.appendChild(path);
    });

    this.recenter();
  }
};
