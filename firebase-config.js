// Configuración de Firebase
const firebaseConfig = {
      apiKey: "AIzaSyDn_PE8kv8VPF4os0dJPusrlY2EdTo8IPM",
  authDomain: "whatschat-app-7e0cf.firebaseapp.com",
  projectId: "whatschat-app-7e0cf",
  storageBucket: "whatschat-app-7e0cf.firebasestorage.app",
  messagingSenderId: "102300494716",
  appId: "1:102300494716:web:c9d3047a52527ad85a52f9",
  measurementId: "G-L98BHY2983"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Para desarrollo: emular localmente (opcional)
if (window.location.hostname === "localhost") {
    db.useEmulator("localhost", 8080);
    auth.useEmulator("http://localhost:9099");
}

// Exportar para usar en otros archivos
window.firebaseApp = {
    auth: auth,
    db: db,
    storage: storage,
    firestore: firebase.firestore,
    timestamp: firebase.firestore.FieldValue.serverTimestamp
};