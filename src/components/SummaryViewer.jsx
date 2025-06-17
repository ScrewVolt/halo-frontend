import React from 'react';

// A generic viewer for AI-generated nursing notes in various formats (DAR, SOAP, BIRP)
export default function SummaryViewer({ note, format, generatedAt }) {
  if (!note) return null;

  // Helper to extract section content by header
  const extractSection = (text, header) => {
    const regex = new RegExp(`\\*\\*${header}\\:\\*\\*\\s*([\\s\\S]*?)(?=(\\n\\*\\*|$))`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  // Define section headers per format
  const formatConfig = {
    DAR: [
      { key: 'D (Data)', title: 'Data (D)', bg: 'bg-gray-100', color: 'text-blue-700' },
      { key: 'A (Action)', title: 'Action (A)', bg: 'bg-green-100', color: 'text-green-700' },
      { key: 'R (Response)', title: 'Response (R)', bg: 'bg-yellow-100', color: 'text-yellow-700' }
    ],
    SOAP: [
      { key: 'S (Subjective)', title: 'Subjective (S)', bg: 'bg-gray-100', color: 'text-blue-700' },
      { key: 'O (Objective)', title: 'Objective (O)', bg: 'bg-green-100', color: 'text-green-700' },
      { key: 'A (Assessment)', title: 'Assessment (A)', bg: 'bg-yellow-100', color: 'text-yellow-700' },
      { key: 'P (Plan)', title: 'Plan (P)', bg: 'bg-pink-100', color: 'text-pink-700' }
    ],
    BIRP: [
      { key: 'B (Behavior)', title: 'Behavior (B)', bg: 'bg-gray-100', color: 'text-blue-700' },
      { key: 'I (Intervention)', title: 'Intervention (I)', bg: 'bg-green-100', color: 'text-green-700' },
      { key: 'R (Response)', title: 'Response (R)', bg: 'bg-yellow-100', color: 'text-yellow-700' },
      { key: 'P (Plan)', title: 'Plan (P)', bg: 'bg-pink-100', color: 'text-pink-700' }
    ]
  };

  const sections = formatConfig[format] || [];

  return (
    <div className="mt-6 bg-gray-50 border rounded-lg p-6 shadow-md space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-blue-800">🧠 AI-Generated {format} Note</h3>
        {generatedAt && (
          <span className="text-sm text-gray-500 italic">
            Generated on: {new Date(generatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {sections.map(({ key, title, bg, color }) => {
        const content = extractSection(note, key);
        return (
          content && (
            <div key={key} className={`${bg} rounded-xl p-4 border shadow-sm`}>
              <h4 className={`text-lg font-semibold ${color} mb-2`}>{title}</h4>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{content}</p>
            </div>
          )
        );
      })}
    </div>
  );
}
