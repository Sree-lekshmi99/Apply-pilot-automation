# ApplyPilot — The Application Desk
apply_pilot.mp4
A local-first, AI-powered job application manager built with React + Vite. ApplyPilot helps you go from job link to sent application in one place scraping the job, matching your resume, improving it, drafting outreach, finding the right people on LinkedIn, answering application questions, and tracking everything with visual accountability.
 
---
 
## Features
 
### 1. Job Scraper
Paste any job posting URL and ApplyPilot fetches the page via the Jina Reader API, then uses OpenAI to auto-extract the job title, company name, and full job description. No copy-pasting required. You can also fill in the fields manually.
 
### 2. Resume Matching
Upload one or more resume PDFs. ApplyPilot uses OpenAI to compare all of them against the job description and pick the best-matching one with a score out of 100 and a short explanation of why it was chosen.
 
### 3. Resume Improvements
Get a detailed, ATS-focused resume review for the target role. The AI compares your resume against the job description and gives you:
- Priority keywords to add
- Skills section changes
- Title clarifications
- Bullet-by-bullet rewrites (keep, rewrite, add, remove)
- Missing exact-match terms already supported by your experience
- Summary changes
- A final edit checklist
Nothing is fabricated  only existing experience is reframed to better match the job description's language. Supports optional custom instructions (e.g. "I'm a career changer from finance" or "focus on leadership keywords").
 
### 4. Outreach Messages
Generates three ready-to-send messages:
- **Connection Note** — under 280 characters, no AI, for a first LinkedIn touch
- **Formal Introduction** — email-style message for after you've applied, grounded entirely in your resume
- **Referral Request** — a low-pressure LinkedIn ask for a referral, personalized to the role
### 5. Find People on LinkedIn
Generates 5 targeted LinkedIn people-search links using the scraped company name and job title:
1. Recruiter
2. Hiring Manager
3. Same-function Employee
4. Alumni (uses your school from Settings)
5. Talent Acquisition / HR
Each result shows the contact type, why they're worth reaching out to, the search terms used, and a direct link to open the LinkedIn search.
 
### 6. Application Questions
Paste any question from an application form like "Why do you want to work here?", "Describe a challenge you overcame", cover letter prompts and get a concise, first-person, resume-backed answer. Supports optional custom instructions for word limits, tone, or focus areas.
 
### 7. Application Tracker
A full inline-editable table of all your saved applications. Tracks:
- Job title (linked to the job posting), company, applied date
- Days since applied (auto-calculated)
- Status: Applied / In Progress / Withdrawn / Closed
- Follow-up checkbox and date
- Response received checkbox and date
- Outcome: No Response / Rejected / Interview / Offer (color-coded)
- Notes
- Expandable row with all logged contacts: name, role, LinkedIn, message sent, days since contact
Supports Import JSON, Export JSON, and Export CSV.
 
### 8. Dashboard
A Recharts bar chart showing your application and outreach activity over time. Filterable by last 7, 14, 30, 90 days, or all time. Displays total applications filed and total people contacted.
 
### 9. Visual Accountability (Color Coding)
The tracker uses row background color to remind you to take action on stale applications:
- **Gray** — Day 3 with no follow-up, response, or outcome logged → follow up soon
- **Red** — Day 6 with no activity → check status, you may be ghosted
Once any action is logged (follow-up, response, or outcome), the color clears.
 
---
 
## Settings
- **OpenAI API Key** — stored in memory only, cleared on tab close
- **Your School / University** — used to include alumni in LinkedIn people-search
- **Your LinkedIn Profile / Background** — paste your bio or headline; used to personalize outreach messages
---
 
## Tech Stack
 
| | |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| AI | OpenAI API (GPT) |
| Job Scraping | Jina Reader API (`r.jina.ai`) |
| Storage | Browser `localStorage` — no backend |
| Font | Libre Caslon Text / Display + JetBrains Mono |
 
---
 
## Project Structure
 
```
applypilot/
├── .env                        # Local env vars (git-ignored)
├── .env.example                # Template
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── sample-data.json            # 100 sample applications for demo/testing
└── src/
    ├── main.jsx
    ├── App.jsx                 # Root layout, view routing, global state
    ├── constants.js            # Contact role types
    ├── index.css
    ├── components/
    │   ├── RoleSection.jsx         # § 01 — Job URL scraper + manual fields
    │   ├── ResumeSection.jsx       # § 02 — Resume match · § 03 — Resume check
    │   ├── OutreachSection.jsx     # § 04 — Outreach · § 05 — Find People
    │   │                           # § 06 — Contacts · § 07 — App Questions
    │   ├── TrackerTable.jsx        # Tracker with color coding, import/export
    │   ├── DashboardView.jsx       # Analytics bar chart
    │   ├── SettingsModal.jsx       # API key, school, LinkedIn profile
    │   └── ui.jsx                  # Shared components (SectionHeader, Field, GenBox, ResumeCheckOutput)
    └── utils/
        ├── api.js                  # callOpenAI + extractPdfText helpers
        ├── analytics.js            # computeDashboardData + daysSince
        └── storage.js              # localStorage load/save + exportJSON/CSV/importJSON
```
 
---
 
## Getting Started
 
### Prerequisites
- Node.js 18+
- An OpenAI API key
### Installation
 
```bash
git clone https://github.com/Sree-lekshmi99/Apply-pilot-automation.git
cd Apply-pilot-automation
npm install
```
 
### Environment Setup
 
```bash
cp .env.example .env
```
 
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```
 
You can also enter your API key at runtime in the Settings modal and it stays in memory only and is never persisted to disk.
 
### Run Locally
 
```bash
npm run dev
```
 
Open [http://localhost:5173](http://localhost:5173).
 
### Build for Production
 
```bash
npm run build
npm run preview
```
 
---
 
## Sample Data
 
A `sample-data.json` file with 100 realistic applications is included. Import it via the Tracker's **Import JSON** button to explore the UI with pre-filled data.
 
---
 
## Data & Privacy
 
> ※ All application data is saved in your browser's `localStorage`. Nothing is sent to any server except OpenAI API calls when you use AI features, and Jina Reader when you scrape a job URL. Export your data before clearing browser storage.
 
---
 
## Scripts
 
| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
 
---
 
## Author
 
**Sree Lekshmi** — [GitHub](https://github.com/Sree-lekshmi99)
