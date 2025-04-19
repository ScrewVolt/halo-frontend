export default function generateFHIRDocument({ darNote, patient, generatedAt }) {
    if (!darNote || !patient || !generatedAt) return null;
  
    const encodedNote = btoa(unescape(encodeURIComponent(darNote))); // base64 encode markdown note
  
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
      identifier: [
        {
          system: "http://halo.healthcare/docs",
          value: `halo-note-${patient.id}-${generatedAt}`
        }
      ],
      author: [
        {
          reference: "Practitioner/example",
          display: "HALO AI System"
        }
      ],
      custodian: {
        reference: "Organization/halo",
        display: "HALO Clinical AI"
      },
      subject: {
        reference: `Patient/${patient.id}`,
        display: patient.name || "Patient"
      },
      date: new Date(generatedAt).toISOString(),
      description: "AI-generated nursing DAR summary",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/document-classcodes",
              code: "clinical-note",
              display: "Clinical Note"
            }
          ]
        }
      ],
      content: [
        {
          attachment: {
            contentType: "text/markdown",
            data: encodedNote,
            title: "DAR Nursing Note"
          }
        },
        {
          attachment: {
            contentType: "text/plain",
            title: "DAR Note (Decoded)",
            url: `data:text/plain;charset=utf-8,${encodeURIComponent(darNote)}`
          }
        }
      ]
    };
  }
  