export default function SummaryViewer({ darNote, generatedAt }) {
  if (!darNote) return null;

  // Helper function to extract sections
  const extractSection = (text, sectionName) => {
    const regex = new RegExp(`\\*\\*${sectionName}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, "i");
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  };

  const dataSection = extractSection(darNote, "D \\(Data\\)");
  const actionSection = extractSection(darNote, "A \\(Action\\)");
  const responseSection = extractSection(darNote, "R \\(Response\\)");

  return (
    <div className="mt-6 bg-gray-50 border rounded-lg p-6 shadow-md space-y-6">
      <h3 className="text-xl font-bold text-blue-800 mb-2">🧠 AI-Generated DAR Note</h3>
      {generatedAt && (
        <p className="text-sm text-gray-500 mb-4 italic">
          Generated on: {new Date(generatedAt).toLocaleString()}
        </p>
      )}

      {/* Data Section */}
      {dataSection && (
        <div className="bg-gray-100 rounded-xl p-4 border shadow-sm">
          <h4 className="text-lg font-semibold text-blue-700 mb-2">Data (D)</h4>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{dataSection}</p>
        </div>
      )}

      {/* Action Section */}
      {actionSection && (
        <div className="bg-green-100 rounded-xl p-4 border shadow-sm">
          <h4 className="text-lg font-semibold text-green-700 mb-2">Action (A)</h4>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{actionSection}</p>
        </div>
      )}

      {/* Response Section */}
      {responseSection && (
        <div className="bg-yellow-100 rounded-xl p-4 border shadow-sm">
          <h4 className="text-lg font-semibold text-yellow-700 mb-2">Response (R)</h4>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{responseSection}</p>
        </div>
      )}
    </div>
  );
}
