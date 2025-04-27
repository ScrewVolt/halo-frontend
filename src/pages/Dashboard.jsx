import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { useNavigate, useOutletContext } from "react-router-dom";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export default function Dashboard() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");

  const user = auth.currentUser;
  const navigate = useNavigate();

  const {
    patients,
    setPatients,
    searchTerm,
    setSelectedPatient,
  } = useOutletContext();

  const filteredPatients = patients.filter((p) =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!user) return;
    const ref = query(collection(db, "users", user.uid, "patients"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPatients(data);
    });
    return () => unsub();
  }, [user, setPatients]);

  const handleAdd = async () => {
    if (!name.trim() || !room.trim() || !user) return;
    const ref = collection(db, "users", user.uid, "patients");
    try {
    await addDoc(ref, {
      name: name.trim(),
      room: room.trim(),
      notes: notes.trim() || "",
      createdAt: serverTimestamp(),
      safeMode: true,
    });
  } catch (err){
    console.error("Failed to add patient:", err);
    toast.error("❌ Failed to add patient. Please try again.");
  }
    setName("");
    setRoom("");
    setNotes("");
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-blue-800 mb-4">Patient Dashboard</h1>

        <div className="flex flex-wrap gap-3 md:gap-4">
          <input
            className="flex-1 min-w-[150px] border border-gray-300 p-3 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Patient Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-32 border border-gray-300 p-3 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Room #"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg text-sm font-medium shadow transition duration-150"
          >
            + Add
          </button>
        </div>

        <textarea
          className="w-full border border-gray-300 p-3 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-4"
          placeholder="Optional Notes (e.g., reason for visit, allergies, instructions)"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="grid gap-4 mt-6">
          {filteredPatients.map((p) => (
            <div
              key={p.id}
              className="border rounded-lg p-4 bg-white hover:bg-gray-50 shadow-sm cursor-pointer transition"
              onClick={() => {
                setSelectedPatient(p);
                navigate(`/visit/${p.id}`);
              }}
            >
              <h2 className="text-lg font-bold text-gray-800">{p.name}</h2>
              {p.room && (
                <p className="text-sm text-gray-500 mt-1">Room {p.room}</p>
              )}
              {p.notes && (
                <p className="text-xs text-gray-400 mt-1 italic">
                  {p.notes.length > 60 ? p.notes.slice(0, 60) + "..." : p.notes}
                </p>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
