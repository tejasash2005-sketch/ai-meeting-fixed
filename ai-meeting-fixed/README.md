# 🎙️ AI Meeting Intelligence v2
### Advanced Platform with Live Meetings, AI Modules, and Full Bug Fixes

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- **Node.js** 18+ — https://nodejs.org
- **MongoDB** — choose ONE:
  - **Local:** Install from https://www.mongodb.com/try/download/community
  - **Free Cloud (Recommended):** Create free cluster at https://cloud.mongodb.com

---

## Step 1 — Install MongoDB (Free Cloud, easiest)

1. Go to **https://cloud.mongodb.com** → Sign up free
2. Create a free M0 cluster → Choose any region
3. Create a database user (username + password)
4. Network Access → Add IP → **0.0.0.0/0** (allow all)
5. Get connection string: **Connect → Drivers → Copy string**
6. Paste into `backend/.env` as `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ai_meeting`

---

## Step 2 — Configure the App

Edit **`backend/.env`**:
```env
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASS@cluster.mongodb.net/ai_meeting_intelligence
JWT_SECRET=any_long_random_string_here
```

Everything else is optional. The app runs fully without OpenAI, Redis, or SMTP.

---

## Step 3 — Install & Run

### Option A — One Command (recommended)
```bash
# Mac / Linux
cd ai-meeting-fixed
chmod +x start.sh && ./start.sh

# Windows — double-click start.bat
```

### Option B — Manual
```bash
# Terminal 1 — Backend
cd ai-meeting-fixed/backend
npm install
npm run seed        # Creates demo accounts
npm run dev

# Terminal 2 — Frontend
cd ai-meeting-fixed/frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

---

## 🔑 Demo Accounts

| Role  | Email             | Password     |
|-------|-------------------|--------------|
| Admin | admin@demo.com    | password123  |
| User  | jane@demo.com     | password123  |

---

## 🤖 AI Features Setup (All Free)

### Groq API — for AI Coach, Agenda Builder, Insights, Action Extractor
1. Go to **https://console.groq.com**
2. Sign up free (Google login works)
3. API Keys → Create API Key (starts with `gsk_`)
4. In the app: paste key in the 🔑 box on any AI page
5. Key saves to browser automatically

### OpenAI API — for Transcription + Summaries (optional)
1. Go to **https://platform.openai.com** ($5 free credit)
2. API Keys → Create new key
3. Add to `backend/.env`: `OPENAI_API_KEY=sk-...`
4. **Without this key:** App uses realistic mock transcriptions/summaries

---

## 🎥 Live Meeting Feature (Zoom-style)

### How to host a meeting:
1. Click **"Live Meetings"** in sidebar
2. Click **"New Meeting"** → enter title → Create
3. Share the **9-character room code** with participants
4. Click the room → camera/mic starts → meeting begins

### How to join:
1. Click **"Join with Code"**
2. Enter the 9-character code from host
3. Click **"Join Now"**

### Features:
- 📹 Camera + microphone controls
- 💬 Real-time in-meeting chat
- 👥 Participant list
- ✋ Raise hand
- 🔒 Optional password protection
- 📋 After meeting → upload recording for AI analysis

---

## 🧠 4 New AI Modules

| Module | Path | What it does |
|--------|------|--------------|
| **AI Coach** | `/ai-coach` | Chat with AI for meeting improvement tips |
| **Agenda Builder** | `/agenda` | Generate time-boxed agendas from templates |
| **Meeting Insights** | `/insights` | Analytics + AI pattern analysis |
| **Action Tracker** | `/action-tracker` | Track tasks + AI extracts from text |

---

## 🐛 Bugs Fixed in v2

| Bug | Fix |
|-----|-----|
| Admin panel shows lines/boxes | AdminLayout completely rebuilt |
| Upload meeting not working | Fixed async processing + error handling |
| Redis crash on startup | Redis is now optional |
| Notification count API 404 | Proper notifications route created |
| Modules 8-15 stub routes broken | Fixed export structure |
| Team model missing Notification | Added Notification schema |
| No meeting creation without upload | Create meeting → upload separately |
| Missing page-title in admin pages | Fixed CSS class in globals |

---

## 📁 Project Structure

```
ai-meeting-fixed/
├── backend/
│   ├── src/
│   │   ├── models/       — MongoDB schemas (Meeting, User, Task, LiveRoom…)
│   │   ├── routes/       — API endpoints (meetings, live, notifications…)
│   │   ├── services/     — AI processing, email
│   │   ├── middleware/   — Auth, upload, rate limiting
│   │   └── server.js     — Express + Socket.IO server
│   ├── uploads/          — Uploaded recordings
│   └── .env              — Config (edit this!)
└── frontend/
    └── src/
        ├── pages/
        │   ├── user/     — All user pages including 4 new AI modules
        │   └── admin/    — Admin dashboard, users, meetings, system
        ├── components/   — Shared layout, admin layout
        └── services/     — API client (axios)
```

---

## ⚡ Troubleshooting

| Problem | Solution |
|---------|----------|
| `MongoServerError: connect ECONNREFUSED` | Start MongoDB locally or use MongoDB Atlas |
| `Cannot find module` | Run `npm install` in both backend/ and frontend/ |
| Camera not working in Live Meeting | Allow camera/mic permission in browser |
| AI says "enter API key" | Paste Groq key (`gsk_…`) in the key box on AI pages |
| Port 5000 in use | Change `PORT=5001` in backend/.env |
| Port 3000 in use | Add `--port 3001` to frontend dev script |
| Admin panel empty/white | Log in with admin@demo.com and run `npm run seed` |

