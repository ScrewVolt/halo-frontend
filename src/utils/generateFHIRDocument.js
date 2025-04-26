// src/utils/generateFHIRdocument.js

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
          code: "34108-1", // Outpatient Note
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
          contentType: "text/markdown",
          data: btoa(darNote) // ✅ encode the DAR note properly into base64
        }
      }
    ]
  };
}
