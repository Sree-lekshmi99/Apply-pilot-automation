import { Copy, Check } from "lucide-react";

export function SectionHeader({ title }) {
  return (
    <div className="flex items-baseline gap-4 mb-4 border-b border-stone-400 pb-2">
      <h2 className="text-2xl" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>
        {title}
      </h2>
    </div>
  );
}

export function Field({ label, value, onChange, placeholder, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs uppercase tracking-[0.2em] text-stone-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-stone-900 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
      />
    </label>
  );
}

export function GenBox({ title, subtitle, onGenerate, generating, content, onCopy, copied }) {
  return (
    <div className="border border-stone-900 bg-stone-50 p-4 flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-sm uppercase tracking-wider">{title}</div>
          <div className="text-[10px] text-stone-500 italic">{subtitle}</div>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="text-xs uppercase tracking-widest border border-stone-900 px-2 py-1 hover:bg-stone-900 hover:text-stone-100 disabled:opacity-50"
        >
          {generating ? "…" : content ? "Regen" : "Write"}
        </button>
      </div>
      <div className="flex-1 min-h-[120px] text-sm whitespace-pre-wrap text-stone-800 leading-relaxed italic">
        {content || <span className="text-stone-400 not-italic">— not yet written —</span>}
      </div>
      {content && (
        <button
          onClick={onCopy}
          className="mt-3 self-end flex items-center gap-1 text-xs text-stone-600 hover:text-red-800"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}

const SECTION_COLORS = [
  "border-l-red-800",
  "border-l-amber-600",
  "border-l-blue-700",
  "border-l-stone-700",
  "border-l-green-700",
  "border-l-violet-700",
  "border-l-stone-900",
];

export function ResumeCheckOutput({ text, onCopy, copied }) {
  const sections = text.split(/(?=\n?\d+\.\s+[A-Z][A-Z\s]+)/).filter(Boolean);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-stone-500">Analysis</div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-red-800 border border-stone-300 px-2 py-1"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>
      {sections.map((section, i) => {
        const lines = section.trim().split("\n");
        const header = lines[0].trim();
        const body = lines.slice(1).join("\n").trim();
        return (
          <div
            key={i}
            className={`border border-stone-300 border-l-4 ${SECTION_COLORS[i % SECTION_COLORS.length]} bg-white`}
          >
            <div className="px-4 py-2 border-b border-stone-200 bg-stone-50">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800">{header}</span>
            </div>
            <pre
              className="px-4 py-3 text-sm text-stone-800 whitespace-pre-wrap leading-relaxed"
              style={{ fontFamily: "inherit" }}
            >
              {body}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
