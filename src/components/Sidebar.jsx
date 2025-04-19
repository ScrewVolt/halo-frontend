import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

const Sidebar = ({ onSearch, selectedPatient }) => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const user = auth.currentUser;

  useEffect(() => {
    setNotes(""); // Clear notes when switching or deselecting patient
    if (!user || !selectedPatient?.id) return;

    const ref = doc(db, "users", user.uid, "patients", selectedPatient.id);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data();
      if (data?.notes !== undefined) {
        setNotes(data.notes);
      }
    });

    return () => unsub();
  }, [user, selectedPatient]);

  const handleNotesUpdate = async (value) => {
    setNotes(value);
    if (!user || !selectedPatient?.id) return;
    const ref = doc(db, "users", user.uid, "patients", selectedPatient.id);
    await updateDoc(ref, {
      notes: value,
    });
  };

  return (
    <aside className="w-64 bg-white border-r flex flex-col h-full p-4">
      <h2
        className="text-lg font-bold text-blue-700 mb-4 cursor-pointer"
        onClick={() => navigate("/")}
      >
        HALO
      </h2>

      <div className="mb-4">
        <input
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            onSearch?.(e.target.value);
          }}
          placeholder="Search patients..."
          className="w-full border p-2 rounded text-sm"
        />
      </div>

      {selectedPatient && window.location.pathname.includes("/visit/") && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Patient Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => handleNotesUpdate(e.target.value)}
            placeholder="General notes..."
            className="w-full p-2 border rounded text-sm min-h-[80px]"
          />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
