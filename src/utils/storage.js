import { ROLES } from "../constants";

const STORAGE_KEY = "applypilot_applications";
const SCHEMA_VERSION = 1;

export function loadApplications() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveApplications(applications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

export function exportJSON(applications) {
  const payload = {
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    applications,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `applications-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        let applications;
        if (Array.isArray(parsed)) {
          applications = parsed;
        } else if (parsed.version && Array.isArray(parsed.applications)) {
          applications = parsed.applications;
        } else {
          throw new Error("Unrecognized JSON format.");
        }
        resolve(applications);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsText(file);
  });
}

export function exportCSV(applications, daysSince) {
  const rows = [
    [
      "Job Title", "Company", "Job Link", "Applied On", "Status",
      "Last Contact Date", "Followed Up", "Follow-up Date",
      "Response Received", "Response Date", "Outcome", "Notes",
      "Contact Name", "Contact Role", "LinkedIn URL", "Message Sent On",
      "Days Since Contact", "Message",
    ],
  ];
  applications.forEach((app) => {
    const base = [
      app.jobTitle, app.companyName, app.jobLink, app.appliedAt,
      app.status, app.lastContactDate, app.followedUp ? "Yes" : "No",
      app.followUpDate, app.responseReceived ? "Yes" : "No",
      app.responseDate, app.outcome, app.notes,
    ];
    if (app.contacts.length === 0) {
      rows.push([...base, "", "", "", "", "", ""]);
    } else {
      app.contacts.forEach((c) => {
        rows.push([
          ...base,
          c.name,
          ROLES.find((r) => r.id === c.role)?.label || c.role,
          c.linkedInUrl,
          c.sentAt,
          String(daysSince(c.sentAt)),
          (c.messageSent || "").replace(/\n/g, " "),
        ]);
      });
    }
  });
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
