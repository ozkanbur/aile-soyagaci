/* ==========================================================================
   DATABASE SERVICE ADAPTER (database.js)
   Abstracts Firebase Realtime Database & LocalStorage Demo Mode
   ========================================================================== */

const Database = {
  dbRef: null,
  listeners: [],
  cache: {
    people: {},
    relationships: {}
  },
  isLiveFirebase: false,

  /**
   * Initialize data provider (Firebase RTDB vs Demo Mode)
   */
  async init() {
    if (typeof firebase !== 'undefined' && isFirebaseConfigured()) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        }
        this.dbRef = firebase.database().ref();
        this.isLiveFirebase = true;
        console.log("🔥 Firebase Realtime Database connected!");
        
        // Listen for realtime updates
        this.dbRef.on('value', (snapshot) => {
          const val = snapshot.val() || {};
          this.cache.people = val.people || {};
          this.cache.relationships = val.relationships || {};
          console.log("Firebase verisi:", Object.keys(this.cache.people).length, "kişi");
          this.notifyListeners();
        }, (error) => {
          console.error("Firebase okuma hatası:", error);
          if (typeof Utils !== 'undefined') {
            Utils.showToast("Veri okunamadı: " + error.message, 'error');
          }
        });

    // Demo Mode Fallback (LocalStorage + demo-data.json)
    console.log("ℹ Running in DEMO MODE (Local Storage & Sample Dataset)");
    this.isLiveFirebase = false;
    await this.loadDemoData();
  },

  async loadDemoData() {
    const localPeople = localStorage.getItem('family_tree_people');
    const localRels = localStorage.getItem('family_tree_relationships');

    if (localPeople && localRels) {
      try {
        this.cache.people = JSON.parse(localPeople);
        this.cache.relationships = JSON.parse(localRels);
        this.notifyListeners();
        return;
      } catch (e) {
        console.error("Failed to parse localStorage demo data:", e);
      }
    }

    // Fetch initial demo-data.json file
    try {
      const resp = await fetch('data/demo-data.json');
      const data = await resp.json();
      this.cache.people = data.people || {};
      this.cache.relationships = data.relationships || {};
      this.saveToLocalStorage();
      this.notifyListeners();
    } catch (err) {
      console.error("Could not fetch demo-data.json:", err);
      this.cache.people = {};
      this.cache.relationships = {};
    }
  },

  saveToLocalStorage() {
    if (!this.isLiveFirebase) {
      localStorage.setItem('family_tree_people', JSON.stringify(this.cache.people));
      localStorage.setItem('family_tree_relationships', JSON.stringify(this.cache.relationships));
    }
  },

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.cache.people, this.cache.relationships));
  },

  onDataChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      // Trigger immediately with current cached data
      callback(this.cache.people, this.cache.relationships);
    }
  },

  // CRUD Operations
  async savePerson(personData) {
    if (!personData.id) {
      personData.id = 'person_' + Date.now();
    }
    
    if (this.isLiveFirebase) {
      await this.dbRef.child('people').child(personData.id).set(personData);
    } else {
      this.cache.people[personData.id] = personData;
      this.saveToLocalStorage();
      this.notifyListeners();
    }
    return personData.id;
  },

  async deletePerson(personId) {
    if (this.isLiveFirebase) {
      await this.dbRef.child('people').child(personId).remove();
    } else {
      delete this.cache.people[personId];
      this.saveToLocalStorage();
      this.notifyListeners();
    }
  },

  async saveRelationship(relData) {
    if (!relData.id) {
      relData.id = 'rel_' + Date.now();
    }
    if (this.isLiveFirebase) {
      await this.dbRef.child('relationships').child(relData.id).set(relData);
    } else {
      this.cache.relationships[relData.id] = relData;
      this.saveToLocalStorage();
      this.notifyListeners();
    }
    return relData.id;
  },

  async deleteRelationship(relId) {
    if (this.isLiveFirebase) {
      await this.dbRef.child('relationships').child(relId).remove();
    } else {
      delete this.cache.relationships[relId];
      this.saveToLocalStorage();
      this.notifyListeners();
    }
  },

  async restoreFullDatabase(dataObject) {
    if (!dataObject || typeof dataObject !== 'object') {
      throw new Error("Geçersiz yedek dosyası formatı!");
    }
    const newPeople = dataObject.people || {};
    const newRels = dataObject.relationships || {};

    if (this.isLiveFirebase) {
      await this.dbRef.set({
        people: newPeople,
        relationships: newRels
      });
    } else {
      this.cache.people = newPeople;
      this.cache.relationships = newRels;
      this.saveToLocalStorage();
      this.notifyListeners();
    }
  }
};
