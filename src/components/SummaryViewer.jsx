import { marked } from "marked";

export default function SummaryViewer({ darNote, generatedAt }) {
  if (!darNote) return null;

  return (
    <div className="mt-6 bg-gray-50 border rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">AI-Generated DAR Note</h3>
      {generatedAt && (
        <p className="text-sm text-gray-500 mb-3 italic">
          Generated on: {new Date(generatedAt).toLocaleString()}
        </p>
      )}
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: marked.parse(darNote) }}
      />
    </div>
  );
}
