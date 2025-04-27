# HALO – Health Automated Logging Operator

> **AI-Powered Clinical Charting System** for Modern Hospitals

---

## 🚀 Project Overview
HALO is a progressive web app (PWA) designed to assist nurses during patient visits by:
- Transcribing real-time conversations (via speech-to-text)
- Highlighting clinical keywords
- Auto-generating DAR (Data, Action, Response) nursing notes
- Exporting polished PDFs
- Sending clinical notes to FHIR-compatible hospital systems

✅ Works offline  
✅ Installable on tablets and laptops  
✅ HIPAA-conscious design (no PII storage, no external databases)

---

## 🏥 Why HALO?

Traditional clinical charting is:
- Time-consuming
- Manual
- Prone to documentation gaps

**HALO revolutionizes bedside documentation**  
by making it **real-time, structured, and simple** — without replacing or overriding a hospital’s EHR.

---

## 🔥 Core Features

| Feature | Description |
|:---|:---|
| 🎤 Voice-to-Text Chat | Capture real patient/nurse conversations |
| ✏️ Live Keyword Highlighting | Highlight clinical terms in real-time |
| 📄 AI DAR Note Generation | One-click structured nursing notes |
| 📥 PDF Export | Export visits into branded, polished PDFs |
| 🌐 FHIR Integration | Export notes directly into FHIR DocumentReference |
| 📱 PWA Installation | Install HALO on any device like an app |
| 🔒 Offline Support | Full offline fallback and recovery |

---

## 🛠 Technical Architecture

| Layer | Tech Stack |
|:---|:---|
| Frontend | React, Vite, TailwindCSS |
| Backend | Python Flask (OpenAI integration) |
| Hosting | Netlify (frontend), Render (backend) |
| Database | Firebase (Auth + Firestore) |
| Standards | HL7 FHIR DocumentReference |

---

🛡️ HIPAA-Safe Design
No direct patient identifiers (name, SSN, etc.) stored externally.

Full control over patient sessions per hospital system.

Easy on-premise deployment.

Secure external API communication with CORS and HTTPS.

## 📦 Installation

**Frontend (React App): / Backend (Flask Server)**
```bash
git clone https://github.com/ScrewVolt/halo-frontend.git
cd halo-frontend
npm install
npm run dev

```bash
cd halo-backend
pip install -r requirements.txt
python app.py

📚 Documentation Status
✅ Complete
✅ Mobile optimized
✅ Offline fallback tested
✅ Sandbox-ready FHIR JSON

🎯 License
HALO is provided as an open-source hospital-supportive system
for non-commercial pilot testing purposes.
Contact magj09@icloud.com for pilot partnership opportunities.

✨ Credits
Developed by Miguel Angel Garza Jr.

HALO Innovation Team

Special thanks to our local hospital feedback providers!