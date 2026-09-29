const CONFIG = {
  APP_NAME: "Dijital Aile Soyağacı",
  FAMILY_NAME: "GENİŞ AİLE",
  APP_SLOGAN: "Geçmişimizden Geleceğimize...",
  APP_VERSION: "v1.0.0",
  // Firebase'deki ilk kişinin ID'si (Demo veride person_001 veya person_006'dır)
  DEFAULT_CENTER_PERSON_ID: "person_001", 

  // CANLI FIREBASE İÇİN MUTLAKA FALSE OLMALI:
  DEMO_MODE: false,

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

function isFirebaseConfigured() {
  return CONFIG.FIREBASE_CONFIG.apiKey && CONFIG.FIREBASE_CONFIG.apiKey !== "";
}
