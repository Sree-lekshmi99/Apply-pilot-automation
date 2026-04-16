import { useState, useEffect } from "react";
import { AlertCircle, X, Send } from "lucide-react";
import { loadApplications, saveApplications } from "./utils/storage";
import RoleSection from "./components/RoleSection";
import ResumeSection from "./components/ResumeSection";
import OutreachSection from "./components/OutreachSection";
import TrackerTable from "./components/TrackerTable";
import DashboardView from "./components/DashboardView";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || "");
  const [linkedInProfile, setLinkedInProfile] = useState("");
  const [userSchool, setUserSchool] = useState("");

  const [jobLink, setJobLink] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [resumes, setResumes] = useState([]);
  const [matchResult, setMatchResult] = useState(null);
  const [contacts, setContacts] = useState([]);

  const [applications, setApplications] = useState(loadApplications);
  const [error, setError] = useState("");
  const [view, setView] = useState("compose");
  const [showSettings, setShowSettings] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    saveApplications(applications);
  }, [applications]);

  const addContact = (role, message) => {
    setContacts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        role: role || "hiring_manager",
        linkedInUrl: "",
        messageSent: message || "",
        sentAt: new Date().toISOString().slice(0, 10),
      },
    ]);
  };

  const updateContact = (id, field, value) =>
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const removeContact = (id) => setContacts((prev) => prev.filter((c) => c.id !== id));

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
    setJobLink("");
    setJobTitle("");
    setCompanyName("");
    setJobDescription("");
    setMatchResult(null);
    setContacts([]);
    setError("");
    setSessionKey((k) => k + 1);
  };

  return (
    <div
      className="min-h-screen bg-stone-100 text-stone-900"
      style={{ fontFamily: "'Libre Caslon Text', Georgia, serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Libre+Caslon+Display&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <header className="border-b-2 border-stone-900 bg-stone-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1
            className="text-3xl leading-none"
            style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}
          >
            The Application Desk
          </h1>
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
            <button onClick={() => setError("")} className="text-red-900 hover:opacity-60">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {view === "compose" && (
        <main className="max-w-6xl mx-auto px-6 py-10">
          <RoleSection
            apiKey={apiKey}
            jobLink={jobLink} setJobLink={setJobLink}
            jobTitle={jobTitle} setJobTitle={setJobTitle}
            companyName={companyName} setCompanyName={setCompanyName}
            jobDescription={jobDescription} setJobDescription={setJobDescription}
            setError={setError}
          />
          <ResumeSection
            apiKey={apiKey}
            resumes={resumes} setResumes={setResumes}
            jobTitle={jobTitle} companyName={companyName} jobDescription={jobDescription}
            matchResult={matchResult} setMatchResult={setMatchResult}
            setError={setError}
            sessionKey={sessionKey}
          />
          <OutreachSection
            apiKey={apiKey}
            jobTitle={jobTitle} companyName={companyName} jobDescription={jobDescription}
            resumes={resumes} matchResult={matchResult}
            linkedInProfile={linkedInProfile} userSchool={userSchool}
            contacts={contacts}
            onAddContact={addContact}
            onUpdateContact={updateContact}
            onRemoveContact={removeContact}
            setError={setError}
            sessionKey={sessionKey}
          />

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
        <TrackerTable
          applications={applications}
          setApplications={setApplications}
          setError={setError}
        />
      )}

      {view === "dashboard" && <DashboardView applications={applications} />}

      {showSettings && (
        <SettingsModal
          apiKey={apiKey} setApiKey={setApiKey}
          linkedInProfile={linkedInProfile} setLinkedInProfile={setLinkedInProfile}
          userSchool={userSchool} setUserSchool={setUserSchool}
          onClose={() => setShowSettings(false)}
        />
      )}

      <footer className="max-w-6xl mx-auto px-6 py-8 mt-12 border-t border-stone-400 text-xs uppercase tracking-widest text-stone-500 text-center">
        ※ Data saved locally · Export before clearing browser storage
      </footer>
    </div>
  );
}
