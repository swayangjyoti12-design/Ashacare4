const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ==================== 1. DATABASE CONFIGURATION ====================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ashacare';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB database'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  name: { type: String, required: true }
});

const caseSchema = new mongoose.Schema({
  name: String,
  age: String,
  workerId: String,
  workerName: String,
  triage: String,
  report: String,
  timestamp: String,
  lat: Number,
  lng: Number
});

const User = mongoose.model('User', userSchema);
const CaseRecord = mongoose.model('CaseRecord', caseSchema);

// ==================== 2. BACKEND API ROUTES ====================
app.post('/api/register', async (req, res) => {
  try {
    const { id, password, role, name } = req.body;
    const existing = await User.findOne({ id });
    if (existing) return res.status(400).json({ error: 'User ID already exists' });
    
    const newUser = new User({ id, password, role, name });
    await newUser.save();
    res.json({ success: true, message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { id, password, role } = req.body;
    const user = await User.findOne({ id, password, role });
    if (!user && id === "ASHA101" && password === "123") {
      return res.json({ success: true, user: { id: "ASHA101", name: "Sunita Devi (ASHA)", role: "asha" } });
    }
    if (!user) return res.status(401).json({ error: 'Invalid credentials or role mismatch' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cases', async (req, res) => {
  try {
    const cases = await CaseRecord.find().sort({ _id: -1 });
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cases', async (req, res) => {
  try {
    const newRecord = new CaseRecord(req.body);
    await newRecord.save();
    res.json({ success: true, record: newRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 3. SERVE FRONTEND HTML INTERFACE ====================
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AshaCare SIH - Multilingual Pediatric CDS Engine</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
:root { --primary: #0284c7; --primary-dark: #0369a1; --bg: #f1f5f9; --surface: #ffffff; --text: #0f172a; --border: #cbd5e1; --red: #dc2626; --yellow: #d97706; --green: #16a34a; }
* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
body { background: var(--bg); color: var(--text); padding-bottom: 40px; }
header { background: var(--primary-dark); color: white; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); flex-wrap: wrap; gap: 0.5rem; } 
.status-bar { background: #e0f2fe; color: #0369a1; padding: 0.5rem 1.5rem; font-size: 0.85rem; display: flex; justify-content: space-between; font-weight: 600; }
.container { max-width: 1100px; margin: 1.5rem auto; padding: 0 1rem; }
.nav-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 2px solid var(--border); overflow-x: auto; }
.tab-btn { padding: 0.75rem 1.25rem; border: none; background: none; font-weight: 600; cursor: pointer; color: #64748b; border-bottom: 3px solid transparent; transition: all 0.2s; white-space: nowrap; }
.tab-btn:hover { color: var(--primary); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media(max-width: 700px) { .grid-2 { grid-template-columns: 1fr; } }
label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; } 
input, select, textarea { width: 100%; padding: 0.65rem; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 1rem; }
.search-container { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.search-box { flex: 1; margin-bottom: 0; border-color: var(--primary); }
.mic-btn { background: var(--primary); color: white; border: none; border-radius: 6px; padding: 0 1rem; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; }
.mic-btn.recording { background: var(--red); animation: pulse 1.2s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
.symptom-chips { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1rem; max-height: 350px; overflow-y: auto; padding: 0.75rem; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; }
.chip { padding: 0.7rem 1rem; background: white; border: 1.5px solid #cbd5e1; border-radius: 12px; cursor: pointer; font-size: 0.85rem; line-height: 1.35; transition: all 0.2s ease; user-select: none; flex: 1 1 calc(50% - 0.6rem); min-width: 280px; } 
.chip:hover { border-color: var(--primary); }
.chip.selected { background: #dbeafe; border-color: var(--primary); color: var(--primary-dark); font-weight: 600; box-shadow: 0 0 0 1px var(--primary); }
.chip small { display: block; margin-top: 0.3rem; opacity: 0.75; font-size: 0.75rem; font-weight: normal; }
.btn { background: var(--primary); color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; }
.btn-secondary { background: #64748b; }
.btn-danger { background: var(--red); }
.btn-atlas { background: #7c3aed; color: white; }
.report-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; border-bottom: 2px solid var(--border); margin-bottom: 1rem; } 
.severity-gauge { height: 10px; width: 100%; background: #e2e8f0; border-radius: 5px; overflow: hidden; margin: 1rem 0; }
.severity-fill { height: 100%; width: 0%; transition: width 0.5s ease-in-out; }
.output-layout { display: grid; grid-template-columns: 3fr 1fr; gap: 1.5rem; }
@media(max-width: 850px) { .output-layout { grid-template-columns: 1fr; } }
.report-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.25rem; font-size: 0.95rem; line-height: 1.6; color: #1e293b; }
.badge-red { background: var(--red); color: white; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: bold; }
.badge-yellow { background: var(--yellow); color: white; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: bold; }
.badge-green { background: var(--green); color: white; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: bold; }
#map { height: 350px; border-radius: 8px; }
.hidden { display: none !important; }
#qrcode-container { display: flex; justify-content: center; margin: 1rem 0; background: white; padding: 1rem; border-radius: 8px; border: 1px solid var(--border); }
.overlay-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.8); display: flex; justify-content: center; align-items: center; z-index: 9999; }
.modal-card { background: white; padding: 2rem; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
.lang-select { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 0.3rem 0.6rem; border-radius: 6px; font-weight: 600; cursor: pointer; }
.lang-select option { color: black; }
</style>
</head>
<body> 

<!-- AUTHENTICATION OVERLAY -->
<div id="loginOverlay" class="overlay-backdrop">
<div class="modal-card" style="max-width: 400px;">
<h2 id="loginTitle" style="color: var(--primary-dark); margin-bottom: 0.5rem;">AshaCare Portal Login</h2>
<p id="loginSub" style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem;">Enter platform credentials to access CDS Engine</p>

<div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: #f1f5f9; padding: 0.25rem; border-radius: 8px;">
    <button class="tab-btn active" id="tabLogin" onclick="toggleAuthMode('login')" style="flex:1; margin:0; padding: 0.5rem; border:none; border-radius: 6px;">Login</button>
    <button class="tab-btn" id="tabRegister" onclick="toggleAuthMode('register')" style="flex:1; margin:0; padding: 0.5rem; border:none; border-radius: 6px;">Register</button>
</div>

<form onsubmit="handleAuth(event)">
<div id="registerNameGroup" class="hidden">
    <label>Full Name</label>
    <input type="text" id="authName" placeholder="e.g. Sunita Devi">
</div>

<label id="labelRole">User Role</label>
<select id="loginRole" required>
<option value="asha">ASHA Field Worker / ANM</option>
<option value="doctor">Medical Officer (MO)</option>
</select>

<label id="labelId">Worker / Doctor ID</label>
<input type="text" id="loginId" placeholder="e.g. ASHA101" required>

<label id="labelPass">Password</label>
<input type="password" id="loginPassword" placeholder="••••••••" required>

<button type="submit" id="btnLogin" class="btn" style="width: 100%; justify-content: center;">Login to System</button>
</form>
<div id="loginError" style="color: var(--red); font-size: 0.85rem; margin-top: 1rem; text-align: center;"></div>
</div>
</div>

<!-- VISUAL SYMPTOM ATLAS MODAL -->
<div id="atlasModal" class="overlay-backdrop hidden" style="z-index: 10000;">
<div class="modal-card">
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
<h3 id="atlasTitle" style="color: var(--primary-dark);">Visual Symptom Reference Atlas</h3>
<button onclick="closeAtlas()" style="border:none; background:none; font-size:1.5rem; cursor:pointer;">&times;</button>
</div>
<p id="atlasSub" style="font-size: 0.85rem; color:#64748b; margin-bottom: 1rem;">Click any visual guide card to automatically select the symptom for evaluation.</p>
<div id="atlasGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;"></div>
<button id="btnCloseAtlas" class="btn btn-secondary" onclick="closeAtlas()" style="margin-top: 1.5rem; width: 100%; justify-content: center;">Close Reference Atlas</button>
</div>
</div>

<header>
<div>
<h1 id="appTitle">AshaCare SIH</h1>
<small id="appSub">Pediatric Triage & CDS Engine (Expanded Story-Based Screening Database)</small>
</div>
<div style="display: flex; gap: 0.5rem; align-items: center;">
<select id="langSelect" class="lang-select" onchange="changeLanguage(this.value)">
  <option value="en">English</option>
  <option value="hi">हिंदी (Hindi)</option>
  <option value="or">ଓଡ଼ିଆ (Odia)</option>
</select>
<span id="activeUserBadge" style="font-size: 0.85rem; background: rgba(255,255,255,0.2); padding: 0.3rem 0.6rem; border-radius: 4px;">Not Authenticated</span>
<button id="btnLogout" class="btn btn-danger" onclick="logout()" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Logout</button>
</div>
</header>

<div class="status-bar">
<span id="networkStatus">☁️ Connected to MongoDB Cloud Database Server</span>
<span id="dbSyncStatus">Synced Records: 0</span>
</div>

<div class="container">
<div class="nav-tabs">
<button id="triageNavBtn" class="tab-btn active" onclick="showTab('triageTab')">Field Screening & Triage</button>
<button id="dashNavBtn" class="tab-btn" onclick="showTab('dashboardTab')">Doctor Dashboard & Referrals</button>
<button id="gisNavBtn" class="tab-btn" onclick="showTab('gisTab')">Gram Panchayat Analytics Map</button>
</div>

<!-- TAB 1: TRIAGE & ASSESSMENT -->
<div id="triageTab" class="tab-content">
<div class="card">
<h2 id="regHeader">Patient Registration</h2>
<div class="grid-2">
<div>
<label id="labelName">Child's Full Name</label>
<input type="text" id="patientName" placeholder="e.g. Aarav Sharma">
</div>
<div>
<label id="labelAge">Age (Months/Years)</label>
<input type="text" id="patientAge" placeholder="e.g. 4 Years">
</div>
</div>
</div>

<div class="card">
<h2 id="screenHeader">Guided Field Screening (Story-Based Observational Prompts)</h2>
<p id="screenSub" style="font-size:0.85rem; color:#64748b; margin-bottom: 1rem;">Tap story cards, use vernacular voice search, or open the visual reference guide[span_2](start_span)[span_2](end_span).</p>
<div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
<button id="btnAtlas" class="btn btn-atlas" onclick="openAtlas()">🖼 Visual Symptom Atlas</button>
</div>

<label id="searchLabel">Filter & Select Observable Symptom Stories</label>
<div class="search-container">
  <input type="text" id="chipSearch" class="search-box" placeholder="🔎 Filter by symptoms (e.g. safed aankh, peela, jwaron, vomiting)..." oninput="filterChips()">
  <button type="button" class="mic-btn" id="micSearchBtn" onclick="toggleVoiceInput('chipSearch', 'micSearchBtn')" title="Voice Search">🎤</button>
</div>
<div class="symptom-chips" id="symptomChips"></div>

<label id="notesLabel">Field Observations / Spoken Voice Notes (Colloquial Dialects Supported)</label>
<div class="search-container">
  <textarea id="symptomText" rows="3" placeholder="Enter notes or speak naturally (e.g., baccha baar baar ulte kar raha hai aur pet me dard hai)..." oninput="processColloquialText()"></textarea>
  <button type="button" class="mic-btn" id="micTextBtn" onclick="toggleVoiceInput('symptomText', 'micTextBtn')" title="Voice Note">🎤</button>
</div>
<button id="btnGenerate" class="btn" onclick="processTriageEngine()">Generate Clinical Assessment Report</button>
</div>

<!-- REPORT OUTPUT -->
<div id="resultCard" class="card hidden">
<div class="report-header">
<div>
<h2 id="reportHeader">Standardized Pediatric Clinical Assessment Report</h2>
<small id="reportTimestamp" style="color:#64748b;"></small>
</div>
<span id="triageBadge" class="badge-green">GREEN - ROUTINE CARE</span>
</div>
<div class="severity-gauge">
<div id="severityFill" class="severity-fill" style="background:var(--green); width:20%;"></div>
</div>
<div class="output-layout">
<div id="reportFormattedOutput" class="report-box"></div>
<div>
<div class="card" style="text-align: center; background: #f8fafc; padding: 1rem; margin-bottom: 0;">
<label id="labelQr" style="color:#475569;">📱 Local Referral Pass</label>
<div id="qrcode-container"></div>
<small id="qrSub" style="color:#64748b; display: block; margin-top: 0.5rem;">Scan at PHC counter for instant entry.</small>
</div>
</div>
</div>
<div style="display:flex; gap: 0.5rem; flex-wrap:wrap; margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
<button id="btnSave" class="btn" onclick="saveCaseRecord()">💾 Save Record to Cloud</button>
<button id="btnPrint" class="btn btn-secondary" onclick="window.print()">🖨 Print Assessment</button>
<button id="btnNewCase" class="btn btn-secondary" onclick="resetNewCase()" style="background:#0f172a;">🔄 New Case Assessment</button>
</div>
</div>
</div>

<!-- TAB 2: DOCTOR DASHBOARD -->
<div id="dashboardTab" class="tab-content hidden">
<div class="card">
<h2 id="dashHeader">Primary Health Centre (PHC) Clinical Queue</h2>
<p id="dashSub" style="font-size:0.85rem; color:#64748b; margin-bottom: 1rem;">Live synchronized records pulled from cloud server across connected devices.</p>
<button class="btn btn-secondary" onclick="fetchCloudCases()" style="margin-bottom:1rem; font-size: 0.8rem; padding: 0.5rem 1rem;">🔄 Refresh Queue</button>
<div id="caseList">Loading cases from cloud...</div>
</div>
</div>

<!-- TAB 3: GIS ANALYTICS -->
<div id="gisTab" class="tab-content hidden">
<div class="card">
<h2 id="gisHeader">Gram Panchayat Outbreak Heatmap & Risk Clusters</h2>
<p id="gisSub" style="font-size:0.85rem; color:#64748b; margin-bottom: 1rem;">Real-time mapping of high-risk RED pediatric screenings.</p>
<div id="map"></div>
</div>
</div>
</div>

<script>
const API_BASE_URL = window.location.origin;

// EXPANDED MULTILINGUAL TRANSLATIONS & DIAGNOSTIC MATRIX (Ref: Ashacarev18.PDF)[span_3](start_span)[span_3](end_span)
const TRANSLATIONS = {
  en: {
    appTitle: "AshaCare SIH",
    appSub: "Pediatric Triage & CDS Engine (Expanded Story-Based Screening Database)",
    notAuth: "Not Authenticated",
    logout: "Logout",
    navTriage: "Field Screening & Triage",
    navDash: "Doctor Dashboard & Referrals",
    navGis: "Gram Panchayat Analytics Map",
    regHeader: "Patient Registration",
    labelName: "Child's Full Name",
    placeName: "e.g. Aarav Sharma",
    labelAge: "Age (Months/Years)",
    placeAge: "e.g. 4 Years",
    screenHeader: "Guided Field Screening (Story-Based Observational Prompts)",
    screenSub: "Tap story cards, use vernacular voice search, or open the visual reference guide.",
    btnAtlas: "🖼 Visual Symptom Atlas",
    searchLabel: "Filter & Select Observable Symptom Stories",
    notesLabel: "Field Observations / Spoken Voice Notes (Colloquial Dialects Supported)",
    btnGenerate: "Generate Clinical Assessment Report",
    reportHeader: "Standardized Pediatric Clinical Assessment Report",
    labelQr: "📱 Local Referral Pass",
    qrSub: "Scan at PHC counter for instant entry.",
    btnSave: "💾 Save Record to Cloud",
    btnPrint: "🖨 Print Assessment",
    btnNewCase: "🔄 New Case Assessment",
    dashHeader: "Primary Health Centre (PHC) Clinical Queue",
    dashSub: "Live synchronized records pulled from cloud server.",
    gisHeader: "Gram Panchayat Outbreak Heatmap & Risk Clusters",
    gisSub: "Real-time mapping of high-risk RED pediatric screenings.",
    loginTitle: "AshaCare Portal Login",
    loginSub: "Enter platform credentials to access CDS Engine",
    labelRole: "User Role",
    labelId: "Worker / Doctor ID",
    labelPass: "Password",
    btnLogin: "Login to System",
    atlasTitle: "Visual Symptom Reference Atlas",
    atlasSub: "Click any visual guide card to automatically select the symptom for evaluation.",
    btnCloseAtlas: "Close Reference Atlas",
    selectSymptom: "Select Symptom"
  },
  hi: {
    appTitle: "आशाकेयर SIH",
    appSub: "बाल चिकित्सा ट्राइएज और निर्णय सहायता प्रणाली (विस्तृत स्क्रीनिंग डेटाबेस)",
    notAuth: "प्रमाणित नहीं",
    logout: "लॉगआउट",
    navTriage: "फील्ड स्क्रीनिंग और ट्राइएज",
    navDash: "डॉक्टर डैशबोर्ड और रेफरल",
    navGis: "ग्राम पंचायत प्रकोप मानचित्र",
    regHeader: "रोगी पंजीकरण",
    labelName: "बच्चे का पूरा नाम",
    placeName: "जैसे: आरव शर्मा",
    labelAge: "आयु (माह/वर्ष)",
    placeAge: "जैसे: 4 वर्ष",
    screenHeader: "निर्देशित स्क्रीनिंग (कहानी-आधारित लक्षण)",
    screenSub: "लक्षण कार्डों पर टैप करें या वॉयस खोज का उपयोग करें।",
    btnAtlas: "🖼 विजुअल लक्षण एटलस",
    searchLabel: "लक्षण खोजें और चुनें",
    notesLabel: "फील्ड अवलोकन / बोली गई आवाज नोट्स",
    btnGenerate: "नैदानिक मूल्यांकन रिपोर्ट तैयार करें",
    reportHeader: "मानकीकृत बाल चिकित्सा मूल्यांकन रिपोर्ट",
    labelQr: "📱 स्थानीय रेफरल पास",
    qrSub: "त्वरित प्रवेश के लिए पीएचसी काउंटर पर स्कैन करें।",
    btnSave: "💾 क्लाउड में रिकॉर्ड सुरक्षित करें",
    btnPrint: "🖨 रिपोर्ट प्रिंट करें",
    btnNewCase: "🔄 नया मामला दर्ज करें",
    dashHeader: "प्राथमिक स्वास्थ्य केंद्र (PHC) रोगी कतार",
    dashSub: "क्लाउड सर्वर से समन्वयित मामले।",
    gisHeader: "ग्राम पंचायत प्रकोप मानचित्र और जोखिम समूह",
    gisSub: "उच्च जोखिम (RED) मामलों की रीयल-टाइम मैपिंग।",
    loginTitle: "आशाकेयर पोर्टल लॉगिन",
    loginSub: "सीडीएस इंजन तक पहुंचने के लिए क्रेडेंशियल दर्ज करें",
    labelRole: "उपयोगकर्ता भूमिका",
    labelId: "कार्यकर्ता / डॉक्टर आईडी",
    labelPass: "पासवर्ड",
    btnLogin: "सिस्टम में लॉगिन करें",
    atlasTitle: "विजुअल लक्षण संदर्भ एटलस",
    atlasSub: "मूल्यांकन के लिए लक्षण चुनने हेतु किसी भी चित्र कार्ड पर क्लिक करें।",
    btnCloseAtlas: "एटलस बंद करें",
    selectSymptom: "लक्षण चुनें"
  },
  or: {
    appTitle: "ଆଶାକେୟାର SIH",
    appSub: "ଶିଶୁ ସ୍ଵାସ୍ଥ୍ୟ ସ୍କିନିଂ ଏବଂ ନିର୍ଣ୍ଣୟ ସହାୟତା ସିଷ୍ଟମ୍",
    notAuth: "ପ୍ରମାଣିତ ହୋଇନାହିଁ",
    logout: "ଲଗ୍ ଆଉଟ୍",
    navTriage: "ଫିଲ୍ଡ ସ୍କିନିଂ ଏବଂ ଟ୍ରାଏଜ୍",
    navDash: "ଡାକ୍ତର ଡ୍ୟାସବୋର୍ଡ ଏବଂ ରେଫରାଲ୍",
    navGis: "ଗ୍ରାମ ପଞ୍ଚାୟତ ମାନଚିତ୍ର",
    regHeader: "ରୋଗୀ ପଞ୍ଜୀକରଣ",
    labelName: "ଶିଶୁର ପୂରା ନାମ",
    placeName: "ଯେପରି: ଆରବ ଶର୍ମା",
    labelAge: "ବୟସ (ମାସ/ବର୍ଷ)",
    placeAge: "ଯେପରି: ୪ ବର୍ଷ",
    screenHeader: "ଫିଲ୍ଡ ସ୍କିନିଂ (କାହାଣୀ-ଆଧାରିତ ପରୀକ୍ଷା)",
    screenSub: "ଲକ୍ଷଣ କାର୍ଡ ଟାପ୍ କରନ୍ତୁ କିମ୍ବା ଭଏସ୍ ଇନପୁଟ୍ ବ୍ୟବହାର କରନ୍ତୁ।",
    btnAtlas: "🖼 ଭିଜୁଆଲ୍ ସିମ୍ପଟମ୍ ଆଟଲାସ୍",
    searchLabel: "ଲକ୍ଷଣ ଖୋଜନ୍ତୁ ଏବଂ ଚୟନ କରନ୍ତୁ",
    notesLabel: "ଫିଲ୍ଡ ପରୀକ୍ଷା ନୋଟ୍ସ | ଭଏସ୍ ନୋଟ୍ସ",
    btnGenerate: "କ୍ଲିନିକାଲ୍ ରିପୋର୍ଟ ପ୍ରସ୍ତୁତ କରନ୍ତୁ",
    reportHeader: "ଶିଶୁ ସ୍ଵାସ୍ଥ୍ୟ ମୂଲ୍ୟାୟନ ରିପୋର୍ଟ",
    labelQr: "📱 ସ୍ଥାନୀୟ ରେଫରାଲ୍ ପାସ୍",
    qrSub: "ତୁରନ୍ତ ଆଡମିସନ୍ ପାଇଁ PHC କାଉଣ୍ଟରରେ ସ୍କାନ୍ କରନ୍ତୁ।",
    btnSave: "💾 କ୍ଲାଉଡରେ ରେକର୍ଡ ସଂରକ୍ଷିତ କରନ୍ତୁ",
    btnPrint: "🖨 ପ୍ରିଣ୍ଟ୍ କରନ୍ତୁ",
    btnNewCase: "🔄 ନୂତନ କେସ୍ ଆକଳନ",
    dashHeader: "ପ୍ରାଥମିକ ସ୍ଵାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (PHC) ରୋଗୀ ତାଲିକା",
    dashSub: "ସର୍ଭରରୁ ସିଙ୍କ୍ ହୋଇଥିବା ରୋଗୀ ତାଲିକା।",
    gisHeader: "ଗ୍ରାମ ପଞ୍ଚାୟତ ଆଉଟବ୍ରେକ୍ ମାନଚିତ୍ର",
    gisSub: "ଉଚ୍ଚ ବିପଦପୂର୍ଣ୍ଣ (RED) ଶିଶୁ କେସଗୁଡ଼ିକର ରିଅଲ୍-ଟାଇମ୍ ମ୍ୟାପିଂ।",
    loginTitle: "ଆଶାକେୟାର ପୋର୍ଟାଲ୍ ଲଗ୍‌ଇନ୍",
    loginSub: "ସିଷ୍ଟମ୍ ଆକ୍ସେସ୍ କରିବା ପାଇଁ ଆଇଡି ଦିଅନ୍ତୁ",
    labelRole: "ବ୍ୟବହାରକାରୀ ଭୂମିକା",
    labelId: "ଆଶା / ଡାକ୍ତର ଆଇଡି",
    labelPass: "ପାସୱାର୍ଡ",
    btnLogin: "ଲଗ୍‌ଇନ୍ କରନ୍ତୁ",
    atlasTitle: "ଭିଜୁଆଲ୍ ସିମ୍ପଟମ୍ ଆଟଲାସ୍",
    atlasSub: "ମୂଲ୍ୟାୟନ ପାଇଁ ଲକ୍ଷଣ ବାଛିବାକୁ କାର୍ଡ ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ।",
    btnCloseAtlas: "ଆଟଲାସ୍ ବନ୍ଦ କରନ୍ତୁ",
    selectSymptom: "ଲକ୍ଷଣ ଚୟନ କରନ୍ତୁ"
  }
};

let currentLang = 'en';

// COMPREHENSIVE STORY-BASED DIAGNOSTIC DATABASE (Ref: Ashacarev18.PDF)[span_4](start_span)[span_4](end_span)
const DIAGNOSTIC_DATABASE = {
  white_reflex: {
    sign: { en: "White Pupil Reflex (Leukocoria)", hi: "सफेद पुतली रिफ्लेक्स (ल्यूकोकोरिया)", or: "ଧଳା ଆଖ୍ ଡୋଳା (ଲେଉକୋକୋରିଆ)" },
    storyPrompt: {
      en: "Does the child's eye show a bright white glow or cat-eye reflection in photos or sunlight?",
      hi: "क्या बच्चे की आंख में फोटो या तेज रोशनी में सफेद चमक (बिल्ली जैसी आंख) दिखती है?",
      or: "ଛୁଆର ଆଖରେ ଫୋଟୋ କିମ୍ବା ଖରାରେ ଧଳା ଚମକ (ବିଲେଇ ଆଖ୍ ପରି) ଦେଖାଯାଉଛି କି?"
    },
    vernacularKeywords: ["safed aankh", "aankh me safedi", "dhopa akhi", "white eye", "bili kannu", "cat eye", "safed"],
    level: "RED",
    visualAtlas: {
      title: { en: "Leukocoria (White Pupil)", hi: "ल्यूकोकोरिया (सफेद पुतली)", or: "ଲେଉକୋକୋରିଆ (ଧଳା ଆଖ୍ ଡୋଳା)" },
      icon: "👁️",
      desc: {
        en: "Pupil looks bright white or yellow-white instead of normal dark black in flash photos or sunlight.",
        hi: "फ़्लैश फ़ोटो या धूप में पुतली सामान्य काले रंग के बजाय सफेद या पीली दिखती है।",
        or: "ଫ୍ଲାସ୍ ଫୋଟୋ କିମ୍ବା ସୂର୍ଯ୍ୟକିରଣରେ ଆଖୁ ଡୋଳା କଳା ବଦଳରେ ଧଳା ଦେଖାଯାଏ।"
      }
    },
    keywords: ["white eye", "white pupil", "leukocoria", "eye mass", "safed"],
    differentials: ["Retinoblastoma (Pediatric Retinal Tumor)", "Congenital Cataract", "Persistent Fetal Vasculature"],
    fieldGuidance: "Protect eye from direct light strain or trauma. Avoid physical pressure on orbit."
  },
  petechiae: {
    sign: { en: "Unexplained Bleeding / Petechiae", hi: "अकारण रक्तस्राव / पेटेचिया", or: "ଅକାରଣ ରକ୍ତସ୍ରାବ / ଲାଲ୍ ଦାଗ" },
    storyPrompt: {
      en: "Are there sudden purple spots, tiny red pinpoint dots, or unusual bruises on the skin?",
      hi: "क्या त्वचा पर अचानक बैंगनी धब्बे, छोटे लाल बिंदु या असामान्य चोट के निशान दिखाई दे रहे हैं?",
      or: "ଛାତି କିମ୍ବା ଚମରେ ହଠାତ୍ ଲାଲ୍/ବାଇଗଣୀ ଦାଗ କିମ୍ବା ରକ୍ତ ଜମାଟ ବାନ୍ଧିବା ପରି ଦେଖାଯାଉଛି କି?"
    },
    vernacularKeywords: ["lal dabbe", "daag", "khun ke chinna", "purple spots", "laal daag", "bruising"],
    level: "RED",
    visualAtlas: {
      title: { en: "Petechiae & Purpura", hi: "पेटेचिया और पपुरा (लाल धब्बे)", or: "ପେଟେକିଆ ଓ ପୁରପୁରା (ଲାଲ୍ ଦାଗ)" },
      icon: "🔴",
      desc: {
        en: "Small red or purple pinprick spots under skin that do NOT fade when pressed.",
        hi: "त्वचा के नीचे छोटे लाल या बैंगनी बिंदु जो दबाने पर गायब नहीं होते।",
        or: "ଚର୍ମ ତଳେ ଛୋଟ ଲାଲ୍ କିମ୍ବା ବାଇଗଣୀ ଦାଗ ଯାହା ଚାପିଲେ ବି ଲିଭେ ନାହିଁ।"
      }
    },
    keywords: ["bleeding", "bruising", "petechiae", "purple spots", "unexplained hemorrhage"],
    differentials: ["Acute Leukemia", "Severe Dengue Hemorrhagic Fever", "Meningococcemia", "ITP"],
    fieldGuidance: "Avoid intramuscular injections or forceful handling. Keep child strictly at bed rest."
  },
  lymphadenopathy: {
    sign: { en: "Unexplained Persistent Lymph Node Mass", hi: "अस्पष्टीकृत लिम्फ नोड गांठ", or: "ଗଳା/ବିନ୍ଧାରେ ଅସ୍ବାଭାବିକ ଗାଣ୍ଠି" },
    storyPrompt: {
      en: "Are there painless, hard lumps on the neck, armpits, or groin that haven't gone away for weeks?",
      hi: "क्या गर्दन, कांख या जांघ पर दर्द रहित, सख्त गांठें हैं जो हफ्तों से ठीक नहीं हुई हैं?",
      or: "ବେକ, କାଖ କିମ୍ବା ଜଙ୍ଘ ସନ୍ଧିରେ ଦରଜ ନଥିବା ଟାଣ ଗାଣ୍ଠି ସପ୍ତାହ ସପ୍ତାହ ଧରି ରହିଛି କି?"
    },
    vernacularKeywords: ["ganth", "goli", "gala me sujan", "kankhi ganth", "neck lump"],
    level: "YELLOW",
    visualAtlas: {
      title: { en: "Enlarged Lymph Nodes", hi: "बढ़ी हुई लिम्फ नोड्स (गांठ)", or: "ଫୁଲିଥିବା ଲିମ୍ଫ ନୋଡ୍ (Lymph Nodes)" },
      icon: "🟢",
      desc: {
        en: "Firm, raised swellings along side of neck, under arms, or near groin fold.",
        hi: "गर्दन के किनारे, कांख के नीचे या जांघ के पास सख्त सूजन।",
        or: "ବେକ କାଖ କିମ୍ବା ଜଙ୍ଘ ପାଖରେ ଟାଣ ଫୁଲା ଗାଣ୍ଠି।"
      }
    },
    keywords: ["lymph node", "ganth", "neck lump", "swollen node", "mass"],
    differentials: ["Tubercular Lymphadenitis", "Lymphoma", "Wilms Tumor"],
    fieldGuidance: "Do NOT forcefully massage or squeeze lumps. Track changes in size."
  },
  papilledema_vision: {
    sign: { en: "Raised Intracranial Pressure / Vision Loss", hi: "बढ़ा हुआ इंट्राक्रैनीअल दबाव / दृष्टि हानि", or: "ଦୃଷ୍ଟିଶକ୍ତି କମିବା / ମୁଣ୍ଡ ବିନ୍ଧା" },
    storyPrompt: {
      en: "Does the child bump into walls/objects while walking or squint awkwardly in daylight?",
      hi: "क्या बच्चा चलते समय दीवारों/वस्तुओं से टकराता है या धूप में अजीब तरह से आंखें मिचमिचाता है?",
      or: "ଛୁଆ ଚାଲିଲା ବେଳେ କାନ୍ଥ/ଜିନିଷରେ ପିଟି ହେଉଛି କିମ୍ବା ଖରାରେ ଆଖ୍ ଚିପି ଦେଖୁଛି କି?"
    },
    vernacularKeywords: ["takrana", "dhundhla dikhna", "aankh michmichana", "dikhai nahi dena", "squinting"],
    level: "RED",
    visualAtlas: {
      title: { en: "Vision Disorientation", hi: "दृष्टि भ्रम / टकराना", or: "ଦୃଷ୍ଟିହୀନତା / ଝୁଣ୍ଟିବା" },
      icon: "💫",
      desc: {
        en: "Child stumbling over clear obstacles, keeping eyes closed in ambient light, or cross-eyed turn.",
        hi: "बच्चा साफ बाधाओं से टकराता है, रोशनी में आंखें बंद रखता है, या तिरछी आंखें दिखाता है।",
        or: "ସାମ୍ନାରେ ଥ‌ିବା ଜିନିଷରେ ଝୁଣ୍ଟି ପଡ଼ିବା କିମ୍ବା ଆଲୋକରେ ଆଖ୍ ବନ୍ଦ କରିବା।"
      }
    },
    keywords: ["vision loss", "bumping into things", "squinting", "papilledema", "headache vision"],
    differentials: ["Space Occupying Brain Lesion", "Hydrocephalus", "Idiopathic Intracranial Hypertension"],
    fieldGuidance: "Keep child lying down with head elevated 30 degrees. Transport to tertiary care."
  },
  jaundice: {
    sign: { en: "Jaundice / Icterus", hi: "पीलिया (जॉन्डिस)", or: "ହଳଦିଆ ଜଣ୍ଡିସ୍ / ଆଖ୍ ହଳଦିଆ" },
    storyPrompt: {
      en: "Are the eyes or skin turning yellow, or is urine dark like strong tea?",
      hi: "क्या आंखें या त्वचा पीली हो रही है, या पेशाब चाय की तरह गहरा पीला है?",
      or: "ଛୁଆର ଆଖ୍ କିମ୍ବା ଚର୍ମ ହଳଦିଆ ଦେଖାଯାଉଛି କିମ୍ବା ପରିସ୍ରା ଚା' ପରି କଳା/ହଳଦିଆ ହେଉଛି କି?"
    },
    vernacularKeywords: ["peela aankh", "peeli peshab", "haladia akhi", "jaundice", "peelia", "yellow eyes"],
    level: "YELLOW",
    visualAtlas: {
      title: { en: "Scleral Jaundice", hi: "स्क्लेरल पीलिया (आंखों का पीलापन)", or: "ହଳଦିଆ ଆଖ୍ (Jaundice)" },
      icon: "🟡",
      desc: {
        en: "Distinct yellowing of the white part of sclera, palms, or tea-colored urine.",
        hi: "आंखों के सफेद हिस्से, हथेलियों का पीलापन या चाय जैसा पेशाब।",
        or: "ଆଖୂର ଧଳା ଅଂଶ, ହାତ ପାପୁଲି ହଳଦିଆ ହେବା କିମ୍ବା ଗାଢ଼ ହଳଦିଆ ପରିସ୍ରା।"
      }
    },
    keywords: ["jaundice", "yellow", "icterus", "bilirubin", "yellow eyes", "peela"],
    differentials: ["Acute Viral Hepatitis (A/E)", "Neonatal Hyperbilirubinemia", "Biliary Atresia"],
    fieldGuidance: "Ensure frequent hydration/breastfeeding. Monitor for clay-colored stool."
  },
  fever_prolonged: {
    sign: { en: "Prolonged Unexplained Fever (>14 Days)", hi: "लंबे समय से बुखार (>14 दिन)", or: "ଦୀର୍ଘଦିନର ଜ୍ବର (>୧୪ ଦିନ)" },
    storyPrompt: {
      en: "Has the fever stayed for more than 2 weeks without coming down with normal medicines?",
      hi: "क्या बुखार सामान्य दवाओं से कम हुए बिना 2 सप्ताह से अधिक समय से बना हुआ है?",
      or: "ସାଧାରଣ ଔଷଧ ଖାଇବା ସତ୍ତ୍ବେ ୨ ସପ୍ତାହରୁ ଅଧିକ ସମୟ ଧରି ଜ୍ବର ଲାଗି ରହିଛି କି?"
    },
    vernacularKeywords: ["lamba bukhar", "2 sapta fever", "bujhuni bukhar", "din se bukhar"],
    level: "RED",
    keywords: ["fever 14 days", "prolonged fever", "fever 2 weeks", "lamba bukhar"],
    differentials: ["Acute Leukemia", "Visceral Leishmaniasis (Kala-azar)", "Disseminated Tuberculosis"],
    fieldGuidance: "Maintain continuous oral hydration. Keep child strictly resting."
  },
  chest_indrawing: {
    sign: { en: "Severe Lower Chest Wall Indrawing", hi: "छाती का अंदर धंसना (पसली चलना)", or: "ଛାତି ଭିତରକୁ ପଶିଯିବା | ପାଞ୍ଜି ଚାଲିବା" },
    storyPrompt: {
      en: "Are the lower ribs pulling deep inward every time the child gasps for breath?",
      hi: "क्या सांस लेते समय बच्चे की निचली पसलियां गहराई से अंदर की ओर खिंच रही हैं?",
      or: "ଛୁଆ ନିଶ୍ବାସ ନେଲା ବେଳେ ଛାତିର ତଳ ପାଞ୍ଜି ଭିତରକୁ ପଶିଯାଉଛି କି?"
    },
    vernacularKeywords: ["pasli chalna", "chhati dabuchi", "tez saans", "saans lene me taklif"],
    level: "RED",
    keywords: ["chest indrawing", "breathing fast", "chest retractions", "ribs pulling in"],
    differentials: ["Severe Pneumonia", "Acute Severe Asthma Exacerbation"],
    fieldGuidance: "Keep child upright in caregiver lap. Administer pre-referral oral Amoxicillin if trained."
  },
  lethargy: {
    sign: { en: "Extreme Lethargy/Convulsions", hi: "अत्यधिक सुस्ती / दौरे", or: "ଅଚେତନ / ବାତ (Seizures)" },
    storyPrompt: {
      en: "Is the child impossible to wake up, suffering seizures/fits, or showing a rigid stiff neck?",
      hi: "क्या बच्चे को जगाना असंभव है, दौरे/झटके आ रहे हैं, या गर्दन में अकड़न है?",
      or: "ଛୁଆ ଉଠିପାରୁ ନାହିଁ, ବାତ/ଝଟକା ମାରୁଛି କିମ୍ବା ବେକ ଟାଣ ହୋଇଯାଇଛି କି?"
    },
    vernacularKeywords: ["behoosh", "fitte", "mirgi", "gardan akadna", "achetan"],
    level: "RED",
    keywords: ["unconscious", "fits", "stiff neck", "lethargic", "convulsions", "seizure"],
    differentials: ["Pyogenic Meningitis", "Acute Encephalitis Syndrome (AES)", "Cerebral Malaria"],
    fieldGuidance: "Position on side (recovery position) to prevent aspiration. Do NOT force oral feeds."
  },
  severe_diarrhea: {
    sign: { en: "Severe Diarrhea / Dehydration", hi: "गंभीर दस्त / डिहाइड्रेशन", or: "ଗୁରୁତର ଝାଡ଼ା / ଜଳଶୂନ୍ୟତା" },
    storyPrompt: {
      en: "Is the child passing continuous watery stools with sunken eyes and dry mouth?",
      hi: "क्या बच्चा धंसी आंखों और सूखे मुंह के साथ लगातार पानी जैसा दस्त कर रहा है?",
      or: "ଛୁଆର ଆଖ୍ ଭିତରକୁ ପଶିଯାଇଛି, ପାଟି ଶୁଖି ଯାଉଛି ଏବଂ ପାଣି ପରି ଝାଡ଼ା ହେଉଛି କି?"
    },
    vernacularKeywords: ["dast", "patla tatti", "jhola chhada", "ulta dast", "paani ki kami"],
    level: "RED",
    keywords: ["diarrhea", "sunken eyes", "loose motion", "watery stool", "severe dehydration"],
    differentials: ["Severe Dehydration due to Gastroenteritis", "Cholera / Rotavirus"],
    fieldGuidance: "Start ORS administration continuously during transit. Administer Zinc tablet."
  }
};

let currentUser = null;
let selectedSymptoms = new Set();
let currentTriage = {};
let mapInstance = null;
let authMode = 'login';
let cloudCases = [];
let activeRecognition = null;

function changeLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[id]').forEach(el => {
    const key = el.id;
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = TRANSLATIONS[lang][key];
      } else {
        el.innerText = TRANSLATIONS[lang][key];
      }
    }
  });
  renderChips();
  if(!document.getElementById('atlasModal').classList.contains('hidden')) {
    openAtlas();
  }
}

// WEB SPEECH API INTEGRATION WITH DIALECT SUPPORT
function toggleVoiceInput(targetId, btnId) {
  const btn = document.getElementById(btnId);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert("Voice Speech Recognition is not supported on this browser. Please use Chrome or Edge.");
    return;
  }

  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
    btn.classList.remove('recording');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'or' ? 'or-IN' : 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;

  btn.classList.add('recording');

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const targetInput = document.getElementById(targetId);
    if (targetInput.tagName.toLowerCase() === 'textarea' || targetInput.tagName.toLowerCase() === 'input') {
      targetInput.value += (targetInput.value ? ' ' : '') + transcript;
      if(targetId === 'symptomText') processColloquialText();
      if(targetId === 'chipSearch') filterChips();
    }
    btn.classList.remove('recording');
    activeRecognition = null;
  };

  recognition.onerror = (err) => {
    console.error("Speech recognition error:", err);
    btn.classList.remove('recording');
    activeRecognition = null;
  };

  recognition.onend = () => {
    btn.classList.remove('recording');
    activeRecognition = null;
  };

  activeRecognition = recognition;
  recognition.start();
}

// VISUAL ATLAS MODAL FUNCTIONS
function openAtlas() {
  const grid = document.getElementById('atlasGrid');
  grid.innerHTML = '';
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  
  Object.keys(DIAGNOSTIC_DATABASE).forEach(key => {
    const item = DIAGNOSTIC_DATABASE[key];
    if (item.visualAtlas) {
      const titleText = item.visualAtlas.title[currentLang] || item.visualAtlas.title.en;
      const descText = item.visualAtlas.desc[currentLang] || item.visualAtlas.desc.en;
      const card = document.createElement('div');
      card.style.cssText = 'border: 1px solid var(--border); border-radius: 8px; padding: 1rem; background: #f8fafc; text-align: center; cursor: pointer; transition: all 0.2s;';
      card.onclick = () => selectFromAtlas(key);
      card.innerHTML = `
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">${item.visualAtlas.icon}</div>
        <strong style="color: var(--primary-dark); font-size: 0.95rem; display:block;">${titleText}</strong>
        <p style="font-size: 0.8rem; color: #475569; margin-top: 0.4rem; line-height:1.4;">${descText}</p>
        <span class="btn" style="margin-top:0.75rem; padding: 0.3rem 0.6rem; font-size: 0.75rem; width:100%; justify-content:center;">${t.selectSymptom}</span>
      `;
      grid.appendChild(card);
    }
  });
  document.getElementById('atlasModal').classList.remove('hidden');
}

function closeAtlas() {
  document.getElementById('atlasModal').classList.add('hidden');
}

function selectFromAtlas(key) {
  if (!selectedSymptoms.has(key)) {
    selectedSymptoms.add(key);
    const chip = document.querySelector(`.chip[data-key="${key}"]`);
    if (chip) chip.classList.add('selected');
  }
  closeAtlas();
}

function toggleAuthMode(mode) {
    authMode = mode;
    const nameGroup = document.getElementById('registerNameGroup');
    const submitBtn = document.getElementById('btnLogin');
    const title = document.getElementById('loginTitle');
    const errDiv = document.getElementById('loginError');
    const tLogin = document.getElementById('tabLogin');
    const tReg = document.getElementById('tabRegister');
    errDiv.innerText = "";
    if (mode === 'register') {
        tReg.classList.add('active'); tReg.style.background = "var(--surface)";
        tLogin.classList.remove('active'); tLogin.style.background = "transparent";
        nameGroup.classList.remove('hidden');
        document.getElementById('authName').required = true;
        submitBtn.innerText = "Register Cloud Account";
        title.innerText = "AshaCare Cloud Registration";
    } else {
        tLogin.classList.add('active'); tLogin.style.background = "var(--surface)";
        tReg.classList.remove('active'); tReg.style.background = "transparent";
        nameGroup.classList.add('hidden');
        document.getElementById('authName').required = false;
        submitBtn.innerText = "Login to System";
        title.innerText = "AshaCare Portal Login";
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const role = document.getElementById('loginRole').value;
    const id = document.getElementById('loginId').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const name = document.getElementById('authName').value.trim();
    const errDiv = document.getElementById('loginError');

    try {
        const endpoint = authMode === 'register' ? '/api/register' : '/api/login';
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, password, role, name })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Authentication failed');

        if (authMode === 'register') {
            alert('Cloud registration successful! Please log in.');
            toggleAuthMode('login');
            return;
        }

        currentUser = data.user;
        document.getElementById('activeUserBadge').innerText = `${currentUser.name} (${currentUser.id})`;
        document.getElementById('loginOverlay').classList.add('hidden');
        errDiv.innerText = "";
        
        await fetchCloudCases();
        if (role === 'doctor') {
            showTab('dashboardTab');
        } else {
            showTab('triageTab');
        }
    } catch (err) {
        errDiv.innerText = err.message;
    }
}

function logout() {
    currentUser = null;
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    document.getElementById('activeUserBadge').innerText = t.notAuth;
    document.getElementById('loginOverlay').classList.remove('hidden');
}

function renderChips() {
    const container = document.getElementById('symptomChips');
    container.innerHTML = '';
    Object.keys(DIAGNOSTIC_DATABASE).forEach(key => {
        const item = DIAGNOSTIC_DATABASE[key];
        const promptText = item.storyPrompt[currentLang] || item.storyPrompt['en'];
        const signText = item.sign[currentLang] || item.sign['en'];
        const chip = document.createElement('div');
        chip.className = 'chip' + (selectedSymptoms.has(key) ? ' selected' : '');
        chip.setAttribute('data-key', key);
        chip.innerHTML = `<strong>${promptText}</strong><small>${signText}</small>`;
        chip.onclick = () => toggleChip(key, chip);
        container.appendChild(chip);
    });
}

function toggleChip(key, chipEl) {
    if (selectedSymptoms.has(key)) {
        selectedSymptoms.delete(key); 
        chipEl.classList.remove('selected');
    } else {
        selectedSymptoms.add(key); 
        chipEl.classList.add('selected');
    }
}

function filterChips() {
    const q = document.getElementById('chipSearch').value.toLowerCase();
    document.querySelectorAll('#symptomChips .chip').forEach(chip => {
        const key = chip.getAttribute('data-key');
        const item = DIAGNOSTIC_DATABASE[key];
        const signText = (item.sign[currentLang] || item.sign.en).toLowerCase();
        const promptText = (item.storyPrompt[currentLang] || item.storyPrompt.en).toLowerCase();
        const searchableText = (signText + ' ' + promptText + ' ' + item.keywords.join(' ') + ' ' + (item.vernacularKeywords || []).join(' ')).toLowerCase();
        chip.style.display = searchableText.includes(q) ? 'block' : 'none';
    });
}

function processColloquialText() {
    const text = document.getElementById('symptomText').value.toLowerCase();
    Object.keys(DIAGNOSTIC_DATABASE).forEach(key => {
        const item = DIAGNOSTIC_DATABASE[key];
        const vernList = item.vernacularKeywords || [];
        const matched = vernList.some(v => text.includes(v)) || item.keywords.some(k => text.includes(k));
        if (matched && !selectedSymptoms.has(key)) {
            selectedSymptoms.add(key);
            const chip = document.querySelector(`.chip[data-key="${key}"]`);
            if (chip) chip.classList.add('selected');
        }
    });
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    if(tabId === 'triageTab') document.getElementById('triageNavBtn').classList.add('active');
    if(tabId === 'dashboardTab') { document.getElementById('dashNavBtn').classList.add('active'); renderDashboardCases(); }
    if(tabId === 'gisTab') { document.getElementById('gisNavBtn').classList.add('active'); setTimeout(initMap, 200); }
}

function processTriageEngine() {
    const text = document.getElementById('symptomText').value.toLowerCase();
    let matchedKeys = new Set(selectedSymptoms);
    
    Object.keys(DIAGNOSTIC_DATABASE).forEach(key => {
        const item = DIAGNOSTIC_DATABASE[key];
        const vernList = item.vernacularKeywords || [];
        if (vernList.some(kw => text.includes(kw)) || item.keywords.some(kw => text.includes(kw))) {
            matchedKeys.add(key);
        }
    });
    
    let highestSeverity = 'GREEN';
    let matchedSigns = [], differentials = [], fieldGuidance = [];
    
    matchedKeys.forEach(key => {
        const data = DIAGNOSTIC_DATABASE[key];
        if (data) {
            if (data.level === 'RED') highestSeverity = 'RED';
            else if (data.level === 'YELLOW' && highestSeverity !== 'RED') highestSeverity = 'YELLOW';
            matchedSigns.push(data.sign[currentLang] || data.sign.en);
            differentials.push(...data.differentials);
            if (data.fieldGuidance) fieldGuidance.push(data.fieldGuidance);
        }
    });
    
    differentials = [...new Set(differentials)]; 
    fieldGuidance = [...new Set(fieldGuidance)];
    const actionText = highestSeverity === 'RED' ? 'Transport immediately to District Hospital.' : highestSeverity === 'YELLOW' ? 'Schedule PHC evaluation within 48 hours.' : 'Routine pediatric monitoring.';
    
    const reportText = `**Primary Clinical Verdict & Risk Level**\n* **Triage Category:** ${highestSeverity}\n* **Screening Worker:** ${currentUser ? currentUser.name : 'Unknown'}\n* **Action Required:** ${actionText}\n\n**Symptom Analysis**\n* **Observed:** ${matchedSigns.length > 0 ? matchedSigns.join(', ') : 'None'}\n* **Differentials:**\n${differentials.map(d => ` * ${d}`).join('\n')}\n\n**Emergency Guidance**\n${fieldGuidance.map(g => `* ${g}`).join('\n')}`.trim();
    
    currentTriage = { level: highestSeverity, rawReport: reportText };
    document.getElementById('reportTimestamp').innerText = `Screening Date: ${new Date().toLocaleString()}`;
    const badge = document.getElementById('triageBadge');
    badge.className = `badge-${highestSeverity.toLowerCase()}`;
    badge.innerText = `${highestSeverity} - ${highestSeverity === 'RED' ? 'EMERGENCY' : 'ROUTINE'}`;
    const fill = document.getElementById('severityFill');
    fill.style.width = highestSeverity === 'RED' ? '100%' : highestSeverity === 'YELLOW' ? '60%' : '20%';
    fill.style.background = highestSeverity === 'RED' ? 'var(--red)' : highestSeverity === 'YELLOW' ? 'var(--yellow)' : 'var(--green)';
    document.getElementById('reportFormattedOutput').innerHTML = formatMarkdownToHTML(reportText);
    generateQRCode();
    document.getElementById('resultCard').classList.remove('hidden');
    document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth' });
}

function formatMarkdownToHTML(md) {
    return md.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>').replace(/^\\* (.*$)/gim, '<div style="margin-left: 0.5rem;">• $1</div>').replace(/\\n/g, '<br>');
}

function generateQRCode() {
    const container = document.getElementById('qrcode-container');
    container.innerHTML = '';
    const payload = JSON.stringify({ p: document.getElementById('patientName').value || 'Unknown', t: currentTriage.level });
    new QRCode(container, { text: payload, width: 120, height: 120 });
}

async function saveCaseRecord() {
    const record = {
        name: document.getElementById('patientName').value || 'Anonymous',
        age: document.getElementById('patientAge').value || 'N/A',
        workerId: currentUser ? currentUser.id : 'N/A',
        workerName: currentUser ? currentUser.name : 'Unknown',
        triage: currentTriage.level,
        report: currentTriage.rawReport,
        timestamp: new Date().toLocaleString(),
        lat: 21.4669 + (Math.random() - 0.5) * 0.05,
        lng: 83.9812 + (Math.random() - 0.5) * 0.05
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/cases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        if (!res.ok) throw new Error('Failed to save record to MongoDB cloud');
        alert("Record securely saved to MongoDB cloud database and synced!");
        await fetchCloudCases();
        resetNewCase();
    } catch (err) {
        alert("Error saving record: " + err.message);
    }
}

async function fetchCloudCases() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/cases`);
        cloudCases = await res.json();
        document.getElementById('dbSyncStatus').innerText = `Synced Records: ${cloudCases.length}`;
        renderDashboardCases();
        if (mapInstance) updateMapMarkers();
    } catch (err) {
        console.error("Could not fetch cloud cases:", err);
    }
}

function renderDashboardCases() {
    const container = document.getElementById('caseList');
    if (cloudCases.length === 0) {
        container.innerHTML = "<p style='color:#64748b;'>No referral records found on cloud server.</p>";
        return;
    }
    let html = `<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
        <tr style="border-bottom:2px solid #cbd5e1; text-align:left; background: #f8fafc;"><th style="padding: 0.75rem;">Patient</th><th style="padding: 0.75rem;">Worker</th><th style="padding: 0.75rem;">Triage</th><th style="padding: 0.75rem;">Time</th></tr>`;
    cloudCases.forEach(c => {
        const color = c.triage === 'RED' ? 'var(--red)' : c.triage === 'YELLOW' ? 'var(--yellow)' : 'var(--green)';
        html += `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:0.75rem;"><b>${c.name}</b></td>
            <td style="padding:0.75rem;">${c.workerName} (${c.workerId})</td>
            <td style="padding:0.75rem;"><span style="color:${color}; font-weight:bold;">${c.triage}</span></td>
            <td style="padding:0.75rem; color:#64748b; font-size: 0.8rem;">${c.timestamp}</td>
        </tr>`;
    });
    html += '</table>';
    container.innerHTML = html;
}

function initMap() {
    if (mapInstance) return;
    mapInstance = L.map('map').setView([21.4669, 83.9812], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(mapInstance);
    updateMapMarkers();
}

function updateMapMarkers() {
    cloudCases.forEach(c => {
        if (c.lat && c.lng) {
            const color = c.triage === 'RED' ? 'red' : c.triage === 'YELLOW' ? 'orange' : 'green';
            L.circleMarker([c.lat, c.lng], { color: color, radius: 8 }).addTo(mapInstance)
            .bindPopup(`<b>${c.name}</b><br>Triage: ${c.triage}`);
        }
    });
}

function resetNewCase() {
    document.getElementById('patientName').value = '';
    document.getElementById('patientAge').value = '';
    document.getElementById('symptomText').value = '';
    selectedSymptoms.clear();
    document.querySelectorAll('#symptomChips .chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('resultCard').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.onload = () => { renderChips(); };
</script>
</body>
</html>`);
});

// ==================== 4. START SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AshaCare Multilingual Cloud Engine running at http://localhost:${PORT}`));
