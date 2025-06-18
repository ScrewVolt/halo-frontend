// src/utils/generateFHIRDocument.js
import { encode } from "js-base64";

export default function generateFHIRDocument({ note, patient, generatedAt }) {
  if (!note) return null;

  const b64 = encode(note);
  const now = generatedAt || new Date().toISOString();

  return {
    resourceType: "DocumentReference",
    status: "current",
    type: {
      coding: [{
        system: "http://loinc.org",
        code: "34108-1",
        display: "Outpatient Note"
      }]
    },
    subject: {
      // point at the HAPI example patient
      reference: "Patient/example",
      display: patient?.name || "Patient"
    },
    // when we generated it
    date: now,
    // REQUIRED: when server indexed it
    indexed: now,
    author: [{
      display: "HALO AI Assistant"
    }],
    description: "AI-generated nursing note",
    content: [{
      attachment: {
        contentType: "text/markdown",
        data: b64,
        title: `${patient?.name || "Patient"} Note`,
        creation: now
      }
    }]
  };
}
