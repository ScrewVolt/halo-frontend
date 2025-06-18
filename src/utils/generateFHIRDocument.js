// src/utils/generateFHIRDocument.js
import { encode } from "js-base64";

export default function generateFHIRDocument({ note, patient, generatedAt }) {
  if (!note) return null;

  const base64Markdown = encode(note);

  return {
    resourceType: "DocumentReference",
    status: "current",
    type: {
      coding: [
        {
          system: "http://loinc.org",
          code: "34108-1",
          display: "Outpatient Note",
        },
      ],
    },
    // point at your patient in the sandbox (you can npm import uuid if you want to generate your own ID)
    subject: {
      reference: patient?.id ? `Patient/${patient.id}` : undefined,
      display: patient?.name || "Patient",
    },
    date: generatedAt || new Date().toISOString(),
    description: "AI-generated nursing summary",
    content: [
      {
        attachment: {
          contentType: "text/markdown",
          data: base64Markdown,
          title: `${patient?.name || "Patient"} Note`,
          creation: generatedAt || new Date().toISOString(),
        },
      },
    ],
  };
}
