import { useEffect } from "react";
import { db } from "./services/firebase/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

function App() {
  useEffect(() => {
    console.log("TEST BAŞLADI");

    const testFirebase = async () => {
      try {
        await addDoc(collection(db, "test"), {
          name: "arda",
          createdAt: new Date(),
        });
        console.log("Firebase çalışıyor ✅");
      } catch (e) {
        console.error("Firebase hata ❌", e.message);
      }
    };

    testFirebase();
  }, []);

  return <h1>ÇALIŞIYOR</h1>;
}

export default App;
