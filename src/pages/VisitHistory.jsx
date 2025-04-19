import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

export default function VisitHistory() {
  const { id } = useParams(); // patient ID
  const [sessions, setSessions] = useState([]);
  const [patient, setPatient] = useState(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchData = async () => {
      const patientRef = doc(db, "users", user.uid, "patients", id);
      const patientSnap = await getDoc(patientRef);
      if (patientSnap.exists()) setPatient({ id: patientSnap.id, ...patientSnap.data() });

      const sessionRef = collection(patientRef, "sessions");
      const q = query(sessionRef, orderBy("lastUsedAt", "desc"));
      const sessionSnap = await getDocs(q);

      const data = sessionSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSessions(data);
    };

    if (user && id) fetchData();
  }, [id, user]);

  const handleNewVisit = async () => {
    const newSessionRef = await addDoc(
      collection(db, "users", user.uid, "patients", id, "sessions"),
      {
        startedAt: serverTimestamp(),
        lastUsedAt: serverTimestamp(),
        sessionNotes: "",
        summary: "",
        darNote: "",
      }
    );

    navigate(`/visit/${id}/session/${newSessionRef.id}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-blue-800 mb-3">
          Visit History for {patient?.name || "Patient"}
        </h1>
        <button
          onClick={handleNewVisit}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg text-sm font-medium shadow transition"
        >
          + Start New Visit
        </button>
      </div>
  
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-600">No previous sessions found.</p>
        ) : (
          sessions.map((sesh) => (
            <div
              key={sesh.id}
              className="border rounded-lg p-4 bg-white hover:bg-gray-50 shadow-md cursor-pointer transition-transform duration-150 active:scale-[0.98]"
              onClick={() => navigate(`/visit/${id}/session/${sesh.id}`)}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800 text-sm sm:text-base">
                  {sesh.darNote ? "🧠 DAR Note" : "📝 Session"} – {sesh.startedAt
                    ? new Date(sesh.startedAt.toDate?.() || sesh.startedAt).toLocaleString()
                    : "No timestamp"}
                </h3>
                <p className="text-xs text-gray-500 italic text-right">
                  Last updated: {sesh.lastUsedAt
                    ? new Date(sesh.lastUsedAt.toDate?.() || sesh.lastUsedAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );  
}
