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
import { useMemo } from "react";
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
  const [note, setNote] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [lastUsedAt, setLastUsedAt] = useState(null);
  const [showFHIR, setShowFHIR] = useState(false);
  const [noteFormat, setNoteFormat] = useState("DAR");
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
        setNote(typeof sessionData.note === "string" ? sessionData.note : "");
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

  const startRecognition = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported.");

    try {
      // Request mic access explicitly (helps prevent browser denial)
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let resultText = "";
      const restartDelay = 600;

      setRecognizing(true);
      shouldRestartRef.current = true;

      recognition.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const transcript = e.results[i][0].transcript.trim();
          if (e.results[i].isFinal) {
            resultText += " " + transcript;
          } else {
            interim = transcript;
          }
        }
        setLiveTranscript(interim);
      };

      recognition.onend = () => {
        if (resultText.trim()) {
          sendMessage(resultText.trim());
        }
        setLiveTranscript("");
        resultText = "";

        if (shouldRestartRef.current) {
          setTimeout(() => {
            if (shouldRestartRef.current) startRecognition();
          }, restartDelay);
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e);

        if (["not-allowed", "service-not-allowed"].includes(e.error)) {
          toast.error("🎤 Mic access denied. Please check browser settings.");
        } else if (e.error === "no-speech") {
          toast.warning("🎙 No speech detected. Try again.");
        } else if (e.error === "audio-capture") {
          toast.error("🎤 No microphone detected. Is your mic connected?");
        } else {
          toast.error("🎤 Unknown microphone error.");
        }

        setRecognizing(false);

        // Optional: attempt auto-recovery from transient errors
        if (shouldRestartRef.current && e.error !== "not-allowed") {
          setTimeout(() => startRecognition(), restartDelay);
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("🎤 Failed to access microphone. Please check device settings.");
    }
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

    const chatText = messages.map(m => m.text).join("\n");

    try {
      const res = await fetch("https://halo-back.onrender.com/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatText, format: noteFormat }),
      });

      if (!res.ok) {
        // Attempt to parse an error message from the body
        const errorData = await res.json().catch(() => ({}));
        console.error("Summary API error:", errorData);
        throw new Error(errorData.error || "Failed to fetch summary");
      }

      const data = await res.json();
      if (!data.note) throw new Error("No note returned from backend");

      const now = new Date().toISOString();
      setNote(data.note.trim());
      setGeneratedAt(now);

      // Persist to Firestore
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
        note: data.note.trim(),
        generatedAt: now,
        lastUsedAt: now,
      });

      // **Show a success toast**
      toast.success("✅ Summary generated successfully!");
    } catch (err) {
      console.error("Error generating summary:", err);
      toast.error(`❌ ${err.message || "Failed to generate summary."}`);
    } finally {
      setLoadingSummary(false);
    }
  };


  async function handleExport() {
    // 1) Guards
    const safeNote = typeof note === "string" ? note : String(note);
    if (!safeNote.trim()) {
      toast.error("No note available to export!");
      return;
    }
    if (!navigator.onLine) {
      toast.error("Cannot export while offline.");
      return;
    }
  
    // 2) PDF boilerplate
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const margin = 40;
    const pageW  = pdf.internal.pageSize.getWidth();
    const pageH  = pdf.internal.pageSize.getHeight();
    const maxW   = pageW - margin * 2;
    let y = margin;
  
    // 3) Header
    pdf
      .setFontSize(22)
      .setTextColor(30, 58, 138)
      .text("HALO - Session Report", margin, y);
    y += 36;
  
    pdf.setFontSize(12).setTextColor(0,0,0);
    if (patient?.name) pdf.text(`Patient: ${patient.name}`, margin, y);
    if (patient?.room) pdf.text(`Room #: ${patient.room}`, margin + 250, y);
    y += 18;
  
    if (startedAt) {
      pdf.text(
        `Session Started: ${new Date(startedAt.toDate?.() || startedAt).toLocaleString()}`,
        margin, y
      );
      y += 18;
    }
  
    pdf.setDrawColor(200).line(margin, y, pageW - margin, y);
    y += 24;
  
    // 4) Section definitions
    let sections = [];
    if (noteFormat === "DAR") {
      sections = [
        { splitOn:"**Data:**",    label:"Data (D)",    bg:[240,245,255], border:[30,58,138] },
        { splitOn:"**Action:**",  label:"Action (A)",  bg:[235,250,235], border:[34,139,34]  },
        { splitOn:"**Response:**",label:"Response (R)",bg:[255,250,240], border:[218,165,32] }
      ];
    }else if (noteFormat === "SOAP") {
      sections = [
        { splitOn: "**Subjective:**",  label: "Subjective (S)", bg: [240,245,255], border: [30,58,138] },
        { splitOn: "**Objective:**",   label: "Objective (O)",  bg: [235,250,235], border: [34,139,34]  },
        { splitOn: "**Assessment:**",  label: "Assessment (A)", bg: [255,250,240], border: [218,165,32] },
        { splitOn: "**Plan:**",        label: "Plan (P)",       bg: [255,228,225], border: [219,112,147] }
      ];
    } else if (noteFormat === "BIRP") {
      sections = [
        { splitOn: "**Behavior:**",     label: "Behavior (B)",    bg: [240,245,255], border: [30,58,138] },
        { splitOn: "**Intervention:**", label: "Intervention (I)",bg: [235,250,235], border: [34,139,34]  },
        { splitOn: "**Response:**",     label: "Response (R)",    bg: [255,250,240], border: [218,165,32] },
        { splitOn: "**Plan:**",         label: "Plan (P)",        bg: [255,228,225], border: [219,112,147] }
      ];
    }
  
    // 5) Draw each section
  let drew = false;
  const headingPattern = sections.map(s => escapeRegExp(s.splitOn)).join("|");
  sections.forEach(({ splitOn, label, bg, border }) => {
    const re = new RegExp(
      `${escapeRegExp(splitOn)}([\\s\\S]*?)(?=(?:${headingPattern})|$)`,
      "i"
    );
    const m = safeNote.match(re);
    if (!m || !m[1].trim()) return;

    drew = true;
    const content = m[1].trim();

    // paginate if needed
    if (y > pageH - margin - 100) {
      pdf.addPage();
      y = margin;
    }

    // 6) Boxed header — taller now
    const headerH = 24;
    pdf
      .setFillColor(...bg)
      .setDrawColor(...border)
      .roundedRect(margin, y, pageW - margin*2, headerH, 6, 6, "FD")
      .setFontSize(14)
      .setTextColor(...border)
      .text(label, margin + 8, y + headerH - 8);

    // push body *well* below the box
    y += headerH + 12;

    // 7) Section body
    pdf.setFontSize(12).setTextColor(60,60,60);
    pdf.splitTextToSize(content, maxW).forEach(line => {
      if (y > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += 16;
    });
    y += 12;
  });

  // 8) Fallback if nothing drawn
  if (!drew) {
    pdf.setFontSize(12).setTextColor(60,60,60);
    safeNote.split("\n").forEach(line => {
      if (y > pageH - margin) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += 16;
    });
  }

  // 9) Nurse notes
  if (sessionNotes.trim()) {
    if (y > pageH - margin - 60) { pdf.addPage(); y = margin; }
    const nh = 24;
    pdf
      .setFillColor(220,250,220)
      .setDrawColor(34,139,34)
      .roundedRect(margin, y, pageW - margin*2, nh, 5,5,"FD")
      .setFontSize(14)
      .setTextColor(34,139,34)
      .text("Nurse Notes", margin+8, y + nh - 8);

    y += nh + 12;
    pdf.setFontSize(12).setTextColor(60,60,60);
    pdf.splitTextToSize(sessionNotes, maxW).forEach(line => {
      if (y > pageH - margin) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += 16;
    });
  }

  // 10) Save
  pdf.save(`${patient?.name || "Patient"}_Session_Report.pdf`);
  toast.success("✅ PDF exported successfully!");
}

// escape helper
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
  
  
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


  const fhirDocument = useMemo(() => {
    if (!patient || typeof note !== "string" || !note.trim()) {
      return null;
    }
    return generateFHIRDocument({ note, patient, generatedAt });
  }, [note, patient, generatedAt]);

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
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4">
      {/* Header */}
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
  
      {/* Chat messages */}
      <div className="border rounded p-4 bg-gray-50 min-h-[300px] max-h-[500px] overflow-y-auto">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            patientId={patientId}
            sessionId={sessionId}
          />
        ))}
        {recognizing && (
          <p className="text-xs text-blue-500 italic animate-pulse mt-2">
            🎤 Listening for {speaker}...
          </p>
        )}
      </div>
  
      {/* Live transcript */}
      {liveTranscript && (
        <div className="bg-white border rounded-lg p-3 text-sm shadow-sm">
          <span className="font-semibold text-gray-600">Transcript:</span>{" "}
          {liveTranscript}
        </div>
      )}
  
      {/* Message input */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 border p-2 rounded text-sm"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(chatInput)}
          placeholder="Type message..."
        />
        <button
          onClick={() => sendMessage(chatInput)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
  
      {/* Voice toggle */}
      <div className="flex flex-col sm:flex-row gap-2">
        <VoiceToggle
          recognizing={recognizing}
          speaker={speaker}
          onToggleSpeaker={() =>
            setSpeaker((prev) => (prev === "nurse" ? "patient" : "nurse"))
          }
          onStart={startRecognition}
          onStop={stopRecognition}
        />
      </div>
  
      {/* Note format selector */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <label className="text-sm font-medium text-gray-700">Note Format</label>
        <select
          value={noteFormat}
          onChange={(e) => {
            setNoteFormat(e.target.value);
            setNote("");
            setGeneratedAt(null);
          }}
          className="border text-sm rounded px-3 py-2"
        >
          <option value="DAR">DAR</option>
          <option value="SOAP">SOAP</option>
          <option value="BIRP">BIRP</option>
        </select>
      </div>
  
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        <button
          onClick={handleGenerateSummary}
          disabled={loadingSummary}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
        >
          {loadingSummary ? "Generating..." : "Generate Summary"}
        </button>
        <button
          onClick={handleExport}
          disabled={!note && !sessionNotes}
          className={`px-4 py-2 rounded text-white ${
            note || sessionNotes
              ? "bg-indigo-600 hover:bg-indigo-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Export PDF
        </button>
  
        {note && (
          <>
            <button
              onClick={() => setShowFHIR((prev) => !prev)}
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
              className={`px-4 py-2 rounded text-white ${
                fhirDocument
                  ? "bg-blue-700 hover:bg-blue-800"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Send to Sandbox
            </button>
          </>
        )}
      </div>
  
      {/* Summary viewer */}
      {note && (
        <SummaryViewer
          note={note}
          format={noteFormat}
          generatedAt={generatedAt}
        />
      )}
  
      {/* FHIR JSON preview */}
      {showFHIR && (
        <div className="bg-white border rounded-lg p-6 text-sm text-gray-700 overflow-x-auto shadow-sm mt-6">
          <h3 className="text-lg font-bold text-blue-700 mb-4">
            FHIR DocumentReference Preview
          </h3>
          <div className="bg-gray-100 p-4 rounded overflow-x-auto text-xs font-mono whitespace-pre-wrap leading-relaxed">
            {fhirDocument ? (
              <pre>{JSON.stringify(fhirDocument, null, 2)}</pre>
            ) : (
              <p className="text-center text-gray-500">
                No FHIR document to show.
              </p>
            )}
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
  
      {/* Nurse notes */}
      <div>
        <h3 className="text-lg font-semibold text-green-700 mb-2">
          Nurse Notes
        </h3>
        <textarea
          className="w-full border rounded p-2 text-sm bg-white min-h-[100px]"
          value={sessionNotes}
          onChange={handleNotesChange}
          placeholder="Enter session notes..."
        />
      </div>
    </div>
  );  
}