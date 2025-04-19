export default function highlightKeywords(text) {
    if (!text) return "";
    const keywords = {
      pain: "text-red-600 font-semibold",
      medication: "text-indigo-600 font-semibold",
      blood: "text-blue-700 font-semibold",
      pressure: "text-blue-700 font-semibold",
      vomiting: "text-orange-600 font-semibold",
      fractured: "text-red-700 font-semibold",
      bleeding: "text-red-700 font-semibold",
      "x-ray": "text-indigo-700 font-semibold",
    };
    const regex = new RegExp(`\\b(${Object.keys(keywords).join("|")})\\b`, "gi");
    return text.replace(regex, (match) => {
      const cls = keywords[match.toLowerCase()] || "bg-yellow-200";
      return `<span class="${cls}">${match}</span>`;
    });
  }
  