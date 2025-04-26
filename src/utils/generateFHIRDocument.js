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
          title: "Nursing DAR Note",  // ✅ REQUIRED by HAPI now
          language: "en",             // ✅ Language must be defined
          data: btoa(darNote)          // ✅ Base64-encoded text
        }
      }
    ]
  };
}
