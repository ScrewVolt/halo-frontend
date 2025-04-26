// src/utils/generateFHIRdocument.js

function base64EncodeUnicode(str) {
  // 🔥 Safer base64 encoding for Unicode (FHIR wants safe encoding)
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode('0x' + p1)
  ));
}

export default function generateFHIRDocument({ darNote, patient, generatedAt }) {
  if (!darNote || !patient) return null;

  const now = generatedAt || new Date().toISOString();

  return {
    resourceType: "DocumentReference",
    status: "current",
    type: {
      coding: [
        {
          system: "http://loinc.org",
          code: "34108-1",
          display: "Outpatient Note"
        }
      ]
    },
    subject: {
      reference: `Patient/${patient.id || "example"}`,
      display: patient.name || "Patient"
    },
    date: now,
    description: "AI-generated DAR nursing note.",
    content: [
      {
        attachment: {
          contentType: "text/plain",
          title: "Nursing DAR Note",
          language: "en",
          data: base64EncodeUnicode(darNote) // 🔥 Using full-safe encoding
        }
      }
    ]
  };
}
