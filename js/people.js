/* ==========================================================================
   PEOPLE MODEL & DATA LOGIC (people.js)
   ========================================================================== */

const People = {
  /**
   * Validate person record before creation or modification
   */
  validate(personData) {
    const errors = [];
    if (!personData.firstName || !personData.firstName.trim()) {
      errors.push("Ad alanı zorunludur.");
    }
    if (!personData.lastName || !personData.lastName.trim()) {
      errors.push("Soyad alanı zorunludur.");
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Clean and normalize person object structure
   */
  normalize(personData) {
    return {
      id: personData.id || '',
      firstName: (personData.firstName || '').trim(),
      lastName: (personData.lastName || '').trim(),
      nickname: (personData.nickname || '').trim(),
      gender: personData.gender === 'female' ? 'female' : 'male',
      birthDate: personData.birthDate || '',
      birthPlace: (personData.birthPlace || '').trim(),
      deathDate: personDateDeath(personData.deathDate),
      deathPlace: (personData.deathPlace || '').trim(),
      occupation: (personData.occupation || '').trim(),
      photoUrl: Photos.processUrl(personData.photoUrl || ''),
      notes: (personData.notes || '').trim()
    };
  },

  getFullName(person) {
    if (!person) return '';
    return `${person.firstName} ${person.lastName}`.trim();
  }
};

function personDateDeath(dateVal) {
  if (!dateVal || dateVal === 'null' || dateVal === 'undefined') return '';
  return dateVal.trim();
}
