/* ==========================================================================
   ADMIN MANAGEMENT & WORKFLOW MODULE (admin.js)
   Handles Person CRUD, Relationship Editor, & "Yeni Çocuk" Fast Workflow
   ========================================================================== */

const Admin = {
  activePersonId: null,
  pendingSpouseOf: null,

  /**
   * Open modal to add a new person
   */
  openAddPersonModal() {
    this.activePersonId = null;
    this.pendingSpouseOf = null;
    const form = document.getElementById('person-form');
    if (form) form.reset();
    
    document.getElementById('modal-person-title').innerText = "Yeni Birey Ekle";
    document.getElementById('form-person-id').value = "";
    
    Modal.open('#person-edit-modal');
  },

  /**
   * Open modal to edit existing person
   */
  openEditPersonModal(personId) {
    const person = Database.cache.people[personId];
    if (!person) return;

    this.activePersonId = personId;
    this.pendingSpouseOf = null;
    document.getElementById('modal-person-title').innerText = "Birey Bilgilerini Düzenle";
    document.getElementById('form-person-id').value = person.id;
    document.getElementById('form-first-name').value = person.firstName || "";
    document.getElementById('form-last-name').value = person.lastName || "";
    document.getElementById('form-nickname').value = person.nickname || "";
    document.getElementById('form-gender').value = person.gender || "male";
    document.getElementById('form-birth-date').value = person.birthDate || "";
    document.getElementById('form-birth-place').value = person.birthPlace || "";
    document.getElementById('form-death-date').value = person.deathDate || "";
    document.getElementById('form-death-place').value = person.deathPlace || "";
    document.getElementById('form-occupation').value = person.occupation || "";
    document.getElementById('form-photo-url').value = person.photoUrl || "";
    document.getElementById('form-notes').value = person.notes || "";

    Modal.open('#person-edit-modal');
  },

  /**
   * Handle Person Form Save
   */
  async handleSavePerson(e) {
    e.preventDefault();
    const rawData = {
      id: document.getElementById('form-person-id').value,
      firstName: document.getElementById('form-first-name').value,
      lastName: document.getElementById('form-last-name').value,
      nickname: document.getElementById('form-nickname').value,
      gender: document.getElementById('form-gender').value,
      birthDate: document.getElementById('form-birth-date').value,
      birthPlace: document.getElementById('form-birth-place').value,
      deathDate: document.getElementById('form-death-date').value,
      deathPlace: document.getElementById('form-death-place').value,
      occupation: document.getElementById('form-occupation').value,
      photoUrl: document.getElementById('form-photo-url').value,
      notes: document.getElementById('form-notes').value
    };

    const validation = People.validate(rawData);
    if (!validation.isValid) {
      Utils.showToast(validation.errors.join(' '), 'error');
      return;
    }

    const cleanedPerson = People.normalize(rawData);
    try {
      const savedId = await Database.savePerson(cleanedPerson);
      Utils.showToast("✓ Kişi bilgileri başarıyla kaydedildi.", 'success');
      let focusId = savedId;
      if (this.pendingSpouseOf && !rawData.id) {
        await Database.saveRelationship({ type: 'spouse', from: this.pendingSpouseOf, to: savedId });
        focusId = this.pendingSpouseOf;
        Utils.showToast("✓ Eş eklendi ve eşleştirildi.", 'success');
      }
      this.pendingSpouseOf = null;
      Modal.close('#person-edit-modal');
      App.setCenterPerson(focusId);
    } catch (err) {
      Utils.showToast("Kayıt sırasında hata oluştu: " + err.message, 'error');
    }
  },

  /**
   * Delete Person with orphan relationship check double-confirmation
   */
  async confirmDeletePerson(personId) {
    const person = Database.cache.people[personId];
    if (!person) return;

    const relCount = Relationships.getPersonRelationshipsCount(personId, Database.cache.relationships);
    const confirmMsg = `${person.firstName} ${person.lastName} kaydını silmek istediğinize emin misiniz?\n\n` +
      `⚠️ Bu kişinin ${relCount} adet bağlı akrabalık ilişkisi bulunmaktadır. Silme işlemi bu ilişkileri de kaldıracaktır!`;

    if (confirm(confirmMsg)) {
      try {
        await Relationships.deletePersonRelationships(personId, Database.cache.relationships);
        await Database.deletePerson(personId);
        Utils.showToast("✓ Kişi ve ilişkileri başarıyla silindi.", 'success');
        Modal.close('#person-detail-modal');
        App.setCenterPerson(CONFIG.DEFAULT_CENTER_PERSON_ID);
      } catch (err) {
        Utils.showToast("Silme hatası: " + err.message, 'error');
      }
    }
  },

  /**
   * Open "+ YENİ ÇOCUK" Fast Workflow Wizard
   */
  openNewChildWizard(parentId) {
    const form = document.getElementById('child-form');
    if (form) form.reset();

    // Populate searchable mother & father selects
    const motherSelect = document.getElementById('child-mother-select');
    const fatherSelect = document.getElementById('child-father-select');

    motherSelect.innerHTML = '<option value="">(Bilinmiyor / Seçilmedi)</option>';
    fatherSelect.innerHTML = '<option value="">(Bilinmiyor / Seçilmedi)</option>';

    Object.values(Database.cache.people).forEach(p => {
      const opt = `<option value="${p.id}">${Utils.escapeHtml(p.firstName)} ${Utils.escapeHtml(p.lastName)} (${p.gender === 'female' ? 'Kadın' : 'Erkek'})</option>`;
      if (p.gender === 'female') motherSelect.innerHTML += opt;
      else fatherSelect.innerHTML += opt;
    });

    // Bir kişinin kartından açıldıysa anne/baba ve soyadı otomatik seçilsin
    if (parentId && Database.cache.people[parentId]) {
      const people = Database.cache.people;
      const rels = Database.cache.relationships;
      const parent = people[parentId];
      const spouses = Relationships.getSpouses(parentId, people, rels);
      const mother = parent.gender === 'female' ? parent : spouses.find(x => x.gender === 'female');
      const father = parent.gender !== 'female' ? parent : spouses.find(x => x.gender !== 'female');
      if (mother) motherSelect.value = mother.id;
      if (father) fatherSelect.value = father.id;
      document.getElementById('child-last-name').value = (father || parent).lastName || '';
    }

    Modal.open('#child-wizard-modal');
  },

  /**
   * Handle "Yeni Çocuk" Wizard Submission
   */
  async handleSaveNewChild(e) {
    e.preventDefault();
    const rawData = {
      firstName: document.getElementById('child-first-name').value,
      lastName: document.getElementById('child-last-name').value,
      gender: document.getElementById('child-gender').value,
      birthDate: document.getElementById('child-birth-date').value,
      birthPlace: document.getElementById('child-birth-place').value,
      photoUrl: document.getElementById('child-photo-url').value,
      notes: document.getElementById('child-notes').value
    };

    const validation = People.validate(rawData);
    if (!validation.isValid) {
      Utils.showToast(validation.errors.join(' '), 'error');
      return;
    }

    const motherId = document.getElementById('child-mother-select').value;
    const fatherId = document.getElementById('child-father-select').value;

    try {
      const cleanedChild = People.normalize(rawData);
      const childId = await Database.savePerson(cleanedChild);

      // Create Mother -> Child link if selected
      if (motherId) {
        await Database.saveRelationship({
          type: 'parent',
          from: motherId,
          to: childId
        });
      }

      // Create Father -> Child link if selected
      if (fatherId) {
        await Database.saveRelationship({
          type: 'parent',
          from: fatherId,
          to: childId
        });
      }

      Utils.showToast("✓ Yeni çocuk ve anne/baba ilişkileri başarıyla oluşturuldu!", 'success');
      Modal.close('#child-wizard-modal');
      App.setCenterPerson(childId);
    } catch (err) {
      Utils.showToast("Çocuk eklenirken hata: " + err.message, 'error');
    }
  },

  /**
   * Open Relationship Manager Modal
   */
  openRelationshipModal() {
    const p1Select = document.getElementById('rel-person1-select');
    const p2Select = document.getElementById('rel-person2-select');
    
    p1Select.innerHTML = '<option value="">1. Kişiyi Seçin</option>';
    p2Select.innerHTML = '<option value="">2. Kişiyi Seçin</option>';

    Object.values(Database.cache.people).forEach(p => {
      const opt = `<option value="${p.id}">${Utils.escapeHtml(p.firstName)} ${Utils.escapeHtml(p.lastName)}</option>`;
      p1Select.innerHTML += opt;
      p2Select.innerHTML += opt;
    });

    this.renderExistingRelationshipsList();
    Modal.open('#relationship-manager-modal');
  },

  /**
   * Handle Relationship Form Creation
   */
  async handleSaveRelationship(e) {
    e.preventDefault();
    const p1Id = document.getElementById('rel-person1-select').value;
    const p2Id = document.getElementById('rel-person2-select').value;
    const relType = document.getElementById('rel-type-select').value;

    if (!p1Id || !p2Id) {
      Utils.showToast("Lütfen her iki kişiyi de seçin.", 'error');
      return;
    }

    const check = Relationships.validate(p1Id, p2Id, relType, Database.cache.relationships, Database.cache.people);
    if (!check.isValid) {
      Utils.showToast(check.message, 'error');
      return;
    }

    try {
      await Database.saveRelationship({
        type: relType,
        from: p1Id,
        to: p2Id
      });
      Utils.showToast("✓ İlişki oluşturuldu.", 'success');
      this.renderExistingRelationshipsList();
    } catch (err) {
      Utils.showToast("İlişki ekleme hatası: " + err.message, 'error');
    }
  },

  renderExistingRelationshipsList() {
    const container = document.getElementById('existing-relationships-list');
    if (!container) return;

    container.innerHTML = '';
    const rels = Object.values(Database.cache.relationships);
    const people = Database.cache.people;

    if (rels.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Henüz kaydedilmiş ilişki bulunmuyor.</div>';
      return;
    }

    rels.forEach(rel => {
      const p1 = people[rel.from];
      const p2 = people[rel.to];
      if (!p1 || !p2) return;

      const typeLabel = rel.type === 'spouse' ? 'EŞİ' : 'EBEVEYNİ';
      const row = document.createElement('div');
      row.className = 'relationship-item-row';
      row.innerHTML = `
        <div class="relationship-entities">
          <strong>${Utils.escapeHtml(p1.firstName)} ${Utils.escapeHtml(p1.lastName)}</strong>
          <span class="relationship-type-pill">${typeLabel}</span>
          <strong>${Utils.escapeHtml(p2.firstName)} ${Utils.escapeHtml(p2.lastName)}</strong>
        </div>
        <button class="btn btn-danger btn-sm" onclick="Admin.deleteRelationship('${rel.id}')">Sil</button>
      `;
      container.appendChild(row);
    });
  },

  async deleteRelationship(relId) {
    if (confirm("Bu ilişki kaydını silmek istediğinize emin misiniz?")) {
      await Database.deleteRelationship(relId);
      Utils.showToast("✓ İlişki silindi.", 'success');
      this.renderExistingRelationshipsList();
    }
  },
  /**
   * Bir kişi için eş ekleme (kartın içinden)
   */
  openAddSpouseModal(personId) {
    const person = Database.cache.people[personId];
    if (!person) return;
    this.openAddPersonModal();
    this.pendingSpouseOf = personId;
    document.getElementById('modal-person-title').innerText = `${person.firstName} ${person.lastName} için Eş Ekle`;
    document.getElementById('form-gender').value = person.gender === 'female' ? 'male' : 'female';
  },

  /**
   * Veri Sağlık Kontrolü
   */
  openDataCheckModal() {
    this.renderDataCheck();
    Modal.open('#data-check-modal');
  },

  renderDataCheck() {
    const box = document.getElementById('data-check-list');
    if (!box) return;
    const centerId = App.currentCenterPersonId || CONFIG.DEFAULT_CENTER_PERSON_ID;
    const problems = Relationships.findProblems(Database.cache.people, Database.cache.relationships, centerId);

    if (!problems.length) {
      box.innerHTML = '<div style="color:#34d399; font-size:14px;">✓ Sorun bulunamadı. Tüm ilişkiler tutarlı görünüyor.</div>';
      return;
    }

    box.innerHTML = problems.map(pr => {
      const color = pr.level === 'error' ? '#fca5a5' : '#fde047';
      const icon = pr.level === 'error' ? '⛔' : '⚠️';
      const buttons = pr.relId ? `
        <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
          ${pr.type === 'parent' ? `<button class="btn btn-secondary btn-sm" onclick="Admin.fixRelationship('${pr.relId}','swap')">🔁 Yönü Çevir</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="Admin.fixRelationship('${pr.relId}','delete')">🗑️ Bağlantıyı Sil</button>
        </div>` : '';
      return `
        <div style="background: rgba(10,17,40,0.5); border:1px solid rgba(255,255,255,0.1); border-left:4px solid ${color}; border-radius:8px; padding:10px 14px; margin-bottom:8px; font-size:13px;">
          <div>${icon} ${Utils.escapeHtml(pr.message)}</div>
          ${buttons}
        </div>`;
    }).join('');
  },

  async fixRelationship(relId, action) {
    const rel = Database.cache.relationships[relId];
    if (!rel) return;
    try {
      if (action === 'swap') {
        await Database.saveRelationship({ id: rel.id, type: rel.type, from: rel.to, to: rel.from });
        Utils.showToast("✓ Yön çevrildi.", 'success');
      } else if (action === 'delete') {
        if (!confirm("Bu bağlantıyı silmek istediğinize emin misiniz?")) return;
        await Database.deleteRelationship(relId);
        Utils.showToast("✓ Bağlantı silindi.", 'success');
      }
    } catch (err) {
      Utils.showToast("İşlem hatası: " + err.message, 'error');
    }
    this.renderDataCheck();
  }
};
