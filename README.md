e · MD
Copy

# ApplyPilot — The Application Desk
 
A local-first, AI-assisted job application manager built with React + Vite. ApplyPilot helps you track every application, match your resumes to job descriptions, draft outreach messages to recruiters and hiring managers, and visualize your job search pipeline — all in the browser, with your data stored locally.
 
---
 
## What It Does
 
ApplyPilot is organized into three main views:
 
### 1. Compose
The workspace where you prepare and log a new job application. It has three sections:
 
- **Role Section** — paste in a job link, title, company name, and job description
- **Resume Section** — manage multiple resumes and run an AI-powered match against the job description to see how well your resume fits
- **Outreach Section** — generate AI-drafted LinkedIn messages to hiring managers, recruiters, or employees at the company. You can log each contact and the message sent to them.
Once you're done, clicking **"Applied to This Job — Save to Tracker"** saves the full record (job details + contacts + outreach) to your tracker.
 
### 2. Tracker
A sortable, editable table of all your applications. You can update statuses (`Applied`, `In Progress`, `Closed`), log follow-up dates, mark responses received, set outcomes (`Interview`, `Offer`, `Rejected`, `No Response`), and add notes — all inline.
 
### 3. Dashboard
A visual analytics view of your job search, built with Recharts. Charts and stats summarize your application activity, response rates, outcomes, and pipeline health.
 
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| AI (cover letter / resume match / outreach) | OpenAI API (GPT via `VITE_OPENAI_API_KEY`) |
| Storage | Browser `localStorage` (fully local, no backend) |
| Font | Libre Caslon Text / Display + JetBrains Mono |
 
---
 
## Project Structure
 
```
applypilot/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── sample-data.json          # Sample applications for demo/testing
├── .env                      # Your local environment variables (git-ignored)
├── .env.example              # Template for required env vars
└── src/
    ├── main.jsx              # App entry point
    ├── App.jsx               # Root component — layout, routing between views, state
    ├── constants.js          # Shared constants (contact role types)
    ├── index.css             # Tailwind base styles
    ├── App.css               # Root layout styles
    ├── components/
    │   ├── RoleSection.jsx       # Job details input form
    │   ├── ResumeSection.jsx     # Resume manager + AI match
    │   ├── OutreachSection.jsx   # Contact drafting + logging
    │   ├── TrackerTable.jsx      # Application tracker table
    │   ├── DashboardView.jsx     # Analytics/charts view
    │   └── SettingsModal.jsx     # API key, LinkedIn profile, school settings
    └── utils/
        └── storage.js            # localStorage read/write helpers
```
 
---
 
## Getting Started
 
### Prerequisites
 
- Node.js 18+
- An OpenAI API key (for AI-powered resume matching and outreach drafting)
### Installation
 
```bash
git clone https://github.com/Sree-lekshmi99/Apply-pilot-automation.git
cd Apply-pilot-automation
npm install
```
 
### Environment Setup
 
Copy the example env file and add your OpenAI key:
 
```bash
cp .env.example .env
```
 
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```
 
You can also set your API key at runtime in the **Settings** modal inside the app.
 
### Run Locally
 
```bash
npm run dev
```
 
Open [http://localhost:5173](http://localhost:5173) in your browser.
 
### Build for Production
 
```bash
npm run build
npm run preview
```
 
---
 
## Loading Sample Data
 
A `sample-data.json` file is included with 100 realistic application records across companies like Stripe, Vercel, Notion, GitHub, Replit, and more. You can import this through the app's settings or tracker to explore the UI with real-looking data.
 
---
 
## Settings
 
Click **Settings** in the header to configure:
 
- **OpenAI API Key** — required for AI features (resume matching, outreach drafting)
- **LinkedIn Profile URL** — used to personalize outreach message generation
- **School / University** — optionally used for alumni-aware outreach
All settings are stored locally in your browser.
 
---
 
## Data & Privacy
 
> ※ All data is saved locally in your browser's `localStorage`. Nothing is sent to any server except OpenAI API calls when you use AI features. Export your data before clearing browser storage.
 
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
