export default function VoiceToggle({
    recognizing,
    speaker,
    onToggleSpeaker,
    onStart,
    onStop,
  }) {
    return (
      <div className="flex gap-2 flex-wrap mt-2">
        <button
          onClick={onToggleSpeaker}
          className="bg-gray-200 text-sm px-3 py-1 rounded"
        >
          🎙️ Speaker: {speaker === "nurse" ? "Nurse" : "Patient"}
        </button>
        <button
          onClick={onStart}
          disabled={recognizing}
          className={`px-4 py-2 rounded text-white ${
            recognizing ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Start Voice
        </button>
        <button
          onClick={onStop}
          disabled={!recognizing}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Stop
        </button>
      </div>
    );
  }
  