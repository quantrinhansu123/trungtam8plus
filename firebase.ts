// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// TODO: Replace with your Firebase project configuration
// Find this in Firebase Console → Project Settings → General → Your apps → SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKyd64e7XGEDiDSzv4W9UP-ej11x-2qpM",
  authDomain: "morata-a9eba.firebaseapp.com",
  databaseURL: "https://morata-a9eba-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "morata-a9eba",
  storageBucket: "morata-a9eba.appspot.com",
  messagingSenderId: "544190636228",
  appId: "1:544190636228:web:5b59936be85db4cc44a991",
  measurementId: "G-GXP7XPGNG7"
};
export const DATABASE_URL_BASE =
  firebaseConfig.databaseURL || "https://morata-a9eba-default-rtdb.asia-southeast1.firebasedatabase.app";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

// Export app as both named and default for flexibility
export { app };
export default app;

