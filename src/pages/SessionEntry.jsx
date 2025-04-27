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
import toast from "react-hot-toast";

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
    const full = `[${timestamp.toLocaleTimeString()}] ${speaker === "nurse" ? "Nurse" : "Patient"
      }: ${text}`;
    try {
      await addDoc(
        collection(db, "users", user.uid, "patients", patientId, "sessions", sessionId, "messages"),
        {
          text: full,
          createdAt: timestamp,
        }
      );
    } catch (err) {
      console.error("Failed to save message:", err);
      toast.error("❌ Failed to send message. Please try again.");
    }

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
      console.error("Speech recognition error:", e);
      toast.error("🎤 Microphone error detected. Check mic permissions.");
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
      const res = await fetch("https://halo-back.onrender.com/summary", {
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
      toast.error("❌ Failed to generate summary. Please try again.");
    }
    finally {
      setLoadingSummary(false);
    }
  };

  const handleExport = async () => {
    if (!darNote.trim()) {
      toast.error("No DAR note available to export!");
      return;
    }

    if (!navigator.onLine) {
      toast.error("Cannot export while offline.");
      return;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "letter", // Standard hospital format (8.5x11 inches)
    });

    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const maxTextWidth = pageWidth - margin * 2;
    let y = margin;

    // Title
    pdf.setFontSize(22);
    pdf.setTextColor(30, 58, 138); // HALO Blue
    pdf.text("HALO - Session Report", margin, y);
    y += 40;

    // Patient Info
    pdf.setFontSize(13);
    pdf.setTextColor(0, 0, 0);
    if (patient?.name) pdf.text(`Patient: ${patient.name}`, margin, y);
    if (patient?.room) pdf.text(`Room #: ${patient.room}`, margin + 250, y);
    y += 20;
    if (startedAt) {
      pdf.text(`Session Started: ${new Date(startedAt.toDate?.() || startedAt).toLocaleString()}`, margin, y);
      y += 20;
    }

    // Divider
    pdf.setDrawColor(180);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 20;

    // AI-Generated DAR Note
    pdf.setFontSize(16);
    pdf.setTextColor(80, 80, 80);
    pdf.text("AI-Generated DAR Note", margin, y);
    y += 25;

    // Draw DAR boxes
    const parseSection = (sectionTitle, text) => {
      if (!text) return;

      pdf.setFillColor(240, 245, 255); // Light blue background
      const boxHeight = 24;
      pdf.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 5, 5, "F");
      pdf.setFontSize(13);
      pdf.setTextColor(30, 58, 138);
      pdf.text(sectionTitle, margin + 10, y + 17);
      y += boxHeight + 10;

      pdf.setFontSize(12);
      pdf.setTextColor(60, 60, 60);

      const lines = pdf.splitTextToSize(text, maxTextWidth);
      lines.forEach((line) => {
        if (y > 750) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += 16;
      });

      y += 10;
    };

    // Parsing from your markdown-style note
    const dataMatch = darNote.match(/\*\*D \(Data\):\*\*(.*?)(?=\*\*A|\*\*R|$)/s);
    const actionMatch = darNote.match(/\*\*A \(Action\):\*\*(.*?)(?=\*\*R|$)/s);
    const responseMatch = darNote.match(/\*\*R \(Response\):\*\*(.*)/s);

    parseSection("D (Data)", dataMatch ? dataMatch[1].trim() : "");
    parseSection("A (Action)", actionMatch ? actionMatch[1].trim() : "");
    parseSection("R (Response)", responseMatch ? responseMatch[1].trim() : "");

    // Optional: Nurse Notes
    if (sessionNotes.trim()) {
      if (y > 700) {
        pdf.addPage();
        y = margin;
      }

      pdf.setFillColor(220, 250, 220); // Light green background
      const boxHeight = 24;
      pdf.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 5, 5, "F");
      pdf.setFontSize(13);
      pdf.setTextColor(34, 139, 34); // Green text
      pdf.text("Nurse Notes", margin + 10, y + 17);
      y += boxHeight + 10;

      pdf.setFontSize(12);
      pdf.setTextColor(60, 60, 60);

      const notesLines = pdf.splitTextToSize(sessionNotes, maxTextWidth);
      notesLines.forEach((line) => {
        if (y > 750) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += 16;
      });
    }

    pdf.save(`${patient?.name || "Patient"}_Session_Report.pdf`);
    toast.success("✅ PDF exported successfully!");
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
    link.download = `${patient?.name?.replace(/\s+/g, '_') || "HALO_Patient"}_FHIR_Document.json`;
    link.click();
  };

  const handleSendFHIR = async () => {
    if (!fhirDocument) {
      toast.error("No FHIR document available to send!");
      return;
    }

    const sendToast = toast.loading("Sending to Sandbox...");

    try {
      const res = await fetch("https://hapi.fhir.org/baseR4/DocumentReference", {
        method: "POST",
        headers: { "Content-Type": "application/fhir+json" },
        body: JSON.stringify(fhirDocument),
      });

      if (!res.ok) {
        throw new Error("Failed to send to sandbox");
      }

      toast.success("✅ Successfully sent to Sandbox!", { id: sendToast });
    } catch (err) {
      console.error("❌ Failed to send to sandbox:", err);
      toast.error("❌ Could not send to Sandbox. Please try again.", { id: sendToast });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto px-4 sm:px-6">
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
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
        >
          {loadingSummary ? "Generating..." : "Generate Summary"}
        </button>

        <button
          onClick={handleExport}
          disabled={!darNote && !sessionNotes}
          className={`px-4 py-2 rounded text-white ${darNote || sessionNotes
            ? "bg-indigo-600 hover:bg-indigo-700"
            : "bg-gray-400 cursor-not-allowed"
            }`}
        >
          Export PDF
        </button>


        {darNote && (
          <>
            <button
              onClick={() => setShowFHIR(!showFHIR)}
              className="bg-gray-700 hover:bg-black text-white px-4 py-2 rounded"
            >
              {showFHIR ? "Hide FHIR JSON" : "Preview FHIR JSON"}
            </button>
            <button
              onClick={handleDownloadFHIR}
              className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded"
            >
              Download FHIR JSON
            </button>
            <button
              onClick={handleSendFHIR}
              disabled={!fhirDocument}
              className={`px-4 py-2 rounded text-white ${fhirDocument
                  ? "bg-blue-700 hover:bg-blue-800"
                  : "bg-gray-400 cursor-not-allowed"
                }`}
            >
              Send to Sandbox
            </button>
          </>
        )}
      </div>


      <SummaryViewer darNote={darNote} generatedAt={generatedAt} />

      {showFHIR && fhirDocument && (
        <div className="bg-white border rounded-lg p-6 text-sm text-gray-700 overflow-x-auto shadow-sm mt-6">
          <h3 className="text-lg font-bold text-blue-700 mb-4">FHIR DocumentReference Preview</h3>

          <div className="bg-gray-100 p-4 rounded overflow-x-auto text-xs font-mono whitespace-pre-wrap leading-relaxed">
            <pre>{JSON.stringify(fhirDocument, null, 2)}</pre>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={handleDownloadFHIR}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Download FHIR JSON
            </button>
            <button
              onClick={handleSendFHIR}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded shadow transition"
            >
              Send to Sandbox
            </button>

          </div>
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