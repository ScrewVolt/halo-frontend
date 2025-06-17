import React from 'react';

// A generic viewer for AI-generated nursing notes in various formats (DAR, SOAP, BIRP)
export default function SummaryViewer({ note, format, generatedAt }) {
  if (!note) return null;

  // Define section headers and styles per format
  const formatConfig = {
    DAR: [
      { key: 'Data', title: 'Data (D)', bg: 'bg-gray-100', color: 'text-blue-700' },
      { key: 'Action', title: 'Action (A)', bg: 'bg-green-100', color: 'text-green-700' },
      { key: 'Response', title: 'Response (R)', bg: 'bg-yellow-100', color: 'text-yellow-700' }
    ],
    SOAP: [
      { key: 'Subjective', title: 'Subjective (S)', bg: 'bg-gray-100', color: 'text-blue-700' },
      { key: 'Objective', title: 'Objective (O)', bg: 'bg-green-100', color: 'text-green-700' },
      { key: 'Assessment', title: 'Assessment (A)', bg: 'bg-yellow-100', color: 'text-yellow-700' },
      { key: 'Plan', title: 'Plan (P)', bg: 'bg-pink-100', color: 'text-pink-700' }
    ],
    BIRP: [
      { key: 'Behavior', title: 'Behavior (B)', bg: 'bg-gray-100', color: 'text-blue-700' },
      { key: 'Intervention', title: 'Intervention (I)', bg: 'bg-green-100', color: 'text-green-700' },
      { key: 'Response', title: 'Response (R)', bg: 'bg-yellow-100', color: 'text-yellow-700' },
      { key: 'Plan', title: 'Plan (P)', bg: 'bg-pink-100', color: 'text-pink-700' }
    ]
  };

  const sections = formatConfig[format] || [];
  const lines = note.split('\n');

  // Helper to parse sections by header lines
  const extractSection = (key) => {
    // Pattern to match **Key:** or Key:
    const headerPattern = new RegExp(`^\\*\\*${key}\\*\\*[:]?\\s*$|^${key}[:]?\\s*$`, 'i');
    let startIndex = lines.findIndex(line => headerPattern.test(line));
    if (startIndex === -1) return '';
    // Collect lines until next header
    const contentLines = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      const isNextHeader = sections.some(s => {
        const pat = new RegExp(`^\\*\\*${s.key}\\*\\*[:]?\\s*$|^${s.key}[:]?\\s*$`, 'i');
        return pat.test(lines[i]);
      });
      if (isNextHeader) break;
      contentLines.push(lines[i]);
    }
    return contentLines.join('\n').trim();
  };

  // Build parsed sections
  const parsedSections = sections
    .map(({ key, title, bg, color }) => {
      const content = extractSection(key);
      return content ? { title, content, bg, color } : null;
    })
    .filter(Boolean);

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

      {parsedSections.length > 0 ? (
        parsedSections.map(({ title, content, bg, color }) => (
          <div key={title} className={`${bg} rounded-xl p-4 border shadow-sm`}>
            <h4 className={`text-lg font-semibold ${color} mb-2`}>{title}</h4>
            <div className="text-gray-700 text-sm whitespace-pre-wrap">
              {content.split('\n').map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <pre className="text-gray-700 text-sm whitespace-pre-wrap">{note}</pre>
        </div>
      )}
    </div>
  );
}
