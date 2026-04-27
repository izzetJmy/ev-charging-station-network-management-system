// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCkpV0sP-EgZ5ySgvQuwOWe3l4Wsobh034",
  authDomain: "ev-charging-station-96742.firebaseapp.com",
  projectId: "ev-charging-station-96742",
  storageBucket: "ev-charging-station-96742.firebasestorage.app",
  messagingSenderId: "500971137239",
  appId: "1:500971137239:web:3bb725b5a60a725c602892",
  measurementId: "G-235N5KVKKL",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
