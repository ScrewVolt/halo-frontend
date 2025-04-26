export default function highlightKeywords(text) {
    if (!text) return "";
    const keywords = {
      // Symptoms
      pain: "text-red-600 font-semibold",
      bleeding: "text-red-600 font-semibold",
      fever: "text-red-600 font-semibold",
      cough: "text-red-600 font-semibold",
      nausea: "text-red-600 font-semibold",
      dizziness: "text-red-600 font-semibold",
      swelling: "text-red-600 font-semibold",
      vomiting: "text-red-600 font-semibold",
      rash: "text-red-600 font-semibold",
      headache: "text-red-600 font-semibold",
      chills: "text-red-600 font-semibold",
      fatigue: "text-red-600 font-semibold",
      infection: "text-red-600 font-semibold",
      fracture: "text-red-600 font-semibold",
      wound: "text-red-600 font-semibold",
      laceration: "text-red-600 font-semibold",
      trauma: "text-red-600 font-semibold",
      burn: "text-red-600 font-semibold",
  
      // Procedures
      xray: "text-blue-700 font-semibold",
      "x-ray": "text-blue-700 font-semibold",
      ultrasound: "text-blue-700 font-semibold",
      suture: "text-blue-700 font-semibold",
      injection: "text-blue-700 font-semibold",
      surgery: "text-blue-700 font-semibold",
      catheter: "text-blue-700 font-semibold",
      biopsy: "text-blue-700 font-semibold",
      intubation: "text-blue-700 font-semibold",
      debridement: "text-blue-700 font-semibold",
      dressing: "text-blue-700 font-semibold",
      bandage: "text-blue-700 font-semibold",
      splint: "text-blue-700 font-semibold",
      cast: "text-blue-700 font-semibold",
      "blood transfusion": "text-blue-700 font-semibold",
      dialysis: "text-blue-700 font-semibold",
  
      // Medications
      acetaminophen: "text-indigo-600 font-semibold",
      ibuprofen: "text-indigo-600 font-semibold",
      insulin: "text-indigo-600 font-semibold",
      albuterol: "text-indigo-600 font-semibold",
      morphine: "text-indigo-600 font-semibold",
      metformin: "text-indigo-600 font-semibold",
      warfarin: "text-indigo-600 font-semibold",
      prednisone: "text-indigo-600 font-semibold",
      heparin: "text-indigo-600 font-semibold",
      lorazepam: "text-indigo-600 font-semibold",
      amoxicillin: "text-indigo-600 font-semibold",
      lisinopril: "text-indigo-600 font-semibold",
      atorvastatin: "text-indigo-600 font-semibold",
      oxycodone: "text-indigo-600 font-semibold",
      hydrocodone: "text-indigo-600 font-semibold",
  
      // Tests
      ekg: "text-purple-600 font-semibold",
      "ecg": "text-purple-600 font-semibold",
      cbc: "text-purple-600 font-semibold",
      ct: "text-purple-600 font-semibold",
      mri: "text-purple-600 font-semibold",
      urinalysis: "text-purple-600 font-semibold",
      "blood test": "text-purple-600 font-semibold",
      "stress test": "text-purple-600 font-semibold",
      colonoscopy: "text-purple-600 font-semibold",
      mammogram: "text-purple-600 font-semibold",
      endoscopy: "text-purple-600 font-semibold",
      "bmi": "text-purple-600 font-semibold",
  
      // Vitals
      "blood pressure": "text-teal-600 font-semibold",
      oxygen: "text-teal-600 font-semibold",
      "heart rate": "text-teal-600 font-semibold",
      respiration: "text-teal-600 font-semibold",
      temperature: "text-teal-600 font-semibold",
      "oxygen saturation": "text-teal-600 font-semibold",
      pulse: "text-teal-600 font-semibold",
  
      // History
      hypertension: "text-green-700 font-semibold",
      diabetes: "text-green-700 font-semibold",
      asthma: "text-green-700 font-semibold",
      cancer: "text-green-700 font-semibold",
      allergies: "text-green-700 font-semibold",
      copd: "text-green-700 font-semibold",
      dementia: "text-green-700 font-semibold",
      arthritis: "text-green-700 font-semibold",
      stroke: "text-green-700 font-semibold",
      epilepsy: "text-green-700 font-semibold",
      depression: "text-green-700 font-semibold",
  
      // Response / Condition
      improved: "text-yellow-600 font-semibold",
      worsened: "text-yellow-600 font-semibold",
      tolerated: "text-yellow-600 font-semibold",
      stable: "text-yellow-600 font-semibold",
      critical: "text-yellow-600 font-semibold",
      alert: "text-yellow-600 font-semibold",
      drowsy: "text-yellow-600 font-semibold",
      unresponsive: "text-yellow-600 font-semibold",
      "no complaints": "text-yellow-600 font-semibold",
      "chest pain": "text-yellow-600 font-semibold",
      "shortness of breath": "text-yellow-600 font-semibold",
    };

    const regex = new RegExp(`\\b(${Object.keys(keywords).join("|")})\\b`, "gi");
    return text.replace(regex, (match) => {
      const cls = keywords[match.toLowerCase()] || "bg-yellow-200";
      return `<span class="${cls}">${match}</span>`;
    });
  }
  