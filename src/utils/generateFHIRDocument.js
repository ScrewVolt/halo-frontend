import { encode } from "js-base64";

export default function generateFHIRDocument({ darNote, patient, generatedAt }) {
  if (!darNote) return null;

  const base64Dar = encode(darNote);

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
      reference: "Patient/example",
      display: patient?.name || "Patient"
    },
    date: generatedAt || new Date().toISOString(),
    description: "AI-generated nursing DAR summary",
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
