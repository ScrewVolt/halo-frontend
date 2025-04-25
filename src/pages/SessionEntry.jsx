import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import ChatMessage from "../components/ChatMessage";
import VoiceToggle from "../components/VoiceToggle";
import SummaryViewer from "../components/SummaryViewer";
import jsPDF from "jspdf";
import generateFHIRDocument from "../utils/generateFHIRDocument";

export default function SessionEntry() {
  const { id: patientId, sessionId } = useParams();
  const [patient, setPatient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [speaker, setSpeaker] = useState("nurse");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [darNote, setDarNote] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [lastUsedAt, setLastUsedAt] = useState(null);
  const [showFHIR, setShowFHIR] = useState(false);
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(true);
  const user = auth.currentUser;

    useEffect(() => {
      if (!user || !patientId || !sessionId) return;
      const loadPatientAndSession = async () => {
        const patientRef = doc(db, "users", user.uid, "patients", patientId);
        const patientSnap = await getDoc(patientRef);
        if (patientSnap.exists()) {
          setPatient({ id: patientSnap.id, ...patientSnap.data() });
        }
  
        const sessionRef = doc(db, "users", user.uid, "patients", patientId, "sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
          const sessionData = sessionSnap.data();
          setDarNote(sessionData.darNote || "");
          setGeneratedAt(sessionData.generatedAt || null);
          setSessionNotes(sessionData.sessionNotes || "");
          setStartedAt(sessionData.startedAt || null);
          setLastUsedAt(sessionData.lastUsedAt || null);
        }
      };
      loadPatientAndSession();
    }, [user, patientId, sessionId]);

    useEffect(() => {
      if (!user || !patientId || !sessionId) return;
      const q = query(
        collection(db, "users", user.uid, "patients", patientId, "sessions", sessionId, "messages"),
        orderBy("createdAt", "asc")
      );
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(data);
      });
      return () => unsub();
    }, [user, patientId, sessionId]);

      const sendMessage = async (text) => {
        const timestamp = new Date();
        const full = `[${timestamp.toLocaleTimeString()}] ${
          speaker === "nurse" ? "Nurse" : "Patient"
        }: ${text}`;
    
        await addDoc(
          collection(db, "users", user.uid, "patients", patientId, "sessions", sessionId, "messages"),
          {
            text: full,
            createdAt: timestamp,
          }
        );
    
        await updateDoc(doc(db, "users", user.uid, "patients", patientId, "sessions", sessionId), {
          lastUsedAt: timestamp.toISOString(),
          startedAt: startedAt || timestamp.toISOString(),
        });
    
        setChatInput("");
        setLiveTranscript("");
      };

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported.");

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    setRecognizing(true);
    shouldRestartRef.current = true;

    let resultText = "";

    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const transcript = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal) resultText += " " + transcript;
        else interim = transcript;
      }
      setLiveTranscript(interim);
    };

    recognition.onend = () => {
      if (resultText.trim()) sendMessage(resultText.trim());
      setLiveTranscript("");
      resultText = "";
      if (shouldRestartRef.current) startRecognition();
    };

    recognition.onerror = (e) => {
      console.error("Speech error:", e);
      setRecognizing(false);
    };

    recognition.start();
  };

  const stopRecognition = () => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecognizing(false);
    setLiveTranscript("");
  };

  const handleGenerateSummary = async () => {
    if (!messages.length) return;
    setLoadingSummary(true);

    const chatText = messages.map((m) => m.text).join("\n");

    try {
      const res = await fetch("http://127.0.0.1:5000/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatText }),
      });

      if (!res.ok) throw new Error("Failed to fetch summary");

      const data = await res.json();
      if (!data.dar) throw new Error("No DAR returned from backend");

      const now = new Date().toISOString();
      setDarNote(data.dar.trim());
      setGeneratedAt(now);

      const sessionRef = doc(
        db,
        "users",
        user.uid,
        "patients",
        patientId,
        "sessions",
        sessionId
      );
      await updateDoc(sessionRef, {
        darNote: data.dar.trim(),
        generatedAt: now,
        lastUsedAt: now,
      });
    } catch (err) {
      console.error(err);
      alert("❌ Failed to generate summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleExport = async () => {
    const pdf = new jsPDF();
    pdf.text(`Session with ${patient?.name || "Patient"}`, 20, 30);

    let y = 60;
    messages.forEach((msg) => {
      pdf.text(msg.text, 20, y);
      y += 20;
    });

    if (darNote) {
      y += 20;
      pdf.text("AI-Generated DAR Note:", 20, y);
      y += 20;
      const lines = pdf.splitTextToSize(darNote, 170);
      pdf.text(lines, 20, y);
      y += lines.length * 10;
    }

    if (sessionNotes) {
      y += 20;
      pdf.text("Nurse Notes:", 20, y);
      y += 20;
      const lines = pdf.splitTextToSize(sessionNotes, 170);
      pdf.text(lines, 20, y);
    }

    pdf.save(`${patient?.name || "Patient"}_session.pdf`);
  };

  const handleNotesChange = async (e) => {
    const value = e.target.value;
    setSessionNotes(value);
    await setDoc(
      doc(db, "users", user.uid, "patients", patientId, "sessions", sessionId),
      {
        sessionNotes: value,
        lastUsedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  };


  const fhirDocument = generateFHIRDocument({ darNote, patient, generatedAt });

  const handleDownloadFHIR = () => {
    const blob = new Blob([JSON.stringify(fhirDocument, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${patient?.name || "HALO_Patient"}_FHIR_Document.json`;
    link.click();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-blue-800 mb-2">
          Session with {patient?.name || "Patient"}
        </h1>
        {(startedAt || lastUsedAt) && (
          <div className="text-sm text-gray-500 italic space-y-1">
            {startedAt && (
              <p>
                Session started:{" "}
                {new Date(startedAt.toDate?.() || startedAt).toLocaleString()}
              </p>
            )}
            {lastUsedAt && (
              <p>
                Last updated:{" "}
                {new Date(lastUsedAt.toDate?.() || lastUsedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
  
      <div className="border rounded-lg p-4 bg-gray-50 h-[300px] overflow-y-auto shadow-sm">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} patientId={patientId} sessionId={sessionId} />
        ))}
        {recognizing && (
          <p className="text-xs text-blue-500 italic animate-pulse mt-2">
            🎤 Listening for {speaker}...
          </p>
        )}
      </div>
  
      {liveTranscript && (
        <div className="bg-white border rounded-lg p-3 text-sm shadow-sm">
          <span className="font-semibold text-gray-600">Transcript:</span> {liveTranscript}
        </div>
      )}
  
      <div className="flex gap-2 flex-wrap">
        <input
          className="flex-1 min-w-[150px] border border-gray-300 p-3 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(chatInput)}
          placeholder="Type message..."
        />
        <button
          onClick={() => sendMessage(chatInput)}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg text-sm font-medium shadow transition"
        >
          Send
        </button>
      </div>
  
      <VoiceToggle
        recognizing={recognizing}
        speaker={speaker}
        onToggleSpeaker={() => setSpeaker((prev) => (prev === "nurse" ? "patient" : "nurse"))}
        onStart={startRecognition}
        onStop={stopRecognition}
      />
  
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleGenerateSummary}
          disabled={loadingSummary}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-lg text-sm font-medium transition"
        >
          {loadingSummary ? "Generating..." : "Generate Summary"}
        </button>
  
        <button
          onClick={handleExport}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg text-sm font-medium transition"
        >
          Export PDF
        </button>
  
        {darNote && (
          <>
            <button
              onClick={() => setShowFHIR(!showFHIR)}
              className="bg-gray-700 hover:bg-black text-white px-5 py-3 rounded-lg text-sm font-medium transition"
            >
              {showFHIR ? "Hide FHIR JSON" : "Preview FHIR JSON"}
            </button>
            <button
              onClick={handleDownloadFHIR}
              className="bg-blue-800 hover:bg-blue-900 text-white px-5 py-3 rounded-lg text-sm font-medium transition"
            >
              Download FHIR JSON
            </button>
          </>
        )}
      </div>
  
      <SummaryViewer darNote={darNote} generatedAt={generatedAt} />
  
      {showFHIR && fhirDocument && (
        <div className="bg-white border rounded-lg p-4 text-xs text-gray-800 overflow-x-auto max-h-96 shadow-sm">
          <h3 className="font-semibold text-sm text-blue-700 mb-2">FHIR DocumentReference</h3>
          <pre>{JSON.stringify(fhirDocument, null, 2)}</pre>
  
          {fhirDocument.content?.[1]?.attachment?.url && (
            <div className="mt-4 text-sm">
              <h4 className="font-semibold mb-1">Decoded Note Preview</h4>
              <iframe
                title="Decoded DAR Preview"
                src={fhirDocument.content[1].attachment.url}
                className="w-full h-60 border rounded"
              ></iframe>
            </div>
          )}
        </div>
      )}
  
      <div>
        <h3 className="text-lg font-semibold text-green-700 mb-2">Nurse Notes</h3>
        <textarea
          value={sessionNotes}
          onChange={handleNotesChange}
          placeholder="Enter notes..."
          className="w-full p-3 border rounded-lg text-sm bg-white min-h-[100px] shadow-sm"
        />
      </div>
    </div>
  );  
}