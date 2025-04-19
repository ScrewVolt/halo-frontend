import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function MainLayout() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const ref = collection(db, "users", user.uid, "patients");
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPatients(data);
    });
    return () => unsub();
  }, [user]);

  const filteredPatients = patients.filter((p) =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        patients={filteredPatients}
        onSearch={setSearchTerm}
        selectedPatient={selectedPatient}
      />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <Outlet
          context={{
            selectedPatient,
            setSelectedPatient,
            patients,
            setPatients,
            searchTerm,        // ✅ Add this
            setSearchTerm      // ✅ And this
          }}
        />
      </main>
    </div>
  );
}