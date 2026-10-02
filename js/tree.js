/* ==========================================================================
   DYNAMIC SVG FAMILY TREE RENDERER & ZOOM/PAN ENGINE (tree.js)
   Pedigree Orthogonal Bus Connector Engine for Ultra-Clean Lines
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

  // Dal katlama durumu
  collapsed: new Set(),
  hasRendered: false,

  loadCollapsed() {
    try {
      const raw = localStorage.getItem('family_tree_collapsed');
      if (raw) this.collapsed = new Set(JSON.parse(raw));
    } catch (e) {}
  },

  saveCollapsed() {
    try {
      localStorage.setItem('family_tree_collapsed', JSON.stringify(Array.from(this.collapsed)));
    } catch (e) {}
  },

  /** Bir kişinin altındaki dal: soyundan gelenler + onların eşleri */
  branchMembers(pid, peopleDict, relsDict) {
    const desc = Relationships.getDescendantIds(pid, relsDict);
    const out = new Set(desc);
    desc.forEach(d => {
      Relationships.getSpouses(d, peopleDict, relsDict).forEach(sp => out.add(sp.id));
    });
    return out;
  },

  /** Katlanmış dalların gizlediği kişiler */
  computeHidden(peopleDict, relsDict) {
    const hidden = new Set();
    this.collapsed.forEach(cid => {
      if (!peopleDict[cid]) return;
      const keep = new Set([cid]);
      Relationships.getSpouses(cid, peopleDict, relsDict).forEach(sp => keep.add(sp.id));
      this.branchMembers(cid, peopleDict, relsDict).forEach(id => {
        if (!keep.has(id)) hidden.add(id);
      });
    });
    return hidden;
  },

  toggleBranch(pid) {
    const people = Database.cache.people;
    const rels = Database.cache.relationships;
    const group = [pid].concat(Relationships.getSpouses(pid, people, rels).map(x => x.id));
    if (this.collapsed.has(pid)) group.forEach(id => this.collapsed.delete(id));
    else group.forEach(id => this.collapsed.add(id));
    this.saveCollapsed();
    App.renderTree({ keepView: true });
  },

  /** Belirli bir kişiyi gizleyen dalları aç (arama / merkeze alma için) */
  revealPerson(personId, peopleDict, relsDict) {
    let changed = false;
    Array.from(this.collapsed).forEach(cid => {
      if (this.branchMembers(cid, peopleDict, relsDict).has(personId)) {
        this.collapsed.delete(cid);
        changed = true;
      }
    });
    if (changed) this.saveCollapsed();
  },

  /** En üst kuşak ve çocukları açık, daha alttaki dallar kapalı */
  collapseAll() {
    const people = Database.cache.people;
    const rels = Database.cache.relationships;
    const levels = Relationships.calculateGenerations(this.centerPersonId || CONFIG.DEFAULT_CENTER_PERSON_ID, people, rels);
    const vals = Object.values(levels);
    if (!vals.length) return;
    const minLevel = Math.min(...vals);
    this.collapsed = new Set();
    Object.keys(people).forEach(pid => {
      const lvl = levels[pid] !== undefined ? levels[pid] : 0;
      if (lvl > minLevel && Relationships.getChildren(pid, people, rels).length > 0) {
        this.collapsed.add(pid);
      }
    });
    this.saveCollapsed();
    App.renderTree();
  },

  expandAll() {
    this.collapsed = new Set();
    this.saveCollapsed();
    App.renderTree();
  },

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

    this.loadCollapsed();
    this.bindEvents();
  },

  bindEvents() {
    if (!this.svgEl) return;

    // Mouse Pan Events
    this.svgEl.addEventListener('mousedown', (e) => {
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
  render(centerPersonId, peopleDict, relsDict, opts = {}) {
    if (!this.svgEl || !peopleDict || Object.keys(peopleDict).length === 0) return;

    this.centerPersonId = centerPersonId || CONFIG.DEFAULT_CENTER_PERSON_ID;
    if (!peopleDict[this.centerPersonId]) {
      this.centerPersonId = Object.keys(peopleDict)[0];
    }

    // 1. Calculate generation depths relative to center person
    const genLevels = Relationships.calculateGenerations(this.centerPersonId, peopleDict, relsDict);
    
    // Katlanmış dalları gizle (merkez kişi her zaman görünür)
    const hiddenSet = this.computeHidden(peopleDict, relsDict);
    hiddenSet.delete(this.centerPersonId);
    const visibleIds = Object.keys(peopleDict).filter(pid => !hiddenSet.has(pid));

    // Akrabalık adları ("Ben kimim?" seçimine göre)
    const meId = (typeof Kinship !== 'undefined') ? Kinship.getMeId(peopleDict) : null;
    const kinMap = meId ? Kinship.computeAll(meId, peopleDict, relsDict) : {};

    // 2. Group people by generation level
    const levelGroups = {};
    visibleIds.forEach(pid => {
      const lvl = genLevels[pid] !== undefined ? genLevels[pid] : 0;
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push(peopleDict[pid]);
    });

    // 3. Compute (X, Y) layout coordinates for each card
    const nodeCoords = {};
    const cardW = 220;
    const cardH = 310;
    const xSpacing = 280;
    const ySpacing = 390;

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

      const romanGen = Utils.toRomanGeneration(level - sortedLevels[0] + 1);
      const lifeSpan = Utils.getLifeSpan(person.birthDate, person.deathDate);
      const isDeceased = !!person.deathDate;
      const photoHtml = person.photoUrl 
        ? `<img class="card-photo" src="${person.photoUrl}" alt="${Utils.escapeHtml(person.firstName)}" onerror="Photos.handleImageError(this, '${person.firstName}', '${person.lastName}', '${person.gender}')">`
        : Photos.getPlaceholderSvg(person.firstName, person.lastName, person.gender);

      const kinLabel = kinMap[pid] || '';
      const childCount = Relationships.getChildren(person.id, peopleDict, relsDict).length;
      const isCollapsed = this.collapsed.has(pid);
      let branchHtml = '';
      if (childCount > 0) {
        const famKeep = new Set([pid]);
        Relationships.getSpouses(pid, peopleDict, relsDict).forEach(sp => famKeep.add(sp.id));
        let branchSize = 0;
        this.branchMembers(pid, peopleDict, relsDict).forEach(id => { if (!famKeep.has(id)) branchSize++; });
        branchHtml = `<div class="card-branch-toggle ${isCollapsed ? 'is-collapsed' : ''}"
            onclick="event.stopPropagation(); TreeEngine.toggleBranch('${person.id}')">
            ${isCollapsed ? `▸ Dalı aç (+${branchSize} kişi)` : `▾ Dalı katla (${branchSize} kişi)`}
          </div>`;
      }

      fo.innerHTML = `
        <div class="person-card ${person.gender} ${isCenter ? 'is-center' : ''} ${childCount > 0 ? 'has-branch' : ''}" onclick="App.onCardClick('${person.id}')">
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
          ${kinLabel ? `<div class="card-kinship ${pid === meId ? 'is-me' : ''}">${Utils.escapeHtml(kinLabel)}</div>` : ''}
          <div class="card-divider"></div>

          <div class="card-relation-counts">
            <div class="count-chip"><span>${Relationships.getParents(person.id, peopleDict, relsDict).length}</span>Anne/Baba</div>
            <div class="count-chip"><span>${Relationships.getSpouses(person.id, peopleDict, relsDict).length}</span>Eş</div>
            <div class="count-chip"><span>${childCount}</span>Çocuk</div>
          </div>
          ${branchHtml}
        </div>
      `;

      this.nodesGroup.appendChild(fo);
    });

    // 5. Render SVG Connector Lines (Orthogonal Pedigree Bus Topology)
    this.linesGroup.innerHTML = '';

    // A. Render Spouse Lines & Marriage Junction Nodes
    const processedSpousePairs = new Set();
    Object.values(relsDict).forEach(rel => {
      if (rel.type !== 'spouse') return;
      const p1Coord = nodeCoords[rel.from];
      const p2Coord = nodeCoords[rel.to];
      if (!p1Coord || !p2Coord) return;

      const pairKey = [rel.from, rel.to].sort().join('_');
      if (processedSpousePairs.has(pairKey)) return;
      processedSpousePairs.add(pairKey);

      const leftCoord = p1Coord.x < p2Coord.x ? p1Coord : p2Coord;
      const rightCoord = p1Coord.x < p2Coord.x ? p2Coord : p1Coord;

      const x1 = leftCoord.x + cardW;
      const y1 = leftCoord.y + 80;
      const x2 = rightCoord.x;
      const y2 = rightCoord.y + 80;

      const spousePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      spousePath.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
      spousePath.setAttribute('class', 'tree-connector-line spouse-line');
      this.linesGroup.appendChild(spousePath);

      // Marriage Junction Badge
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ring.setAttribute('class', 'spouse-junction-node');
      ring.innerHTML = `
        <circle cx="${midX}" cy="${midY}" r="9" fill="#d4af37" stroke="#0a1128" stroke-width="2"/>
        <text x="${midX}" y="${midY + 3.5}" text-anchor="middle" font-size="9px" fill="#0a1128" font-weight="bold">💍</text>
      `;
      this.linesGroup.appendChild(ring);
    });

    // B. Render Parent-Child Family Trees (Bus Connector Lines)
    const familyUnits = {};

    visibleIds.forEach(personId => {
      const parents = Relationships.getParents(personId, peopleDict, relsDict);
      if (!parents || parents.length === 0) return;

      const parentIds = parents.map(p => p.id).sort().join('_');
      if (!familyUnits[parentIds]) {
        familyUnits[parentIds] = {
          parents: parents,
          children: []
        };
      }
      familyUnits[parentIds].children.push(personId);
    });

    Object.values(familyUnits).forEach(unit => {
      const childrenCoords = unit.children.map(cid => nodeCoords[cid]).filter(Boolean);
      if (childrenCoords.length === 0) return;

      // Kaç ebeveyn olursa olsun (1, 2 veya daha fazla) gövde çizgisini ortalayarak çiz
      const parentCoords = unit.parents.map(p => nodeCoords[p.id]).filter(Boolean);
      if (parentCoords.length === 0) return;

      const trunkStartX = parentCoords.reduce((sum, c) => sum + c.x + (cardW / 2), 0) / parentCoords.length;
      const trunkStartY = Math.max(...parentCoords.map(c => c.y)) + cardH;

      const childrenMinY = Math.min(...childrenCoords.map(c => c.y));
      const busY = trunkStartY + (childrenMinY - trunkStartY) / 2;

      // 1. Vertical Trunk Line from Parent(s) down to Bus Y
      const trunkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      trunkPath.setAttribute('d', `M ${trunkStartX} ${trunkStartY} L ${trunkStartX} ${busY}`);
      trunkPath.setAttribute('class', 'tree-connector-line parent-trunk-line');
      this.linesGroup.appendChild(trunkPath);

      // 2. Horizontal Bus Bar stretching across children
      const childXList = childrenCoords.map(c => c.x + (cardW / 2));
      const minChildX = Math.min(...childXList, trunkStartX);
      const maxChildX = Math.max(...childXList, trunkStartX);

      const busPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      busPath.setAttribute('d', `M ${minChildX} ${busY} L ${maxChildX} ${busY}`);
      busPath.setAttribute('class', 'tree-connector-line parent-bus-line');
      this.linesGroup.appendChild(busPath);

      // 3. Vertical Drop Line from Bus Y down into each child top center
      childrenCoords.forEach(cCoord => {
        const childCenterX = cCoord.x + (cardW / 2);
        const childTopY = cCoord.y;

        const dropPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        dropPath.setAttribute('d', `M ${childCenterX} ${busY} L ${childCenterX} ${childTopY}`);
        dropPath.setAttribute('class', 'tree-connector-line child-drop-line');
        this.linesGroup.appendChild(dropPath);

        // Junction dot at child card entry
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', childCenterX);
        dot.setAttribute('cy', childTopY);
        dot.setAttribute('r', '4.5');
        dot.setAttribute('fill', '#3b82f6');
        dot.setAttribute('stroke', '#ffffff');
        dot.setAttribute('stroke-width', '1.5');
        this.linesGroup.appendChild(dot);
      });
    });

    if (!opts.keepView) this.recenter();
    this.hasRendered = true;
  }
};
