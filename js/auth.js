/* ==========================================================================
   AUTHENTICATION & AUTHORIZATION MANAGER (auth.js)
   Handles Firebase Authentication & Guest vs Admin privilege states
   ========================================================================== */

const Auth = {
  currentUser: null,
  isDemoAdmin: false,
  listeners: [],

  init() {
    if (Database.isLiveFirebase && typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged(user => {
        this.currentUser = user;
        this.notifyListeners();
      });
    } else {
      // Check session storage for Demo Admin login state
      const demoState = sessionStorage.getItem('family_tree_demo_admin');
      this.isDemoAdmin = demoState === 'true';
      this.notifyListeners();
    }
  },

  isAdmin() {
    if (Database.isLiveFirebase) {
      return !!this.currentUser;
    }
    return this.isDemoAdmin;
  },

  onAuthStateChanged(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      callback(this.isAdmin(), this.currentUser);
    }
  },

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.isAdmin(), this.currentUser));
  },

  /**
   * Firebase hata kodlarını anlaşılır Türkçe mesaja çevirir
   */
  translateError(err) {
    const code = (err && err.code) || '';
    const map = {
      'auth/invalid-credential': 'E-posta veya şifre hatalı (ya da bu kullanıcı bu Firebase projesinde yok).',
      'auth/invalid-login-credentials': 'E-posta veya şifre hatalı (ya da bu kullanıcı bu Firebase projesinde yok).',
      'auth/wrong-password': 'Şifre hatalı.',
      'auth/user-not-found': 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.',
      'auth/invalid-email': 'E-posta adresi geçersiz biçimde.',
      'auth/user-disabled': 'Bu kullanıcı devre dışı bırakılmış.',
      'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.',
      'auth/operation-not-allowed': 'Firebase’de Email/Password giriş yöntemi etkin değil.',
      'auth/network-request-failed': 'Ağ hatası. İnternet bağlantınızı kontrol edin.',
      'auth/invalid-api-key': 'Firebase API anahtarı geçersiz (config.js kontrol edin).',
      'auth/api-key-not-valid': 'Firebase API anahtarı geçersiz (config.js kontrol edin).',
      'auth/unauthorized-domain': 'Bu alan adı Firebase’de yetkili değil. Authentication > Settings > Authorized domains bölümüne ozkanbur.github.io ekleyin.',
      'auth/configuration-not-found': 'Firebase Authentication henüz başlatılmamış (Get Started).'
    };
    const msg = map[code] || (err && err.message) || 'Bilinmeyen hata';
    return code ? `${msg} [${code}]` : msg;
  },

  async login(email, password) {
    email = (email || '').trim();

    if (Database.isLiveFirebase && typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
        this.currentUser = cred.user;
        this.notifyListeners();
        return cred.user;
      } catch (err) {
        console.error("Giriş hatası:", err.code, err.message);
        throw new Error(this.translateError(err));
      }
    } else {
      // Demo Mode Admin Password Check
      if (password && password.trim().length >= 4) {
        this.isDemoAdmin = true;
        sessionStorage.setItem('family_tree_demo_admin', 'true');
        this.notifyListeners();
        return { email: 'admin@family.local' };
      } else {
        throw new Error("Geçersiz yönetici şifresi! (Demo modda en az 4 karakter giriniz)");
      }
    }
  },

  async logout() {
    if (Database.isLiveFirebase && firebase.auth) {
      await firebase.auth().signOut();
      this.currentUser = null;
    } else {
      this.isDemoAdmin = false;
      sessionStorage.removeItem('family_tree_demo_admin');
    }
    this.notifyListeners();
  }
};
