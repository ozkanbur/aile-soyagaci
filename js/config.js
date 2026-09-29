/* ==========================================================================
   APPLICATION CONFIGURATION (config.js)
   Centralized configuration settings for Dijital Aile Soyağacı
   ========================================================================== */

const CONFIG = {
  APP_NAME: "Dijital Aile Soyağacı",
  FAMILY_NAME: "Kanbur Ailesi",
  APP_SLOGAN: "Geçmişimizden Geleceğimize...",
  APP_VERSION: "v1.0.0",
  DEFAULT_CENTER_PERSON_ID: "person_006", // Özkan Kanbur in Demo Mode

  // Mode Toggle: Set to true if Firebase credentials are missing or for demo testing
  DEMO_MODE: true,

  // Firebase Configuration Placeholder
  // BENİM NOTUM: Kendi Firebase projenizi oluşturduğunuzda aşağıdaki bilgileri kendi projenizle değiştirin!
  FIREBASE_CONFIG: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-app.firebaseapp.com",
    databaseURL: "https://your-app-default-rtdb.firebaseio.com",
    projectId: "your-app-id",
    storageBucket: "your-app.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  }
};

// Auto-detect if Firebase Config has been customized by user
function isFirebaseConfigured() {
  return CONFIG.FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_API_KEY" &&
         CONFIG.FIREBASE_CONFIG.databaseURL !== "https://your-app-default-rtdb.firebaseio.com";
}
