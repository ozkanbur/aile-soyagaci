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
   * Bir kişinin soyundan gelenlerin (çocuk, torun...) ID kümesi
   */
  getDescendantIds(personId, relsDict) {
    const result = new Set();
    const stack = [personId];
    while (stack.length) {
      const cur = stack.pop();
      Object.values(relsDict).forEach(r => {
        if (r.type === 'parent' && r.from === cur && !result.has(r.to)) {
          result.add(r.to);
          stack.push(r.to);
        }
      });
    }
    return result;
  },

  /**
   * Validate new relationship to prevent cycles or invalid connections
   */
  validate(fromId, toId, type, relsDict, peopleDict) {
    const name = id => {
      const p = peopleDict && peopleDict[id];
      return p ? `${p.firstName} ${p.lastName}` : 'Bu kişi';
    };

    if (fromId === toId) {
      return { isValid: false, message: "Bir kişi kendisiyle ilişki kuramaz." };
    }

    const rels = Object.values(relsDict);

    // Check if duplicate relationship exists
    const duplicate = rels.find(r =>
      r.type === type &&
      ((r.from === fromId && r.to === toId) || (type === 'spouse' && r.from === toId && r.to === fromId))
    );
    if (duplicate) {
      return { isValid: false, message: "Bu kişilerin arasında zaten aynı tür ilişki mevcut." };
    }

    if (type === 'parent') {
      // fromId = ebeveyn, toId = çocuk. Çocuk, ebeveynin atası olamaz (döngü / ters yön).
      if (this.getDescendantIds(toId, relsDict).has(fromId)) {
        return {
          isValid: false,
          message: `${name(toId)} zaten ${name(fromId)} kişisinin atası. Yönü ters seçmiş olabilirsiniz: 1. kişi üst kuşak (anne/baba) olmalı.`
        };
      }
      // En fazla 2 ebeveyn
      const parentCount = rels.filter(r => r.type === 'parent' && r.to === toId).length;
      if (parentCount >= 2) {
        return { isValid: false, message: `${name(toId)} kişisinin zaten 2 ebeveyni kayıtlı.` };
      }
    }

    if (type === 'spouse') {
      const parentChild = rels.find(r => r.type === 'parent' &&
        ((r.from === fromId && r.to === toId) || (r.from === toId && r.to === fromId)));
      if (parentChild) {
        return { isValid: false, message: "Anne/baba ile çocuk aynı zamanda eş olamaz." };
      }
    }

    return { isValid: true };
  },

  /**
   * Veri sağlık kontrolü: çizgilerin yanlış görünmesine yol açan hataları bulur
   * Dönen her kayıt: { level, message, relId? }
   */
  findProblems(peopleDict, relsDict, centerId) {
    const problems = [];
    const rels = Object.values(relsDict);
    const name = id => {
      const p = peopleDict[id];
      return p ? `${p.firstName} ${p.lastName}` : '(silinmiş kişi)';
    };
    const flagged = new Set();
    const add = (level, message, relId) => {
      if (relId) {
        if (flagged.has(relId)) return;
        flagged.add(relId);
      }
      problems.push({ level, message, relId, type: relId ? relsDict[relId].type : null });
    };

    // 1. Silinmiş kişiye bağlı ilişkiler
    rels.forEach(r => {
      if (!peopleDict[r.from] || !peopleDict[r.to]) {
        add('error', 'Kayıtlı olmayan bir kişiye bağlı ilişki var.', r.id);
      }
    });

    // 2. Döngü / ters yön (çocuk, kendi ebeveyninin atası)
    rels.filter(r => r.type === 'parent' && peopleDict[r.from] && peopleDict[r.to]).forEach(r => {
      if (this.getDescendantIds(r.to, relsDict).has(r.from)) {
        add('error', `${name(r.from)} → ${name(r.to)} ilişkisi çelişkili (bir kişi kendi atasının ebeveyni oluyor). Büyük olasılıkla yönü ters girilmiş.`, r.id);
      }
    });

    // 3. Ebeveyn-çocuk aynı zamanda eş
    rels.filter(r => r.type === 'spouse').forEach(r => {
      const pc = rels.find(x => x.type === 'parent' &&
        ((x.from === r.from && x.to === r.to) || (x.from === r.to && x.to === r.from)));
      if (pc) add('error', `${name(r.from)} ve ${name(r.to)} hem eş hem ebeveyn-çocuk olarak kayıtlı.`, r.id);
    });

    // 4. Doğum yılı ile çelişki
    rels.filter(r => r.type === 'parent').forEach(r => {
      const a = peopleDict[r.from], b = peopleDict[r.to];
      if (!a || !b || !a.birthDate || !b.birthDate) return;
      const ay = parseInt(a.birthDate.substring(0, 4), 10);
      const by = parseInt(b.birthDate.substring(0, 4), 10);
      if (ay >= by) {
        add('warn', `${name(r.from)} (${ay}) ebeveyn olarak girilmiş ama ${name(r.to)} (${by}) kişisinden genç veya aynı yaşta. Yön ters olabilir.`, r.id);
      }
    });

    // 5. İkiden fazla ebeveyn
    const parentMap = {};
    rels.filter(r => r.type === 'parent').forEach(r => {
      (parentMap[r.to] = parentMap[r.to] || []).push(r);
    });
    Object.keys(parentMap).forEach(childId => {
      const list = parentMap[childId];
      if (list.length > 2) {
        list.forEach(r => add('error',
          `${name(childId)} kişisinin ${list.length} ebeveyni var (${list.map(x => name(x.from)).join(', ')}). Yanlış olan bağlantıyı silin.`, r.id));
      }
    });

    // 6. Ağaçta yanlış satırda görünen bağlantılar
    if (centerId && peopleDict[centerId]) {
      const levels = this.calculateGenerations(centerId, peopleDict, relsDict);
      rels.filter(r => r.type === 'parent' && peopleDict[r.from] && peopleDict[r.to]).forEach(r => {
        const lf = levels[r.from] !== undefined ? levels[r.from] : 0;
        const lt = levels[r.to] !== undefined ? levels[r.to] : 0;
        if (lf >= lt) {
          add('error', `${name(r.from)} → ${name(r.to)} bağlantısı ağaçta aynı satırda veya ters görünüyor, bu yüzden çizgisi çıkmıyor.`, r.id);
        }
      });
    }

    // 7. Hiçbir bağlantısı olmayan kişiler
    Object.values(peopleDict).forEach(p => {
      const has = rels.some(r => r.from === p.id || r.to === p.id);
      if (!has) add('warn', `${name(p.id)} kişisinin hiçbir akrabalık bağlantısı yok (ağaçta tek başına görünür).`);
    });

    return problems;
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
