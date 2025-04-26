export default function generateFHIRDocument({ darNote, generatedAt }) {
  if (!darNote) return null; // Patient optional temporarily

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
    // ❌ REMOVE subject field
    date: now,
    description: "AI-generated DAR nursing note.",
    content: [
      {
        attachment: {
          contentType: "text/plain",
          title: "Nursing DAR Note",
          language: "en",
          url: "https://halo-hospital.netlify.app/sample-dar-note.txt" // Replace with real file later if needed
        }
      }
    ]
  };
}
