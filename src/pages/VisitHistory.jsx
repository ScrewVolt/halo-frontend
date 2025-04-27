import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, addDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from "firebase/firestore";
import toast from "react-hot-toast";

export default function VisitHistory() {
  const { id } = useParams(); // Patient ID
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [patient, setPatient] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user || !id) return;

    const patientRef = doc(db, "users", user.uid, "patients", id);
    const unsubPatient = onSnapshot(patientRef, (snap) => {
      if (snap.exists()) {
        setPatient({ id: snap.id, ...snap.data() });
      }
    });

    const sessionsRef = query(
      collection(db, "users", user.uid, "patients", id, "sessions"),
      orderBy("createdAt", "desc")
    );
    const unsubSessions = onSnapshot(sessionsRef, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSessions(data);
    });

    return () => {
      unsubPatient();
      unsubSessions();
    };
  }, [user, id]);

  const handleNewVisit = async () => {
    if (!user || !patient) return;

    const newSessionRef = collection(db, "users", user.uid, "patients", id, "sessions");

    const newSession = await addDoc(newSessionRef, {
      createdAt: serverTimestamp(),
      startedAt: serverTimestamp(),
      lastUsedAt: serverTimestamp(),
      sessionNotes: "",
      darNote: "",
      generatedAt: "",
      patientName: patient.name || "",
      room: patient.room || "",
    });
    toast.success("✅ New session created!");
    navigate(`/visit/${id}/session/${newSession.id}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-blue-800">
          Visit History for {patient?.name || "Patient"}
        </h1>
        <button
          onClick={handleNewVisit}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg text-sm font-medium shadow transition duration-150 w-full md:w-auto"
        >
          + Start New Visit
        </button>
      </div>
  
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-600">No previous sessions found.</p>
        ) : (
          sessions.map((sesh) => (
            <div
              key={sesh.id}
              className="border rounded-lg p-4 bg-white hover:bg-gray-50 shadow-sm cursor-pointer transition"
              onClick={() => navigate(`/visit/${id}/session/${sesh.id}`)}
            >
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-gray-800">
                  {sesh.darNote ? "🧠 DAR Note Available" : "📝 Session"}
                </h3>
                <p className="text-xs text-gray-500 italic">
                  Last updated: {sesh.lastUsedAt
                    ? new Date(sesh.lastUsedAt.toDate?.() || sesh.lastUsedAt).toLocaleString()
                    : "N/A"}
                </p>
                {sesh.room && (
                  <p className="text-xs text-gray-400 mt-1">Room {sesh.room}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}