/* ==========================================================================
   BACKUP & RESTORE MODULE (backup.js)
   Export and restore full family tree database as JSON
   ========================================================================== */

const Backup = {
  /**
   * Export all people and relationships as a downloadable JSON file
   */
  exportToJson() {
    const data = {
      appName: CONFIG.APP_NAME,
      familyName: CONFIG.FAMILY_NAME,
      version: CONFIG.APP_VERSION,
      exportDate: new Date().toISOString(),
      people: Database.cache.people || {},
      relationships: Database.cache.relationships || {}
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateSuffix = new Date().toISOString().slice(0, 10);
    const filename = `aile-soyagaci-${dateSuffix}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Utils.showToast(`✓ Yedeğiniz ${filename} olarak indirildi.`, 'success');
  },

  /**
   * Restore database from an uploaded JSON backup file
   */
  async restoreFromFile(fileInputEl) {
    const file = fileInputEl.files[0];
    if (!file) return;

    const confirmMsg = "⚠️ DIKKAT: Yükleyeceğiniz yedek mevcut verilerin üzerine yazılacaktır.\n\nDevam etmek istiyor musunuz?";
    if (!confirm(confirmMsg)) {
      fileInputEl.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || (!parsed.people && !parsed.relationships)) {
          throw new Error("Geçersiz yedek dosyası yapısı!");
        }

        await Database.restoreFullDatabase(parsed);
        Utils.showToast("✓ Veriler başarıyla geri yüklendi!", 'success');
        Modal.close('#backup-modal');
        App.renderTree();
      } catch (err) {
        Utils.showToast("Yedek yükleme hatası: " + err.message, 'error');
      } finally {
        fileInputEl.value = '';
      }
    };
    reader.readAsText(file);
  }
};
