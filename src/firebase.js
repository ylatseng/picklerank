import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore"; 

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

// This forces Firebase to bypass standard WebSocket blocks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});