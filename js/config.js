/* ==========================================================================
   APPLICATION CONFIGURATION (config.js)
   Centralized configuration settings for Dijital Aile Soyağacı
   ========================================================================== */

const CONFIG = {
  APP_NAME: "Dijital Aile Soyağacı",
  FAMILY_NAME: "GÖRGEÇ Ailesi",
  APP_SLOGAN: "Geçmişimizden Geleceğimize...",
  APP_VERSION: "v1.0.0",
  DEFAULT_CENTER_PERSON_ID: "person_006", // Özkan Kanbur in Demo Mode

  // Mode Toggle: Set to true if Firebase credentials are missing or for demo testing
  DEMO_MODE: false,

  // Firebase Configuration Placeholder
  // BENİM NOTUM: Kendi Firebase projenizi oluşturduğunuzda aşağıdaki bilgileri kendi projenizle değiştirin!
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyBZCRTGN1ycIBM8LdIiVRZ-Dv-1PqtQF2k",
    authDomain: "aile-soyagaci.firebaseapp.com",
    databaseURL: "https://aile-soyagaci-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "aile-soyagaci",
    storageBucket: "aile-soyagaci.firebasestorage.app",
    messagingSenderId: "358199082200",
    appId: "1:358199082200:web:d6bcbfa8ee111d79d6abad"
  }
};

// Auto-detect if Firebase Config has been customized by user
function isFirebaseConfigured() {
  return CONFIG.FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_API_KEY" &&
         CONFIG.FIREBASE_CONFIG.databaseURL !== "https://your-app-default-rtdb.firebaseio.com";
}
