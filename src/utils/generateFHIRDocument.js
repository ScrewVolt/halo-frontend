import { encode } from "js-base64";

export default function generateFHIRDocument({ note, patient, generatedAt }) {
  if (!note) return null;

  const base64Dar = encode(note);

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
      // use the real patient id if you have one
      reference: patient?.id ? `Patient/${patient.id}` : "Patient/example",
      display: patient?.name || "Patient"
    },
    date: generatedAt || new Date().toISOString(),
    description: "AI-generated nursing summary",
    content: [
      {
        attachment: {
          contentType: "text/markdown",
          data: base64Dar
        }
      }
    ]
  };
}
