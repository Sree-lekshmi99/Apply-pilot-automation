import { X, Key } from "lucide-react";

export default function SettingsModal({
  apiKey, setApiKey,
  linkedInProfile, setLinkedInProfile,
  userSchool, setUserSchool,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 bg-stone-900/60 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-stone-100 border-2 border-stone-900 max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b border-stone-400 pb-2">
          <h3 className="text-xl" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>
            Settings
          </h3>
          <button onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block mb-4">
          <span className="text-xs uppercase tracking-[0.2em] text-stone-500 flex items-center gap-2">
            <Key className="w-3 h-3" /> OpenAI API Key
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
            className="mt-1 w-full border border-stone-900 bg-stone-50 px-3 py-2 text-sm focus:outline-none"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
          <span className="text-[10px] text-stone-500 italic">
            Stored in memory only. Cleared when you close the tab.
          </span>
        </label>

        <label className="block mb-4">
          <span className="text-xs uppercase tracking-[0.2em] text-stone-500">
            Your School / University{" "}
            <span className="normal-case italic text-stone-400">(optional)</span>
          </span>
          <input
            value={userSchool}
            onChange={(e) => setUserSchool(e.target.value)}
            placeholder="e.g. University of Michigan"
            className="mt-1 w-full border border-stone-900 bg-stone-50 px-3 py-2 text-sm focus:outline-none"
          />
          <span className="text-[10px] text-stone-500 italic">Used to find alumni at target companies.</span>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-stone-500">
            Your LinkedIn Profile / Background
          </span>
          <textarea
            value={linkedInProfile}
            onChange={(e) => setLinkedInProfile(e.target.value)}
            rows={6}
            placeholder="Paste your LinkedIn bio, headline, key experience. Used to personalize outreach messages."
            className="mt-1 w-full border border-stone-900 bg-stone-50 px-3 py-2 text-sm focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}
