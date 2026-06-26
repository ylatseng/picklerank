import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyDPYQS7YLqTHbzowmXNX4oiGA8y5GeZzUM",
  authDomain: "picklerank-f9e5e.firebaseapp.com",
  projectId: "picklerank-f9e5e",
  storageBucket: "picklerank-f9e5e.firebasestorage.app",
  messagingSenderId: "434296589884",
  appId: "1:434296589884:web:faf099ef44325fbb05fd39",
  measurementId: "G-Z07RF833PE"
};

const app = initializeApp(firebaseConfig);

// Offline persistence via IndexedDB — writes queued offline survive app restarts.
// persistentMultipleTabManager allows multiple browser tabs to share one cache.
// Falls back gracefully if IndexedDB is unavailable (private browsing, etc.)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalForceLongPolling: true
});