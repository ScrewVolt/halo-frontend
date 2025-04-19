import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import highlightKeywords from "../utils/highlightKeywords";
import { db, auth } from "../firebase";

export default function ChatMessage({ msg, patientId, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.text);
  const user = auth.currentUser;

  const handleSave = async () => {
    if (!editValue.trim()) return;
    const ref = doc(db, "users", user.uid, "patients", patientId, "messages", msg.id);
    await updateDoc(ref, { text: editValue });
    setEditing(false);
    onUpdated?.(); // optional callback
  };

  return (
    <div className="mb-2 text-sm">
      {editing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="border p-1 rounded w-full text-sm"
          autoFocus
        />
      ) : (
        <div
          className="cursor-pointer"
          onClick={() => setEditing(true)}
          dangerouslySetInnerHTML={{ __html: highlightKeywords(msg.text) }}
        />
      )}
    </div>
  );
}
