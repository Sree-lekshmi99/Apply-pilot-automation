import { useState, useEffect } from "react";
import {
  Plus, Trash2, Link2, Copy, Check, Send, Briefcase, UserCircle, Users,
} from "lucide-react";
import { callOpenAI } from "../utils/api";
import { ROLES } from "../constants";
import { SectionHeader, GenBox } from "./ui";

const ROLE_ICONS = { hiring_manager: Briefcase, recruiter: UserCircle, employee: Users };

export default function OutreachSection({
  apiKey,
  jobTitle, companyName, jobDescription,
  resumes, matchResult,
  linkedInProfile, userSchool,
  contacts, onAddContact, onUpdateContact, onRemoveContact,
  setError,
  sessionKey,
}) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [generated, setGenerated] = useState({});
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [linkedInSearches, setLinkedInSearches] = useState(null);
  const [appQuestion, setAppQuestion] = useState("");
  const [appQuestionCustom, setAppQuestionCustom] = useState("");
  const [appQuestionAnswer, setAppQuestionAnswer] = useState(null);
  const [answeringQuestion, setAnsweringQuestion] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    setSelectedRole(null);
    setGenerated({});
    setLinkedInSearches(null);
    setAppQuestion("");
    setAppQuestionCustom("");
    setAppQuestionAnswer(null);
  }, [sessionKey]);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const generateContent = async (role, kind) => {
    setError("");
    if (!apiKey) return setError("Add your OpenAI API key in Settings.");
    if (!jobTitle || !companyName) return setError("Fill in job title and company name.");
    setGenerating(`${role}-${kind}`);
    try {
      const roleLabel = ROLES.find((r) => r.id === role).label;
      const bestResume = matchResult
        ? resumes[matchResult.best_index - 1]?.text.slice(0, 3000)
        : resumes[0]?.text.slice(0, 3000) || "";
      let sys, user;

      if (kind === "note") {
        sys = "Write a LinkedIn connection note. Strict rules: maximum 280 characters, warm but professional, no emojis, no hashtags, reference the specific role and company, sound like a real person not a template. Return ONLY the note text.";
        user = `I want to connect with a ${roleLabel} at ${companyName}. I'm interested in the ${jobTitle} role there. Write the note from my perspective.`;
      } else if (kind === "message") {
        sys = "Write a LinkedIn direct message to someone at a target company after sending a connection request. Strict rules: 90–140 words, natural and specific, no emojis, no buzzwords like 'synergy' or 'leverage', reference one concrete thing from the job description and one concrete thing from the sender's background, end with a soft ask (brief chat or any advice). Return ONLY the message.";
        user = `ROLE OF RECIPIENT: ${roleLabel}\nCOMPANY: ${companyName}\nJOB TITLE: ${jobTitle}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nMY LINKEDIN / BACKGROUND:\n${linkedInProfile}\n\nMY RESUME:\n${bestResume}`;
      } else if (kind === "referral") {
        sys = "Write a casual, informal LinkedIn message asking someone for a referral for a job opening. Rules: 70-100 words, conversational and genuine — like texting a friendly acquaintance, not a cover letter, no emojis, pick one specific requirement from the job description that matches the sender's background and mention it naturally, make the referral ask feel low-pressure and easy to say yes to. Return ONLY the message.";
        user = `ROLE OF RECIPIENT: ${roleLabel}\nCOMPANY: ${companyName}\nJOB TITLE: ${jobTitle}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nMY BACKGROUND:\n${linkedInProfile}\n\nMY RESUME:\n${bestResume}`;
      } else if (kind === "intro") {
        sys = "Write a casual LinkedIn message where the sender introduces themselves and explains why they're a strong fit for a role. Rules: 90-130 words, warm and direct, no emojis, no corporate buzzwords, briefly say who you are, highlight 1-2 specific things from your background that directly match the job description (be concrete, not generic), express genuine interest in the company, end with a soft ask for a quick chat or any insight they can share. Return ONLY the message.";
        user = `ROLE OF RECIPIENT: ${roleLabel}\nCOMPANY: ${companyName}\nJOB TITLE: ${jobTitle}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nMY BACKGROUND:\n${linkedInProfile}\n\nMY RESUME:\n${bestResume}`;
      }

      const out = await callOpenAI(apiKey, sys, user);
      setGenerated((prev) => ({ ...prev, [`${role}-${kind}`]: out }));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(null);
    }
  };

  const findPeople = async () => {
    setError("");
    if (!apiKey) return setError("Add your OpenAI API key in Settings.");
    if (!jobTitle || !companyName) return setError("Fill in job title and company name first.");
    setSearchingPeople(true);
    setLinkedInSearches(null);
    try {
      const sys = `You are a job outreach assistant that generates LinkedIn people-search links.

Task: Create exactly 5 contact options:
1. Recruiter
2. Hiring manager
3. Same-function employee
4. Alumni
5. Talent acquisition / HR

For each option:
- infer the best search terms
- explain why this contact type matters
- generate a LinkedIn people-search URL
- assign a message type

Constraints:
- do not invent people
- do not claim search results were found
- keep search terms short and practical
- include company in all searches
- include user_school only for alumni search when available

Output STRICT JSON only — an array of exactly 5 objects:
[{"type":"","why":"","search_terms":"","url":"","message_type":""}]
No prose outside the JSON.`;
      const user = `job_title: ${jobTitle}\ncompany_name: ${companyName}\njob_description: ${jobDescription.slice(0, 2000)}${userSchool ? `\nuser_school: ${userSchool}` : ""}`;
      const raw = await callOpenAI(apiKey, sys, user);
      setLinkedInSearches(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setSearchingPeople(false);
    }
  };

  const answerQuestion = async () => {
    setError("");
    if (!apiKey) return setError("Add your OpenAI API key in Settings.");
    if (!appQuestion.trim()) return setError("Type an application question first.");
    if (resumes.length === 0) return setError("Upload at least one resume.");
    setAnsweringQuestion(true);
    setAppQuestionAnswer(null);
    try {
      const resume = matchResult ? resumes[matchResult.best_index - 1] : resumes[0];
      const sys = `Answer the application question using only:
1. the candidate's resume
2. the scraped job title
3. the scraped company name
4. the scraped job description
5. any optional custom instructions

RULES:
- Do not invent experience, projects, tools, certifications, or metrics.
- Do not claim the candidate has done something unless it is supported by the resume.
- Do not fabricate company-specific details beyond what is in the job description or custom instructions.
- If the question asks for something not clearly supported by the resume, give the strongest honest answer using related or transferable experience.
- Write in first person, as if the candidate is answering directly.
- Keep the answer natural, concise, professional, and easy to paste into an application form.
- Avoid generic fluff, buzzwords, and repetition.
- Do not mention the resume, job description, or that you are generating an answer.
- Output only the final answer text.

STYLE:
- Tailor the answer to the role using relevant wording from the job description.
- Emphasize the most relevant parts of the resume.
- Keep enthusiasm realistic and specific.
- Default to a single polished paragraph.

LENGTH:
- Default to 100-150 words.
- If the application question sounds like a short textbox question, keep it under 80 words.
- If a word or character limit is provided in custom instructions, follow it.`;
      const extra = appQuestionCustom.trim() ? `\n\nCUSTOM INSTRUCTIONS:\n${appQuestionCustom.trim()}` : "";
      const user = `JOB TITLE: ${jobTitle}\nCOMPANY: ${companyName}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nRESUME:\n${resume.text.slice(0, 4000)}\n\nAPPLICATION QUESTION:\n${appQuestion.trim()}${extra}`;
      setAppQuestionAnswer(await callOpenAI(apiKey, sys, user));
    } catch (err) {
      setError(err.message);
    } finally {
      setAnsweringQuestion(false);
    }
  };

  return (
    <>
      {/* § 04: Outreach */}
      <section className="mb-12">
        <SectionHeader title="Outreach" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {ROLES.map((r) => {
            const Icon = ROLE_ICONS[r.id];
            const active = selectedRole === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={`flex items-center gap-3 border-2 px-4 py-4 transition ${
                  active ? "border-red-800 bg-red-800 text-stone-100" : "border-stone-900 hover:bg-stone-200"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm uppercase tracking-wider">{r.label}</span>
              </button>
            );
          })}
        </div>

        {selectedRole && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { kind: "note", title: "Connection Note", subtitle: "≤ 280 characters · first touch" },
              { kind: "message", title: "Follow-up Message", subtitle: "Post-connection · professional" },
              { kind: "referral", title: "Ask for a Referral", subtitle: "Casual · low-pressure ask" },
              { kind: "intro", title: "Introduce Myself", subtitle: "Casual · why I'm a fit" },
            ].map(({ kind, title, subtitle }) => (
              <GenBox
                key={kind}
                title={title}
                subtitle={subtitle}
                onGenerate={() => generateContent(selectedRole, kind)}
                generating={generating === `${selectedRole}-${kind}`}
                content={generated[`${selectedRole}-${kind}`]}
                onCopy={() => copy(generated[`${selectedRole}-${kind}`], `${selectedRole}-${kind}`)}
                copied={copiedId === `${selectedRole}-${kind}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* § 05: Find People */}
      <section className="mb-12">
        <SectionHeader title="Find People" />
        <p className="text-sm text-stone-500 italic mb-4">
          Generates 5 LinkedIn people-search links — recruiter, hiring manager, same-function employee, alumni, and
          talent acquisition.
        </p>
        <button
          onClick={findPeople}
          disabled={searchingPeople}
          className="px-6 py-2 bg-stone-900 text-stone-100 text-xs uppercase tracking-widest hover:bg-red-800 disabled:opacity-50 transition"
        >
          {searchingPeople ? "Searching…" : "Find People on LinkedIn"}
        </button>

        {linkedInSearches && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {linkedInSearches.map((item, i) => (
              <div key={i} className="border border-stone-900 bg-stone-50 flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-stone-900 bg-stone-900 text-stone-100">
                  <span className="text-xs uppercase tracking-widest">{item.type}</span>
                  <span className="text-[10px] italic text-stone-400">{item.message_type}</span>
                </div>
                <div className="px-4 py-3 flex-1 space-y-2">
                  <p className="text-sm text-stone-700 leading-relaxed">{item.why}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-stone-400">Search terms</span>
                    <span
                      className="text-xs border border-stone-300 px-2 py-0.5 bg-white text-stone-700"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {item.search_terms}
                    </span>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-stone-200">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-widest border border-stone-900 px-3 py-1.5 hover:bg-stone-900 hover:text-stone-100 transition"
                  >
                    <Link2 className="w-3 h-3" /> Open LinkedIn Search
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* § 06: People Contacted */}
      <section className="mb-12">
        <SectionHeader title="People Contacted" />
        <div className="space-y-3 mb-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border border-stone-900 bg-stone-50 p-3"
            >
              <input
                value={c.name}
                onChange={(e) => onUpdateContact(c.id, "name", e.target.value)}
                placeholder="Full name"
                className="md:col-span-3 border-b border-stone-400 bg-transparent px-1 py-1 text-sm focus:outline-none focus:border-stone-900"
              />
              <select
                value={c.role}
                onChange={(e) => onUpdateContact(c.id, "role", e.target.value)}
                className="md:col-span-2 border border-stone-400 bg-transparent px-1 py-1 text-xs uppercase tracking-wider"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                value={c.linkedInUrl}
                onChange={(e) => onUpdateContact(c.id, "linkedInUrl", e.target.value)}
                placeholder="linkedin.com/in/…"
                className="md:col-span-4 border-b border-stone-400 bg-transparent px-1 py-1 text-xs focus:outline-none focus:border-stone-900"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
              <input
                type="date"
                value={c.sentAt}
                onChange={(e) => onUpdateContact(c.id, "sentAt", e.target.value)}
                className="md:col-span-2 border-b border-stone-400 bg-transparent px-1 py-1 text-xs focus:outline-none focus:border-stone-900"
              />
              <button onClick={() => onRemoveContact(c.id)} className="md:col-span-1 text-stone-600 hover:text-red-800">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => onAddContact(selectedRole, generated[`${selectedRole}-message`])}
          className="flex items-center gap-2 border border-dashed border-stone-900 px-3 py-2 text-xs uppercase tracking-widest hover:bg-stone-900 hover:text-stone-100 transition"
        >
          <Plus className="w-3 h-3" /> Add Contact
        </button>
      </section>

      {/* § 07: Application Questions */}
      <section className="mb-12">
        <SectionHeader title="Application Questions" />
        <p className="text-sm text-stone-500 italic mb-4">
          Paste any question from the application form — cover letter, motivation, work style, situational — and get a
          honest, resume-backed answer.
        </p>
        <label className="block mb-4">
          <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Question</span>
          <textarea
            value={appQuestion}
            onChange={(e) => setAppQuestion(e.target.value)}
            rows={3}
            placeholder={`e.g. "Why do you want to work at this company?" · "Describe a challenge you overcame" · "What is your greatest strength?"`}
            className="mt-1 w-full border border-stone-900 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
        </label>
        <label className="block mb-4">
          <span className="text-xs uppercase tracking-[0.2em] text-stone-500">
            Custom Instructions{" "}
            <span className="normal-case italic text-stone-400">(optional)</span>
          </span>
          <textarea
            value={appQuestionCustom}
            onChange={(e) => setAppQuestionCustom(e.target.value)}
            rows={2}
            placeholder={`e.g. "Keep it under 200 words" · "Focus on my leadership experience" · "Mention my career change"`}
            className="mt-1 w-full border border-stone-900 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
        </label>
        <button
          onClick={answerQuestion}
          disabled={answeringQuestion}
          className="px-6 py-2 bg-stone-900 text-stone-100 text-xs uppercase tracking-widest hover:bg-red-800 disabled:opacity-50 transition"
        >
          {answeringQuestion ? "Writing…" : "Answer Question"}
        </button>
        {appQuestionAnswer && (
          <div className="mt-5 border border-stone-900 bg-stone-50">
            <div className="flex items-center justify-between px-4 py-2 border-b border-stone-300 bg-stone-200">
              <span className="text-[10px] uppercase tracking-widest text-stone-600">Suggested Answer</span>
              <button
                onClick={() => copy(appQuestionAnswer, "app-question")}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-red-800"
              >
                {copiedId === "app-question" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedId === "app-question" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="px-4 py-4 text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">{appQuestionAnswer}</p>
          </div>
        )}
      </section>
    </>
  );
}
