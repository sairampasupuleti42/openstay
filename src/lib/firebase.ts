// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAhWdn4N28dknFCulzN0wVy7Mj57L3v5Q",
  authDomain: "open-stay.firebaseapp.com",
  projectId: "open-stay",
  storageBucket: "open-stay.firebasestorage.app",
  messagingSenderId: "1016869601145",
  appId: "1:1016869601145:web:28f313b7246c6a661d79a8",
  measurementId: "G-KTKYMJR8XY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
