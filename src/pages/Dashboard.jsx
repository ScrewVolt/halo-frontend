import { useState } from "react";
import { db, auth } from "../firebase";
import { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, } from "firebase/firestore";

export default function Dashboard() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");

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
    await addDoc(ref, {
      name: name.trim(),
      room: room.trim(),
      createdAt: serverTimestamp(),
    });
    setName("");
    setRoom("");
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
  
        <div className="grid gap-4 mt-6 sm:grid-cols-1 md:grid-cols-2">
          {filteredPatients.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setSelectedPatient(p);
                navigate(`/visit/${p.id}`);
              }}
              className="border rounded-lg p-4 bg-white hover:bg-gray-50 shadow-md cursor-pointer transition-transform duration-150 active:scale-[0.98]"
            >
              <h2 className="text-xl font-semibold text-gray-800">{p.name}</h2>
            </div>
          ))}
        </div>
      </div>
    </div>
  );  
}