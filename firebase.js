import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBG4m7F2YEIPOduLGNniryltMNLXEtYnXQ",
  authDomain: "a-liar-within-v3.firebaseapp.com",
  databaseURL: "https://a-liar-within-v3-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "a-liar-within-v3",
  storageBucket: "a-liar-within-v3.firebasestorage.app",
  messagingSenderId: "170644517763",
  appId: "1:170644517763:web:08e0a2912cfec9d460bcb6"
};

const app = initializeApp(firebaseConfig);
const isPlaceholderApiKey = firebaseConfig.apiKey === 'AIzaSy...' || firebaseConfig.apiKey.includes('...');
const auth = isPlaceholderApiKey ? null : getAuth(app);

const authReady = isPlaceholderApiKey
  ? Promise.resolve(null)
  : new Promise((resolve, reject) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          resolve(user);
        }
      }, reject);
    });

if (!isPlaceholderApiKey) {
  signInAnonymously(auth).catch((error) => {
    console.error('Firebase anonymous auth failed', error);
  });
} else {
  console.warn('Firebase API key is not configured. Anonymous auth is disabled.');
}

export { app, auth, authReady, firebaseConfig };
