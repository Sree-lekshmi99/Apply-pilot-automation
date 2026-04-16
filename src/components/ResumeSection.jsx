import { useState, useRef, useEffect } from "react";
import { Upload, FileText, X } from "lucide-react";
import { callOpenAI, extractPdfText } from "../utils/api";
import { SectionHeader, ResumeCheckOutput } from "./ui";

export default function ResumeSection({
  apiKey,
  resumes, setResumes,
  jobTitle, companyName, jobDescription,
  matchResult, setMatchResult,
  setError,
  sessionKey,
}) {
  const [matching, setMatching] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [resumeSuggestions, setResumeSuggestions] = useState(null);
  const [resumeCustomPrompt, setResumeCustomPrompt] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setResumeSuggestions(null);
    setResumeCustomPrompt("");
  }, [sessionKey]);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleResumeUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    setError("");
    for (const f of files) {
      try {
        const text = await extractPdfText(f);
        setResumes((prev) => [...prev, { id: crypto.randomUUID(), name: f.name, text }]);
      } catch (err) {
        setError(`Failed to read ${f.name}: ${err.message}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeResume = (id) => setResumes((prev) => prev.filter((r) => r.id !== id));

  const matchResume = async () => {
    setError("");
    if (!apiKey) return setError("Add your OpenAI API key in Settings.");
    if (resumes.length === 0) return setError("Upload at least one resume.");
    if (!jobDescription.trim()) return setError("Paste the job description.");
    setMatching(true);
    setMatchResult(null);
    try {
      const resumeBlock = resumes
        .map((r, i) => `RESUME ${i + 1} — ${r.name}:\n${r.text.slice(0, 4000)}`)
        .join("\n\n---\n\n");
      const sys =
        'You are an expert career coach. Given a job description and multiple resumes, pick the single best-matching resume and return STRICT JSON only: {"best_index": <1-based int>, "best_name": "<filename>", "score": <0-100>, "reasoning": "<2-3 sentences>"}. No prose outside the JSON.';
      const user = `JOB TITLE: ${jobTitle}\nCOMPANY: ${companyName}\n\nJOB DESCRIPTION:\n${jobDescription}\n\n${resumeBlock}`;
      const raw = await callOpenAI(apiKey, sys, user);
      setMatchResult(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  };

  const optimizeResume = async () => {
    setError("");
    if (!apiKey) return setError("Add your OpenAI API key in Settings.");
    if (resumes.length === 0) return setError("Upload at least one resume.");
    if (!jobDescription.trim()) return setError("Paste the job description.");
    setOptimizing(true);
    setResumeSuggestions(null);
    try {
      const resume = matchResult ? resumes[matchResult.best_index - 1] : resumes[0];
      const sys = `Your job: compare my existing resume against a job description and tell me exactly what to change so my resume matches the job posting more closely for ATS and recruiter review.

Rules:
- Do not fabricate anything.
- Do not add skills, tools, titles, responsibilities, or achievements I do not already have.
- Only rewrite, retitle, reorder, or surface experience that already exists in my resume.
- Use the job description's exact language wherever it truthfully matches my experience.
- Optimize first for ATS parsing, then for recruiter readability.
- Keep everything clean, direct, and practical.
- Do not explain your reasoning unless I ask.
- Do not give long paragraphs.
- Do not rewrite the full resume unless I ask.
- Focus only on what should be changed.

Important ATS rules to follow:
- Assume the resume must parse cleanly.
- Avoid tables, text boxes, headers/footers for key info, icons, logos, graphics, fancy formatting, and two-column structures.
- Prefer single-column, standard word processor formatting.
- Assume keywords should appear explicitly, especially in a dedicated Skills section.
- ATS matching is literal, so mirror exact phrases from the job description when they genuinely apply.
- Highlight repeated skills, tools, responsibilities, and anything listed early in the job description as priority terms.
- Job titles matter. If my real title is non-standard but equivalent to the target role, suggest a clarifying parenthetical title only if truthful.
  Example: Growth Analyst (Marketing Analyst)
- Never invent a new title outright.
- Soft skills should not be emphasized in the Skills section unless directly tied to outcomes in bullets.

When I send you a job description, do this:

Output format only:

1. PRIORITY KEYWORDS TO ADD
- List the exact skills, tools, platforms, methodologies, certifications, and responsibilities from the job description that appear more than once, are listed first, or seem core to the role.

2. SKILLS SECTION CHANGES
- Tell me exactly which hard skills/tools/platforms should be added, removed, or renamed in my Skills section based on my existing resume.
- Use exact job-description wording where truthful.

3. TITLE CHANGES
- Identify any job titles on my resume that should be clarified with a standard parenthetical title.
- Only suggest this when accurate.
- Show:
  Current Title → Suggested Title

4. EXPERIENCE BULLET CHANGES
- For each relevant role, give:
  - KEEP
  - REWRITE
  - ADD FROM EXISTING EXPERIENCE
  - REMOVE/DE-EMPHASIZE
- Rewrite bullets so they match the job description more closely without fabricating.
- Use concise, ATS-friendly language.
- Preserve metrics and achievements whenever possible.
- Prioritize bullets that align to repeated or first-listed job requirements.

5. MISSING TERMS ALREADY SUPPORTED BY MY EXPERIENCE
- List important exact-match terms from the job description that are not clearly stated in my resume but should be inserted because my resume already shows that experience in different words.

6. SUMMARY CHANGES
- Give only the exact phrases or lines that should be added, removed, or rewritten in my summary to align with the job description.

7. FINAL TARGETED EDITS
- Give me a short checklist of the exact edits I should make.

Response rules:
- Be brief.
- Be specific.
- No essays.
- No generic advice.
- No explanations unless asked.
- No fabricated content.
- Only show changes that improve alignment.`;

      const extra = resumeCustomPrompt.trim()
        ? `\n\nADDITIONAL CONTEXT FROM ME:\n${resumeCustomPrompt.trim()}`
        : "";
      const user = `MY CURRENT RESUME:\n${resume.text.slice(0, 4000)}\n\nTARGET JOB DESCRIPTION:\n${jobDescription}${extra}`;
      setResumeSuggestions(await callOpenAI(apiKey, sys, user));
    } catch (err) {
      setError(err.message);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <>
      {/* § 02: The Match */}
      <section className="mb-12">
        <SectionHeader title="The Match" />
        <div className="flex flex-wrap gap-2 mb-3">
          {resumes.map((r) => (
            <div key={r.id} className="flex items-center gap-2 border border-stone-900 bg-stone-50 px-3 py-1.5 text-xs">
              <FileText className="w-3 h-3" />
              <span>{r.name}</span>
              <button onClick={() => removeResume(r.id)} className="hover:opacity-60">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 border border-dashed border-stone-900 px-3 py-1.5 text-xs hover:bg-stone-900 hover:text-stone-100 transition"
          >
            <Upload className="w-3 h-3" /> Upload Resume PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleResumeUpload}
            className="hidden"
          />
        </div>
        <button
          onClick={matchResume}
          disabled={matching}
          className="px-6 py-2 bg-stone-900 text-stone-100 text-xs uppercase tracking-widest hover:bg-red-800 disabled:opacity-50 transition"
        >
          {matching ? "Analyzing…" : "Find Best Match"}
        </button>
        {matchResult && (
          <div className="mt-4 border-l-4 border-red-800 bg-stone-50 p-4">
            <div className="text-xs uppercase tracking-widest text-stone-500">Verdict</div>
            <div className="text-lg mt-1">
              <span className="italic">{matchResult.best_name}</span>
              <span className="ml-3 text-red-800 font-bold">{matchResult.score}/100</span>
            </div>
            <p className="text-sm mt-2 text-stone-700 leading-relaxed">{matchResult.reasoning}</p>
          </div>
        )}
      </section>

      {/* § 03: Resume Check */}
      <section className="mb-12">
        <SectionHeader title="Resume Check" />
        <p className="text-sm text-stone-500 italic mb-4">
          Analyzes your resume against the job description — suggests tone fixes, lines to highlight, and missing ATS
          keywords. No experience is fabricated.
        </p>
        <label className="block mb-4">
          <span className="text-xs uppercase tracking-[0.2em] text-stone-500">
            Custom Instructions{" "}
            <span className="normal-case italic text-stone-400">(optional)</span>
          </span>
          <textarea
            value={resumeCustomPrompt}
            onChange={(e) => setResumeCustomPrompt(e.target.value)}
            rows={3}
            placeholder={`e.g. "Focus on data engineering keywords" · "I'm a career changer from finance" · "Prioritise leadership and team management"`}
            className="mt-1 w-full border border-stone-900 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
        </label>
        <button
          onClick={optimizeResume}
          disabled={optimizing}
          className="px-6 py-2 bg-stone-900 text-stone-100 text-xs uppercase tracking-widest hover:bg-red-800 disabled:opacity-50 transition"
        >
          {optimizing ? "Checking…" : "Check My Resume"}
        </button>
        {resumeSuggestions && (
          <div className="mt-6">
            <ResumeCheckOutput
              text={resumeSuggestions}
              onCopy={() => copy(resumeSuggestions, "resume-check")}
              copied={copiedId === "resume-check"}
            />
          </div>
        )}
      </section>
    </>
  );
}
