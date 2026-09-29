/* ==========================================================================
   AUTHENTICATION & AUTHORIZATION MANAGER (auth.js)
   Handles Firebase Authentication & Guest vs Admin privilege states
   ========================================================================== */

const Auth = {
  currentUser: null,
  isDemoAdmin: false,
  listeners: [],

  init() {
    if (typeof firebase !== 'undefined' && isFirebaseConfigured() && firebase.auth) {
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

  async login(email, password) {
    if (Database.isLiveFirebase && firebase.auth) {
      const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
      this.currentUser = cred.user;
      this.notifyListeners();
      return cred.user;
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
