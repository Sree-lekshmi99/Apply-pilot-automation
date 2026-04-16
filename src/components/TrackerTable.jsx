import React, { useState, useRef } from "react";
import { Download, Upload, ChevronDown, ChevronUp, Link2, Copy, Check } from "lucide-react";
import { ROLES } from "../constants";
import { daysSince } from "../utils/analytics";
import { exportJSON, exportCSV, importJSON } from "../utils/storage";

export default function TrackerTable({ applications, setApplications, setError }) {
  const [expandedApps, setExpandedApps] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const importInputRef = useRef(null);

  const toggleExpand = (id) => setExpandedApps((prev) => ({ ...prev, [id]: !prev[id] }));

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const updateApplication = (id, field, value) =>
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));

  const updateContactInApp = (appId, contactId, field, value) =>
    setApplications((prev) =>
      prev.map((a) =>
        a.id !== appId
          ? a
          : { ...a, contacts: a.contacts.map((c) => (c.id !== contactId ? c : { ...c, [field]: value })) }
      )
    );

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importInputRef.current) importInputRef.current.value = "";
    try {
      const imported = await importJSON(file);
      if (
        applications.length > 0 &&
        !window.confirm(`Replace your ${applications.length} existing application(s) with the imported data?`)
      )
        return;
      setApplications(imported);
    } catch (err) {
      setError(`Import failed: ${err.message}`);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-4 border-b border-stone-400 pb-2">
        <h2 className="text-2xl" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>
          The Tracker
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-stone-900 text-stone-900 text-xs uppercase tracking-widest hover:bg-stone-900 hover:text-stone-100 transition"
          >
            <Upload className="w-3 h-3" /> Import JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => exportJSON(applications)}
            disabled={applications.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-stone-900 text-stone-900 text-xs uppercase tracking-widest hover:bg-stone-900 hover:text-stone-100 disabled:opacity-40 transition"
          >
            <Download className="w-3 h-3" /> Export JSON
          </button>
          <button
            onClick={() => exportCSV(applications, daysSince)}
            disabled={applications.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-stone-100 text-xs uppercase tracking-widest hover:bg-red-800 disabled:opacity-40 transition"
          >
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex items-center gap-5 mb-5 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-stone-300 border border-stone-400" />
          Day 3 — follow up soon
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-200 border border-red-400" />
          Day 6 — no activity, check status
        </span>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20 text-stone-500 italic">No applications filed yet.</div>
      ) : (
        <div className="border-2 border-stone-900 overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ minWidth: 960 }}>
            <thead>
              <tr className="bg-stone-900 text-stone-100">
                {[
                  ["Job Title", "w-[180px]"],
                  ["Company", "w-[130px]"],
                  ["Applied", "w-[110px]"],
                  ["Days", "w-[56px] text-center"],
                  ["Status", "w-[110px]"],
                  ["Followed Up", "w-[90px] text-center"],
                  ["Response", "w-[80px] text-center"],
                  ["Outcome", "w-[110px]"],
                  ["Notes", ""],
                  ["", "w-[36px]"],
                ].map(([h, cls]) => (
                  <th
                    key={h}
                    className={`px-3 py-3 text-left text-[10px] uppercase tracking-widest font-normal border-r border-stone-700 last:border-r-0 ${cls}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.map((app, idx) => {
                const days = daysSince(app.appliedAt);
                const actionTaken = app.followedUp || app.responseReceived || app.outcome !== "";
                const isRed = !actionTaken && days >= 6;
                const isGrey = !actionTaken && days >= 3 && days < 6;
                const rowBg = isRed
                  ? "bg-red-50"
                  : isGrey
                  ? "bg-stone-200"
                  : idx % 2 === 0
                  ? "bg-stone-50"
                  : "bg-white";

                return (
                  <React.Fragment key={app.id}>
                    <tr className={`${rowBg} border-t border-stone-200 hover:brightness-[0.97] transition`}>
                      <td className="px-3 py-2.5 border-r border-stone-200 font-medium">
                        {app.jobLink ? (
                          <a
                            href={app.jobLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-red-800 hover:underline leading-snug"
                          >
                            {app.jobTitle}
                          </a>
                        ) : (
                          <span className="leading-snug">{app.jobTitle}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 border-r border-stone-200 text-stone-700 whitespace-nowrap">
                        {app.companyName}
                      </td>
                      <td className="px-3 py-2.5 border-r border-stone-200">
                        <input
                          type="date"
                          value={app.appliedAt}
                          onChange={(e) => updateApplication(app.id, "appliedAt", e.target.value)}
                          className="bg-transparent text-xs focus:outline-none focus:border-b focus:border-stone-900 w-full"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        />
                      </td>
                      <td
                        className={`px-3 py-2.5 border-r border-stone-200 text-center font-bold tabular-nums ${
                          isRed ? "text-red-700" : isGrey ? "text-stone-500" : "text-stone-600"
                        }`}
                      >
                        {days}
                        {isRed ? " ⚑" : ""}
                      </td>
                      <td className="px-3 py-2.5 border-r border-stone-200">
                        <select
                          value={app.status}
                          onChange={(e) => updateApplication(app.id, "status", e.target.value)}
                          className="bg-transparent text-xs focus:outline-none w-full cursor-pointer"
                        >
                          <option>Applied</option>
                          <option>In Progress</option>
                          <option>Withdrawn</option>
                          <option>Closed</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 border-r border-stone-200 text-center">
                        <input
                          type="checkbox"
                          checked={app.followedUp}
                          onChange={(e) => updateApplication(app.id, "followedUp", e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-stone-900"
                        />
                      </td>
                      <td className="px-3 py-2.5 border-r border-stone-200 text-center">
                        <input
                          type="checkbox"
                          checked={app.responseReceived}
                          onChange={(e) => updateApplication(app.id, "responseReceived", e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-stone-900"
                        />
                      </td>
                      <td className="px-3 py-2.5 border-r border-stone-200">
                        <select
                          value={app.outcome}
                          onChange={(e) => updateApplication(app.id, "outcome", e.target.value)}
                          className={`bg-transparent text-xs focus:outline-none w-full cursor-pointer ${
                            app.outcome === "Rejected"
                              ? "text-red-700"
                              : app.outcome === "Interview"
                              ? "text-blue-700"
                              : app.outcome === "Offer"
                              ? "text-green-700"
                              : ""
                          }`}
                        >
                          <option value="">—</option>
                          <option value="No Response">No Response</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Interview">Interview</option>
                          <option value="Offer">Offer</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 border-r border-stone-200">
                        <input
                          value={app.notes}
                          onChange={(e) => updateApplication(app.id, "notes", e.target.value)}
                          placeholder="notes…"
                          className="bg-transparent text-xs w-full focus:outline-none placeholder:text-stone-300 min-w-[100px]"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => toggleExpand(app.id)}
                          className="text-stone-400 hover:text-stone-900 transition"
                        >
                          {expandedApps[app.id] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {expandedApps[app.id] && (
                      <tr className={`${rowBg} border-t border-dashed border-stone-300`}>
                        <td colSpan={10} className="px-4 py-4">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            {[
                              ["Last Contact Date", "lastContactDate"],
                              ["Follow-up Date", "followUpDate"],
                              ["Response Date", "responseDate"],
                            ].map(([label, field]) => (
                              <div key={field}>
                                <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">{label}</div>
                                <input
                                  type="date"
                                  value={app[field]}
                                  onChange={(e) => updateApplication(app.id, field, e.target.value)}
                                  className="bg-transparent border-b border-stone-300 text-xs focus:outline-none focus:border-stone-900 w-full"
                                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                />
                              </div>
                            ))}
                          </div>
                          {app.contacts.length > 0 ? (
                            <table className="w-full text-xs border-collapse border border-stone-300">
                              <thead>
                                <tr className="bg-stone-200">
                                  {["Contact", "Role", "LinkedIn", "Msg Sent", "Days", "Message"].map((h) => (
                                    <th
                                      key={h}
                                      className="text-left px-3 py-1.5 text-[10px] uppercase tracking-widest font-normal border-r border-stone-300 last:border-r-0 whitespace-nowrap"
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {app.contacts.map((c) => {
                                  const cd = daysSince(c.sentAt);
                                  return (
                                    <tr key={c.id} className="border-t border-stone-200 bg-white">
                                      <td className="px-3 py-1.5 border-r border-stone-200 whitespace-nowrap">
                                        {c.name || <span className="italic text-stone-400">unnamed</span>}
                                      </td>
                                      <td className="px-3 py-1.5 border-r border-stone-200 uppercase tracking-wider text-stone-500 whitespace-nowrap">
                                        {ROLES.find((r) => r.id === c.role)?.label}
                                      </td>
                                      <td className="px-3 py-1.5 border-r border-stone-200">
                                        {c.linkedInUrl ? (
                                          <a
                                            href={c.linkedInUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-red-800 hover:underline flex items-center gap-1"
                                          >
                                            <Link2 className="w-3 h-3" />
                                            profile
                                          </a>
                                        ) : (
                                          <span className="text-stone-300">—</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-1.5 border-r border-stone-200">
                                        <input
                                          type="date"
                                          value={c.sentAt}
                                          onChange={(e) =>
                                            updateContactInApp(app.id, c.id, "sentAt", e.target.value)
                                          }
                                          className="bg-transparent text-stone-600 focus:outline-none focus:border-b focus:border-stone-900"
                                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                        />
                                      </td>
                                      <td
                                        className={`px-3 py-1.5 border-r border-stone-200 text-center font-bold ${
                                          cd >= 5 ? "text-red-700" : "text-stone-600"
                                        }`}
                                      >
                                        {cd}d
                                      </td>
                                      <td className="px-3 py-1.5 text-center">
                                        {c.messageSent ? (
                                          <button
                                            onClick={() => copy(c.messageSent, c.id)}
                                            className="inline-flex items-center gap-1 text-stone-600 hover:text-red-800"
                                          >
                                            {copiedId === c.id ? (
                                              <Check className="w-3 h-3" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                            {copiedId === c.id ? "copied" : "copy"}
                                          </button>
                                        ) : (
                                          <span className="text-stone-300">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-xs italic text-stone-400">No contacts logged.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
