/* ==========================================================================
   KINSHIP GRAPH & RELATIONSHIP ENGINE (relationships.js)
   Computes parents, spouses, children, siblings, & generation depths
   ========================================================================== */

const Relationships = {
  /**
   * Get list of parents for a given person
   */
  getParents(personId, peopleDict, relsDict) {
    if (!personId) return [];
    const parentIds = [];
    Object.values(relsDict).forEach(rel => {
      if (rel.type === 'parent' && rel.to === personId) {
        parentIds.push(rel.from);
      }
    });
    return parentIds.map(id => peopleDict[id]).filter(Boolean);
  },

  /**
   * Get list of spouses for a given person
   */
  getSpouses(personId, peopleDict, relsDict) {
    if (!personId) return [];
    const spouseIds = [];
    Object.values(relsDict).forEach(rel => {
      if (rel.type === 'spouse') {
        if (rel.from === personId) spouseIds.push(rel.to);
        else if (rel.to === personId) spouseIds.push(rel.from);
      }
    });
    return spouseIds.map(id => peopleDict[id]).filter(Boolean);
  },

  /**
   * Get list of children for a given person
   */
  getChildren(personId, peopleDict, relsDict) {
    if (!personId) return [];
    const childIds = [];
    Object.values(relsDict).forEach(rel => {
      if (rel.type === 'parent' && rel.from === personId) {
        childIds.push(rel.to);
      }
    });
    // Remove duplicates if both parents are linked
    const uniqueChildIds = [...new Set(childIds)];
    return uniqueChildIds.map(id => peopleDict[id]).filter(Boolean);
  },

  /**
   * Get derived list of siblings (people sharing at least one parent)
   */
  getSiblings(personId, peopleDict, relsDict) {
    if (!personId) return [];
    const parents = this.getParents(personId, peopleDict, relsDict);
    if (!parents.length) return [];

    const siblingIds = new Set();
    parents.forEach(parent => {
      const children = this.getChildren(parent.id, peopleDict, relsDict);
      children.forEach(c => {
        if (c.id !== personId) {
          siblingIds.add(c.id);
        }
      });
    });

    return Array.from(siblingIds).map(id => peopleDict[id]).filter(Boolean);
  },

  /**
   * Calculate generation depths relative to a central focus person
   * Center person = Level 0
   * Parents = Level -1, Grandparents = Level -2
   * Children = Level +1, Grandchildren = Level +2
   * Spouses & Siblings = Level 0
   */
  calculateGenerations(centerPersonId, peopleDict, relsDict) {
    const levels = {};
    if (!centerPersonId || !peopleDict[centerPersonId]) return levels;

    const visited = new Set();
    const queue = [{ id: centerPersonId, level: 0 }];

    levels[centerPersonId] = 0;
    visited.add(centerPersonId);

    while (queue.length > 0) {
      const { id, level } = queue.shift();

      // 1. Spouses stay at the same generation level
      const spouses = this.getSpouses(id, peopleDict, relsDict);
      spouses.forEach(s => {
        if (!visited.has(s.id)) {
          visited.add(s.id);
          levels[s.id] = level;
          queue.push({ id: s.id, level: level });
        }
      });

      // 2. Siblings stay at the same generation level
      const siblings = this.getSiblings(id, peopleDict, relsDict);
      siblings.forEach(sib => {
        if (!visited.has(sib.id)) {
          visited.add(sib.id);
          levels[sib.id] = level;
          queue.push({ id: sib.id, level: level });
        }
      });

      // 3. Parents go 1 level up (-1)
      const parents = this.getParents(id, peopleDict, relsDict);
      parents.forEach(p => {
        if (!visited.has(p.id)) {
          visited.add(p.id);
          levels[p.id] = level - 1;
          queue.push({ id: p.id, level: level - 1 });
        }
      });

      // 4. Children go 1 level down (+1)
      const children = this.getChildren(id, peopleDict, relsDict);
      children.forEach(c => {
        if (!visited.has(c.id)) {
          visited.add(c.id);
          levels[c.id] = level + 1;
          queue.push({ id: c.id, level: level + 1 });
        }
      });
    }

    return levels;
  },

  /**
   * Validate new relationship to prevent cycles or invalid connections
   */
  validate(fromId, toId, type, relsDict) {
    if (fromId === toId) {
      return { isValid: false, message: "Bir kişi kendisiyle ilişki kuramaz." };
    }

    // Check if duplicate relationship exists
    const duplicate = Object.values(relsDict).find(r => 
      r.type === type && 
      ((r.from === fromId && r.to === toId) || (type === 'spouse' && r.from === toId && r.to === fromId))
    );

    if (duplicate) {
      return { isValid: false, message: "Bu kişilerin arasında zaten aynı tür ilişki mevcut." };
    }

    return { isValid: true };
  },

  /**
   * Count relationships connected to a person
   */
  getPersonRelationshipsCount(personId, relsDict) {
    return Object.values(relsDict).filter(r => r.from === personId || r.to === personId).length;
  },

  /**
   * Remove all relationships associated with a deleted person
   */
  async deletePersonRelationships(personId, relsDict) {
    const toDelete = Object.values(relsDict).filter(r => r.from === personId || r.to === personId);
    for (const r of toDelete) {
      await Database.deleteRelationship(r.id);
    }
  }
};
