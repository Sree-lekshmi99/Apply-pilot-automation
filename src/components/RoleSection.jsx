import { useState } from "react";
import { callOpenAI } from "../utils/api";
import { SectionHeader, Field } from "./ui";

export default function RoleSection({
  apiKey,
  jobLink, setJobLink,
  jobTitle, setJobTitle,
  companyName, setCompanyName,
  jobDescription, setJobDescription,
  setError,
}) {
  const [fetchingJob, setFetchingJob] = useState(false);

  const fetchJobDetails = async () => {
    if (!jobLink.trim()) return setError("Paste a job link first.");
    if (!apiKey) return setError("Add your OpenAI API key in Settings.");
    setFetchingJob(true);
    setError("");
    try {
      const readerUrl = `https://r.jina.ai/${jobLink}`;
      const res = await fetch(readerUrl, { headers: { Accept: "text/plain" } });
      if (!res.ok) throw new Error("Could not reach the job page. Try pasting the details manually.");
      const text = (await res.text()).trim().slice(0, 8000);
      if (!text) throw new Error("Page returned empty content. Try pasting the details manually.");
      const sys = `Extract job posting details from the following webpage text. Return STRICT JSON only: {"job_title": "<title>", "company_name": "<company>", "job_description": "<full job description text>"}. If a field cannot be found, use an empty string. No prose outside the JSON.`;
      const raw = await callOpenAI(apiKey, sys, `WEBPAGE TEXT:\n${text}`);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (parsed.job_title) setJobTitle(parsed.job_title);
      if (parsed.company_name) setCompanyName(parsed.company_name);
      if (parsed.job_description) setJobDescription(parsed.job_description);
    } catch (err) {
      setError(`Job fetch failed: ${err.message}`);
    } finally {
      setFetchingJob(false);
    }
  };

  return (
    <section className="mb-12">
      <SectionHeader title="The Role" />
      <p className="text-sm text-stone-500 italic mb-4">
        Paste a job link and let AI extract the details — or fill them in manually.
      </p>

      <div className="flex gap-2 mb-5">
        <input
          value={jobLink}
          onChange={(e) => setJobLink(e.target.value)}
          placeholder="https://jobs.greenhouse.io/… or any job posting URL"
          className="flex-1 border border-stone-900 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
        />
        <button
          onClick={fetchJobDetails}
          disabled={fetchingJob}
          className="px-5 py-2 bg-stone-900 text-stone-100 text-xs uppercase tracking-widest hover:bg-red-800 disabled:opacity-50 transition whitespace-nowrap"
        >
          {fetchingJob ? "Fetching…" : "Fetch Job"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Field label="Company" value={companyName} onChange={setCompanyName} placeholder="e.g. Anthropic" />
        <Field label="Job Title" value={jobTitle} onChange={setJobTitle} placeholder="e.g. Senior Product Designer" />
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Job Description</span>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={8}
          placeholder="Auto-filled after fetching, or paste manually…"
          className="mt-1 w-full border border-stone-900 bg-stone-50 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-900 font-normal text-sm"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
        />
      </label>
    </section>
  );
}
