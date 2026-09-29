/* ==========================================================================
   PHOTO & AVATAR HANDLING ENGINE (photos.js)
   Handles avatar fallbacks, image dimensions, & Google Drive direct link conversion
   ========================================================================== */

const Photos = {
  /**
   * Process raw photo URL to convert Google Drive sharing links into direct image view links
   * @param {string} url 
   * @returns {string} Direct loadable image URL
   */
  processUrl(url) {
    if (!url || typeof url !== 'string') return '';
    url = url.trim();

    // Check Google Drive file ID pattern
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      // lh3.googleusercontent.com/d/FILE_ID is Google Drive's CDN format for high performance images
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    return url;
  },

  /**
   * Generate an elegant inline SVG placeholder avatar with initials when no photo is provided
   * @param {string} firstName 
   * @param {string} lastName 
   * @param {'male'|'female'} gender 
   * @returns {string} HTML string of placeholder avatar
   */
  getPlaceholderSvg(firstName = '', lastName = '', gender = 'male') {
    const fInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    const initials = `${fInitial}${lInitial}` || 'A';
    
    const maleBg = 'radial-gradient(circle at 30% 30%, #1e3a8a 0%, #0a1128 100%)';
    const femaleBg = 'radial-gradient(circle at 30% 30%, #831843 0%, #0a1128 100%)';
    const background = gender === 'female' ? femaleBg : maleBg;

    return `
      <div class="avatar-fallback" style="background: ${background};">
        <span>${Utils.escapeHtml(initials)}</span>
        <span class="avatar-sub">${Utils.escapeHtml(firstName)}</span>
      </div>
    `;
  },

  /**
   * Handle image load failure by seamlessly replacing broken image with SVG fallback
   */
  handleImageError(imgEl, firstName, lastName, gender) {
    if (!imgEl || !imgEl.parentElement) return;
    const parent = imgEl.parentElement;
    parent.innerHTML = Photos.getPlaceholderSvg(firstName, lastName, gender);
  }
};
