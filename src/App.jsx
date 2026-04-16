import React, { useState, useRef, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Upload, FileText, Copy, Check, Download, Trash2, Plus, X, Key, Briefcase, Users, UserCircle, Send, Link2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

// Load pdfjs from CDN at runtime
const loadPdfJs = () => new Promise((resolve, reject) => {
  if (window.pdfjsLib) return resolve(window.pdfjsLib);
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  script.onload = () => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    resolve(window.pdfjsLib);
  };
  script.onerror = reject;
  document.head.appendChild(script);
});

const extractPdfText = async (file) => {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return text;
};

const callOpenAI = async (apiKey, systemPrompt, userPrompt) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI: ${res.status} ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
};

const ROLES = [
  { id: "hiring_manager", label: "Hiring Manager", icon: Briefcase },
  { id: "recruiter", label: "Recruiter", icon: UserCircle },
  { id: "employee", label: "Employee", icon: Users },
];


export default function App() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || "");
  const [linkedInProfile, setLinkedInProfile] = useState("");
  const [resumes, setResumes] = useState([]);
  const [jobLink, setJobLink] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [matching, setMatching] = useState(false);
  const [resumeSuggestions, setResumeSuggestions] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [generated, setGenerated] = useState({});
  const [generating, setGenerating] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [applications, setApplications] = useState(() => {
    try {
      const saved = localStorage.getItem("applypilot_applications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [userSchool, setUserSchool] = useState("");
  const [fetchingJob, setFetchingJob] = useState(false);
  const [resumeCustomPrompt, setResumeCustomPrompt] = useState("");
  const [linkedInSearches, setLinkedInSearches] = useState(null);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [appQuestion, setAppQuestion] = useState("");
  const [appQuestionCustom, setAppQuestionCustom] = useState("");
  const [appQuestionAnswer, setAppQuestionAnswer] = useState(null);
  const [answeringQuestion, setAnsweringQuestion] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState("compose");
  const [expandedApps, setExpandedApps] = useState({});
  const [dashboardRange, setDashboardRange] = useState("30d");
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const fileInputRef = useRef(null);

  const toggleExpand = (id) => setExpandedApps((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    localStorage.setItem("applypilot_applications", JSON.stringify(applications));
  }, [applications]);

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
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.job_title) setJobTitle(parsed.job_title);
      if (parsed.company_name) setCompanyName(parsed.company_name);
      if (parsed.job_description) setJobDescription(parsed.job_description);
    } catch (err) {
      setError(`Job fetch failed: ${err.message}`);
    } finally {
      setFetchingJob(false);
    }
  };

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
      const clean = raw.replace(/```json|```/g, "").trim();
      setMatchResult(JSON.parse(clean));
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

      const extraInstructions = resumeCustomPrompt.trim()
        ? `\n\nADDITIONAL CONTEXT FROM ME:\n${resumeCustomPrompt.trim()}`
        : "";
      const user = `MY CURRENT RESUME:\n${resume.text.slice(0, 4000)}\n\nTARGET JOB DESCRIPTION:\n${jobDescription}${extraInstructions}`;
      const result = await callOpenAI(apiKey, sys, user);
      setResumeSuggestions(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setOptimizing(false);
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
      const clean = raw.replace(/```json|```/g, "").trim();
      setLinkedInSearches(JSON.parse(clean));
    } catch (err) {
      setError(err.message);
    } finally {
      setSearchingPeople(false);
    }
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
      const result = await callOpenAI(apiKey, sys, user);
      setAppQuestionAnswer(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnsweringQuestion(false);
    }
  };

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        role: selectedRole || "hiring_manager",
        linkedInUrl: "",
        messageSent: generated[`${selectedRole}-message`] || "",
        sentAt: new Date().toISOString().slice(0, 10),
      },
    ]);
  };

  const updateContact = (id, field, value) =>
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  const removeContact = (id) => setContacts((prev) => prev.filter((c) => c.id !== id));

  const updateApplication = (id, field, value) =>
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));

  const applyAndSave = () => {
    if (!jobTitle || !companyName) return setError("Fill in job title and company name.");
    const app = {
      id: crypto.randomUUID(),
      jobTitle,
      companyName,
      jobLink,
      appliedAt: new Date().toISOString().slice(0, 10),
      status: "Applied",
      lastContactDate: "",
      followedUp: false,
      followUpDate: "",
      responseReceived: false,
      responseDate: "",
      outcome: "",
      notes: "",
      contacts: [...contacts],
    };
    setApplications((prev) => [app, ...prev]);
    setJobLink(""); setJobTitle(""); setCompanyName(""); setJobDescription("");
    setMatchResult(null); setResumeSuggestions(null); setLinkedInSearches(null);
    setSelectedRole(null); setGenerated({}); setContacts([]); setError("");
  };

  const daysSince = (dateStr) =>
    Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);

  const exportCSV = () => {
    const rows = [
      ["Job Title", "Company", "Job Link", "Applied On", "Status", "Last Contact Date", "Followed Up", "Follow-up Date", "Response Received", "Response Date", "Outcome", "Notes", "Contact Name", "Contact Role", "LinkedIn URL", "Message Sent On", "Days Since Contact", "Message"],
    ];
    applications.forEach((app) => {
      const appBase = [
        app.jobTitle, app.companyName, app.jobLink, app.appliedAt,
        app.status, app.lastContactDate, app.followedUp ? "Yes" : "No",
        app.followUpDate, app.responseReceived ? "Yes" : "No",
        app.responseDate, app.outcome, app.notes,
      ];
      if (app.contacts.length === 0) {
        rows.push([...appBase, "", "", "", "", "", ""]);
      } else {
        app.contacts.forEach((c) => {
          rows.push([
            ...appBase,
            c.name, ROLES.find((r) => r.id === c.role)?.label || c.role,
            c.linkedInUrl, c.sentAt, String(daysSince(c.sentAt)),
            (c.messageSent || "").replace(/\n/g, " "),
          ]);
        });
      }
    });
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(applications, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applications-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dashboardData = useMemo(() => {
    const rangeMap = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
    const days = rangeMap[dashboardRange];
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    let dates;
    if (days) {
      dates = Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (days - 1 - i));
        return d.toISOString().slice(0, 10);
      });
    } else {
      const allDates = [];
      applications.forEach((app) => {
        if (app.appliedAt) allDates.push(app.appliedAt);
        app.contacts.forEach((c) => { if (c.sentAt) allDates.push(c.sentAt); });
      });
      if (allDates.length === 0) return { chartData: [], totalApps: 0, totalContacts: 0 };
      allDates.sort();
      const start = new Date(allDates[0] + "T00:00:00");
      const dayCount = Math.ceil((now - start) / 86400000) + 1;
      dates = Array.from({ length: dayCount }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
    }

    const startDate = dates[0];
    const appMap = Object.fromEntries(dates.map((d) => [d, 0]));
    const contactMap = Object.fromEntries(dates.map((d) => [d, 0]));

    applications.forEach((app) => {
      if (app.appliedAt >= startDate && appMap[app.appliedAt] !== undefined) appMap[app.appliedAt]++;
      app.contacts.forEach((c) => {
        if (c.sentAt >= startDate && contactMap[c.sentAt] !== undefined) contactMap[c.sentAt]++;
      });
    });

    const chartData = dates.map((d) => ({
      date: d,
      label: new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      applications: appMap[d],
      contacts: contactMap[d],
    }));

    const totalApps = Object.values(appMap).reduce((a, b) => a + b, 0);
    const totalContacts = Object.values(contactMap).reduce((a, b) => a + b, 0);
    return { chartData, totalApps, totalContacts };
  }, [applications, dashboardRange]);

  const generateDashboardSummary = async () => {
    if (!apiKey) return setError("Add your OpenAI API key in Settings.");
    setGeneratingSummary(true);
    setDashboardSummary(null);
    setError("");
    try {
      const rangeLabel = { "7d": "last 7 days", "14d": "last 14 days", "30d": "last 30 days", "90d": "last 90 days", "all": "all time" }[dashboardRange];
      const { chartData, totalApps, totalContacts } = dashboardData;
      const sys = `You are a data summarizer for a job application tracker.

RULES:
- Do not invent trends or explanations.
- Describe only what is visible in the data.
- Mention the selected time range.
- Focus on applications and people contacted.
- Keep it short and direct.
- Output only the final summary text.`;
      const user = `Time range: ${rangeLabel}\nTotal applications: ${totalApps}\nTotal people contacted: ${totalContacts}\n\nDaily breakdown:\n${chartData.filter((d) => d.applications > 0 || d.contacts > 0).map((d) => `${d.date}: ${d.applications} application(s), ${d.contacts} contact(s)`).join("\n") || "No activity in this period."}`;
      const result = await callOpenAI(apiKey, sys, user);
      setDashboardSummary(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900" style={{ fontFamily: "'Libre Caslon Text', Georgia, serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Libre+Caslon+Display&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="border-b-2 border-stone-900 bg-stone-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl leading-none" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>
              The Application Desk
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {["compose", "tracker", "dashboard"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 text-xs uppercase tracking-widest border border-stone-900 transition ${
                  view === v ? "bg-stone-900 text-stone-100" : "hover:bg-stone-900 hover:text-stone-100"
                }`}
              >
                {v === "compose" ? "Compose" : v === "tracker" ? `Tracker (${applications.length})` : "Dashboard"}
              </button>
            ))}
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-xs uppercase tracking-widest border border-stone-900 hover:bg-stone-900 hover:text-stone-100 transition"
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto px-6 pt-4">
          <div className="flex items-start gap-2 border border-red-800 bg-red-50 px-4 py-3 text-sm text-red-900">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError("")} className="text-red-900 hover:opacity-60"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {view === "compose" && (
        <main className="max-w-6xl mx-auto px-6 py-10">

          {/* § 01: The Role */}
          <section className="mb-12">
            <SectionHeader title="The Role" />
            <p className="text-sm text-stone-500 italic mb-4">Paste a job link and let AI extract the details — or fill them in manually.</p>

            {/* Link + Fetch */}
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

            {/* Extracted / manual fields */}
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

          {/* § 02: The Match */}
          <section className="mb-12">
            <SectionHeader title="The Match" />
            <div className="flex flex-wrap gap-2 mb-3">
              {resumes.map((r) => (
                <div key={r.id} className="flex items-center gap-2 border border-stone-900 bg-stone-50 px-3 py-1.5 text-xs">
                  <FileText className="w-3 h-3" />
                  <span>{r.name}</span>
                  <button onClick={() => removeResume(r.id)} className="hover:opacity-60"><X className="w-3 h-3" /></button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 border border-dashed border-stone-900 px-3 py-1.5 text-xs hover:bg-stone-900 hover:text-stone-100 transition"
              >
                <Upload className="w-3 h-3" /> Upload Resume PDF
              </button>
              <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={handleResumeUpload} className="hidden" />
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
              Analyzes your resume against the job description — suggests tone fixes, lines to highlight, and missing ATS keywords. No experience is fabricated.
            </p>

            <label className="block mb-4">
              <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Custom Instructions <span className="normal-case italic text-stone-400">(optional)</span></span>
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
                <ResumeCheckOutput text={resumeSuggestions} onCopy={() => copy(resumeSuggestions, "resume-check")} copied={copiedId === "resume-check"} />
              </div>
            )}
          </section>

          {/* § 04: Outreach */}
          <section className="mb-12">
            <SectionHeader title="Outreach" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              {ROLES.map((r) => {
                const Icon = r.icon;
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
                <GenBox
                  title="Connection Note"
                  subtitle="≤ 280 characters · first touch"
                  onGenerate={() => generateContent(selectedRole, "note")}
                  generating={generating === `${selectedRole}-note`}
                  content={generated[`${selectedRole}-note`]}
                  onCopy={() => copy(generated[`${selectedRole}-note`], `${selectedRole}-note`)}
                  copied={copiedId === `${selectedRole}-note`}
                />
                <GenBox
                  title="Follow-up Message"
                  subtitle="Post-connection · professional"
                  onGenerate={() => generateContent(selectedRole, "message")}
                  generating={generating === `${selectedRole}-message`}
                  content={generated[`${selectedRole}-message`]}
                  onCopy={() => copy(generated[`${selectedRole}-message`], `${selectedRole}-message`)}
                  copied={copiedId === `${selectedRole}-message`}
                />
                <GenBox
                  title="Ask for a Referral"
                  subtitle="Casual · low-pressure ask"
                  onGenerate={() => generateContent(selectedRole, "referral")}
                  generating={generating === `${selectedRole}-referral`}
                  content={generated[`${selectedRole}-referral`]}
                  onCopy={() => copy(generated[`${selectedRole}-referral`], `${selectedRole}-referral`)}
                  copied={copiedId === `${selectedRole}-referral`}
                />
                <GenBox
                  title="Introduce Myself"
                  subtitle="Casual · why I'm a fit"
                  onGenerate={() => generateContent(selectedRole, "intro")}
                  generating={generating === `${selectedRole}-intro`}
                  content={generated[`${selectedRole}-intro`]}
                  onCopy={() => copy(generated[`${selectedRole}-intro`], `${selectedRole}-intro`)}
                  copied={copiedId === `${selectedRole}-intro`}
                />
              </div>
            )}
          </section>

          {/* § 05: Find People */}
          <section className="mb-12">
            <SectionHeader title="Find People" />
            <p className="text-sm text-stone-500 italic mb-4">
              Generates 5 LinkedIn people-search links — recruiter, hiring manager, same-function employee, alumni, and talent acquisition.
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
                        <span className="text-xs border border-stone-300 px-2 py-0.5 bg-white text-stone-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
                <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border border-stone-900 bg-stone-50 p-3">
                  <input
                    value={c.name}
                    onChange={(e) => updateContact(c.id, "name", e.target.value)}
                    placeholder="Full name"
                    className="md:col-span-3 border-b border-stone-400 bg-transparent px-1 py-1 text-sm focus:outline-none focus:border-stone-900"
                  />
                  <select
                    value={c.role}
                    onChange={(e) => updateContact(c.id, "role", e.target.value)}
                    className="md:col-span-2 border border-stone-400 bg-transparent px-1 py-1 text-xs uppercase tracking-wider"
                  >
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <input
                    value={c.linkedInUrl}
                    onChange={(e) => updateContact(c.id, "linkedInUrl", e.target.value)}
                    placeholder="linkedin.com/in/…"
                    className="md:col-span-4 border-b border-stone-400 bg-transparent px-1 py-1 text-xs focus:outline-none focus:border-stone-900"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                  <input
                    type="date"
                    value={c.sentAt}
                    onChange={(e) => updateContact(c.id, "sentAt", e.target.value)}
                    className="md:col-span-2 border-b border-stone-400 bg-transparent px-1 py-1 text-xs focus:outline-none focus:border-stone-900"
                  />
                  <button onClick={() => removeContact(c.id)} className="md:col-span-1 text-stone-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addContact}
              className="flex items-center gap-2 border border-dashed border-stone-900 px-3 py-2 text-xs uppercase tracking-widest hover:bg-stone-900 hover:text-stone-100 transition"
            >
              <Plus className="w-3 h-3" /> Add Contact
            </button>
          </section>

          {/* Application Questions */}
          <section className="mb-12">
            <SectionHeader title="Application Questions" />
            <p className="text-sm text-stone-500 italic mb-4">
              Paste any question from the application form — cover letter, motivation, work style, situational — and get a honest, resume-backed answer.
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
              <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Custom Instructions <span className="normal-case italic text-stone-400">(optional)</span></span>
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

          {/* Apply */}
          <section>
            <button
              onClick={applyAndSave}
              className="w-full border-2 border-stone-900 bg-stone-900 text-stone-100 py-5 text-sm uppercase tracking-[0.3em] hover:bg-red-800 hover:border-red-800 transition flex items-center justify-center gap-3"
            >
              <Send className="w-4 h-4" />
              Applied to This Job — Save to Tracker
            </button>
          </section>
        </main>
      )}

      {view === "tracker" && (
        <main className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-4 border-b border-stone-400 pb-2">
            <h2 className="text-2xl" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>The Tracker</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={exportJSON}
                disabled={applications.length === 0}
                className="flex items-center gap-2 px-4 py-2 border border-stone-900 text-stone-900 text-xs uppercase tracking-widest hover:bg-stone-900 hover:text-stone-100 disabled:opacity-40 transition"
              >
                <Download className="w-3 h-3" /> Export JSON
              </button>
              <button
                onClick={exportCSV}
                disabled={applications.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-stone-100 text-xs uppercase tracking-widest hover:bg-red-800 disabled:opacity-40 transition"
              >
                <Download className="w-3 h-3" /> Export CSV
              </button>
            </div>
          </div>

          {/* Legend */}
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
                      <th key={h} className={`px-3 py-3 text-left text-[10px] uppercase tracking-widest font-normal border-r border-stone-700 last:border-r-0 ${cls}`}>
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
                    const rowBg = isRed ? "bg-red-50" : isGrey ? "bg-stone-200" : idx % 2 === 0 ? "bg-stone-50" : "bg-white";

                    return (
                      <React.Fragment key={app.id}>
                        <tr className={`${rowBg} border-t border-stone-200 hover:brightness-[0.97] transition`}>

                          {/* Job Title */}
                          <td className="px-3 py-2.5 border-r border-stone-200 font-medium">
                            {app.jobLink
                              ? <a href={app.jobLink} target="_blank" rel="noreferrer" className="text-red-800 hover:underline leading-snug">{app.jobTitle}</a>
                              : <span className="leading-snug">{app.jobTitle}</span>}
                          </td>

                          {/* Company */}
                          <td className="px-3 py-2.5 border-r border-stone-200 text-stone-700 whitespace-nowrap">{app.companyName}</td>

                          {/* Applied date — editable */}
                          <td className="px-3 py-2.5 border-r border-stone-200">
                            <input
                              type="date"
                              value={app.appliedAt}
                              onChange={(e) => updateApplication(app.id, "appliedAt", e.target.value)}
                              className="bg-transparent text-xs focus:outline-none focus:border-b focus:border-stone-900 w-full"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            />
                          </td>

                          {/* Days */}
                          <td className={`px-3 py-2.5 border-r border-stone-200 text-center font-bold tabular-nums ${isRed ? "text-red-700" : isGrey ? "text-stone-500" : "text-stone-600"}`}>
                            {days}{isRed ? " ⚑" : ""}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2.5 border-r border-stone-200">
                            <select
                              value={app.status}
                              onChange={(e) => updateApplication(app.id, "status", e.target.value)}
                              className={`bg-transparent text-xs focus:outline-none w-full cursor-pointer`}
                            >
                              <option>Applied</option>
                              <option>In Progress</option>
                              <option>Withdrawn</option>
                              <option>Closed</option>
                            </select>
                          </td>

                          {/* Followed Up */}
                          <td className="px-3 py-2.5 border-r border-stone-200 text-center">
                            <input
                              type="checkbox"
                              checked={app.followedUp}
                              onChange={(e) => updateApplication(app.id, "followedUp", e.target.checked)}
                              className="w-4 h-4 cursor-pointer accent-stone-900"
                            />
                          </td>

                          {/* Response */}
                          <td className="px-3 py-2.5 border-r border-stone-200 text-center">
                            <input
                              type="checkbox"
                              checked={app.responseReceived}
                              onChange={(e) => updateApplication(app.id, "responseReceived", e.target.checked)}
                              className="w-4 h-4 cursor-pointer accent-stone-900"
                            />
                          </td>

                          {/* Outcome */}
                          <td className="px-3 py-2.5 border-r border-stone-200">
                            <select
                              value={app.outcome}
                              onChange={(e) => updateApplication(app.id, "outcome", e.target.value)}
                              className={`bg-transparent text-xs focus:outline-none w-full cursor-pointer ${
                                app.outcome === "Rejected" ? "text-red-700" :
                                app.outcome === "Interview" ? "text-blue-700" :
                                app.outcome === "Offer" ? "text-green-700" : ""
                              }`}
                            >
                              <option value="">—</option>
                              <option value="No Response">No Response</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Interview">Interview</option>
                              <option value="Offer">Offer</option>
                            </select>
                          </td>

                          {/* Notes */}
                          <td className="px-3 py-2.5 border-r border-stone-200">
                            <input
                              value={app.notes}
                              onChange={(e) => updateApplication(app.id, "notes", e.target.value)}
                              placeholder="notes…"
                              className="bg-transparent text-xs w-full focus:outline-none placeholder:text-stone-300 min-w-[100px]"
                            />
                          </td>

                          {/* Expand toggle */}
                          <td className="px-3 py-2.5 text-center">
                            <button onClick={() => toggleExpand(app.id)} className="text-stone-400 hover:text-stone-900 transition">
                              {expandedApps[app.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded row: extra dates + contacts */}
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
                                        <th key={h} className="text-left px-3 py-1.5 text-[10px] uppercase tracking-widest font-normal border-r border-stone-300 last:border-r-0 whitespace-nowrap">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {app.contacts.map((c) => {
                                      const cd = daysSince(c.sentAt);
                                      return (
                                        <tr key={c.id} className="border-t border-stone-200 bg-white">
                                          <td className="px-3 py-1.5 border-r border-stone-200 whitespace-nowrap">{c.name || <span className="italic text-stone-400">unnamed</span>}</td>
                                          <td className="px-3 py-1.5 border-r border-stone-200 uppercase tracking-wider text-stone-500 whitespace-nowrap">{ROLES.find((r) => r.id === c.role)?.label}</td>
                                          <td className="px-3 py-1.5 border-r border-stone-200">
                                            {c.linkedInUrl ? <a href={c.linkedInUrl} target="_blank" rel="noreferrer" className="text-red-800 hover:underline flex items-center gap-1"><Link2 className="w-3 h-3" />profile</a> : <span className="text-stone-300">—</span>}
                                          </td>
                                          <td className="px-3 py-1.5 border-r border-stone-200 text-stone-400 whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.sentAt}</td>
                                          <td className={`px-3 py-1.5 border-r border-stone-200 text-center font-bold ${cd >= 5 ? "text-red-700" : "text-stone-600"}`}>{cd}d</td>
                                          <td className="px-3 py-1.5 text-center">
                                            {c.messageSent
                                              ? <button onClick={() => copy(c.messageSent, c.id)} className="inline-flex items-center gap-1 text-stone-600 hover:text-red-800">
                                                  {copiedId === c.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                  {copiedId === c.id ? "copied" : "copy"}
                                                </button>
                                              : <span className="text-stone-300">—</span>}
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
      )}

      {/* ── DASHBOARD ── */}
      {view === "dashboard" && (
        <main className="max-w-6xl mx-auto px-6 py-10">
          {/* Header row */}
          <div className="flex items-center justify-between mb-8 border-b border-stone-400 pb-2">
            <h2 className="text-2xl" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>Dashboard</h2>
            <select
              value={dashboardRange}
              onChange={(e) => { setDashboardRange(e.target.value); setDashboardSummary(null); }}
              className="border border-stone-900 bg-stone-100 px-3 py-2 text-xs uppercase tracking-wider focus:outline-none cursor-pointer"
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="border-2 border-stone-900 bg-stone-50 px-6 py-5">
              <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Applications</div>
              <div className="text-5xl font-bold" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>
                {dashboardData.totalApps}
              </div>
            </div>
            <div className="border-2 border-stone-900 bg-stone-50 px-6 py-5">
              <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">People Contacted</div>
              <div className="text-5xl font-bold" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>
                {dashboardData.totalContacts}
              </div>
            </div>
          </div>

          {/* Charts */}
          {dashboardData.chartData.length === 0 ? (
            <div className="text-center py-20 text-stone-500 italic">No application data yet.</div>
          ) : (
            <div className="space-y-8">
              {/* Applications chart */}
              <div className="border-2 border-stone-900 bg-stone-50 px-6 pt-5 pb-4">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-5">Applications Over Time</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dashboardData.chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", fill: "#78716c" }}
                      axisLine={false}
                      tickLine={false}
                      interval={dashboardRange === "7d" ? 0 : dashboardRange === "14d" ? 1 : dashboardRange === "30d" ? 4 : 13}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", fill: "#78716c" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ border: "1px solid #1c1917", borderRadius: 0, fontSize: 12, fontFamily: "inherit", background: "#fafaf9" }}
                      cursor={{ fill: "#e7e5e4" }}
                      formatter={(val) => [val, "Applications"]}
                    />
                    <Bar dataKey="applications" fill="#1c1917" radius={[2, 2, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* People Contacted chart */}
              <div className="border-2 border-stone-900 bg-stone-50 px-6 pt-5 pb-4">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-5">People Contacted Over Time</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dashboardData.chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", fill: "#78716c" }}
                      axisLine={false}
                      tickLine={false}
                      interval={dashboardRange === "7d" ? 0 : dashboardRange === "14d" ? 1 : dashboardRange === "30d" ? 4 : 13}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", fill: "#78716c" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ border: "1px solid #1c1917", borderRadius: 0, fontSize: 12, fontFamily: "inherit", background: "#fafaf9" }}
                      cursor={{ fill: "#e7e5e4" }}
                      formatter={(val) => [val, "People Contacted"]}
                    />
                    <Bar dataKey="contacts" fill="#9f1239" radius={[2, 2, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* AI Summary */}
          <div className="mt-8 border-t border-stone-300 pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Summary</div>
              <button
                onClick={generateDashboardSummary}
                disabled={generatingSummary || applications.length === 0}
                className="px-4 py-1.5 bg-stone-900 text-stone-100 text-xs uppercase tracking-widest hover:bg-red-800 disabled:opacity-50 transition"
              >
                {generatingSummary ? "Writing…" : dashboardSummary ? "Regenerate" : "Generate Summary"}
              </button>
            </div>
            {dashboardSummary && (
              <p className="text-sm text-stone-700 leading-relaxed border-l-4 border-stone-900 pl-4 italic">
                {dashboardSummary}
              </p>
            )}
            {!dashboardSummary && !generatingSummary && (
              <p className="text-xs text-stone-400 italic">Click Generate Summary for an AI overview of your activity.</p>
            )}
          </div>
        </main>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-stone-900/60 z-40 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-stone-100 border-2 border-stone-900 max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-stone-400 pb-2">
              <h3 className="text-xl" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>Settings</h3>
              <button onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></button>
            </div>
            <label className="block mb-4">
              <span className="text-xs uppercase tracking-[0.2em] text-stone-500 flex items-center gap-2"><Key className="w-3 h-3" /> OpenAI API Key</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-…"
                className="mt-1 w-full border border-stone-900 bg-stone-50 px-3 py-2 text-sm focus:outline-none"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
              <span className="text-[10px] text-stone-500 italic">Stored in memory only. Cleared when you close the tab.</span>
            </label>
            <label className="block mb-4">
              <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Your School / University <span className="normal-case italic text-stone-400">(optional)</span></span>
              <input
                value={userSchool}
                onChange={(e) => setUserSchool(e.target.value)}
                placeholder="e.g. University of Michigan"
                className="mt-1 w-full border border-stone-900 bg-stone-50 px-3 py-2 text-sm focus:outline-none"
              />
              <span className="text-[10px] text-stone-500 italic">Used to find alumni at target companies.</span>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Your LinkedIn Profile / Background</span>
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
      )}

      <footer className="max-w-6xl mx-auto px-6 py-8 mt-12 border-t border-stone-400 text-xs uppercase tracking-widest text-stone-500 text-center">
        ※ Session-only storage · Export your tracker before closing
      </footer>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="flex items-baseline gap-4 mb-4 border-b border-stone-400 pb-2">
      <h2 className="text-2xl" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>{title}</h2>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, className = "" }) {
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

const SECTION_COLORS = [
  "border-l-red-800",
  "border-l-amber-600",
  "border-l-blue-700",
  "border-l-stone-700",
  "border-l-green-700",
  "border-l-violet-700",
  "border-l-stone-900",
];

function ResumeCheckOutput({ text, onCopy, copied }) {
  // Split on numbered section headers like "1. PRIORITY KEYWORDS TO ADD"
  const sections = text.split(/(?=\n?\d+\.\s+[A-Z][A-Z\s]+)/).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-stone-500">Analysis</div>
        <button onClick={onCopy} className="flex items-center gap-1 text-xs text-stone-500 hover:text-red-800 border border-stone-300 px-2 py-1">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>
      {sections.map((section, i) => {
        const lines = section.trim().split("\n");
        const header = lines[0].trim();
        const body = lines.slice(1).join("\n").trim();
        return (
          <div key={i} className={`border border-stone-300 border-l-4 ${SECTION_COLORS[i % SECTION_COLORS.length]} bg-white`}>
            <div className="px-4 py-2 border-b border-stone-200 bg-stone-50">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800">{header}</span>
            </div>
            <pre className="px-4 py-3 text-sm text-stone-800 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "inherit" }}>
              {body}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

function GenBox({ title, subtitle, onGenerate, generating, content, onCopy, copied }) {
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
        <button onClick={onCopy} className="mt-3 self-end flex items-center gap-1 text-xs text-stone-600 hover:text-red-800">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}
