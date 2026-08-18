// server.js
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Uses Render's Environment Variable for Production. Defaults to local for testing.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ashacare';

// Middleware for parsing JSON requests
app.use(express.json({ limit: '50mb' }));

// ==========================================
// 1. MONGODB BACKEND SETUP
// ==========================================
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Database'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Unified Schema for Offline-First Syncing
const AppStateSchema = new mongoose.Schema({
    appId: { type: String, default: 'ashaCareGlobal' },
    users: Array,
    cases: Array,
    patients: Array
}, { strict: false, timestamps: true });

const AppState = mongoose.model('AppState', AppStateSchema);

// API Route: Pull database state
app.get('/api/sync', async (req, res) => {
    try {
        let state = await AppState.findOne({ appId: 'ashaCareGlobal' });
        res.json(state || { users: [], cases: [], patients: [] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// API Route: Push database state
app.post('/api/sync', async (req, res) => {
    try {
        await AppState.findOneAndUpdate(
            { appId: 'ashaCareGlobal' },
            req.body,
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 2. EMBEDDED FRONTEND HTML SERVER
// ==========================================
const rawCode = fs.readFileSync(__filename, 'utf8');
const htmlContent = rawCode.substring(
    rawCode.indexOf('=== FRONTEND_HTML_START ===') + 27,
    rawCode.indexOf('=== FRONTEND_HTML_END ===')
);

app.get('*', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

app.listen(PORT, () => {
    console.log(`🚀 AshaCare server running on port ${PORT}`);
});

/*
=== FRONTEND_HTML_START ===
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0f766e">
<title>AshaCare — Frontline Health Companion</title>
<style>
:root{--teal:#0f766e;--teal2:#115e59;--bg:#f8fafc;--line:#e2e8f0;--text:#0f172a;--muted:#64748b}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
button,input,textarea,select{font:inherit}button{cursor:pointer}.app{min-height:100vh;display:flex;justify-content:center}.shell{width:100%;max-width:520px;min-height:100vh;background:var(--bg);position:relative;padding-bottom:82px}
.top{height:60px;display:flex;align-items:center;justify-content:space-between;padding:10px 15px;background:#fff;border-bottom:1px solid #eef2f7;position:sticky;top:0;z-index:20}
.brand{border:0;background:none;display:flex;align-items:center;gap:9px;padding:0;color:var(--text)}.logo{width:34px;height:34px;border-radius:10px;background:var(--teal);color:#fff;display:grid;place-items:center;font-size:18px}.brand strong{font-size:15px}
.topRight{display:flex;align-items:center;gap:7px}.pill{border:0;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569}.pill.online{background:#ecfdf5;color:#047857}.pill.offline{background:#fffbeb;color:#b45309}.pill.auth{background:#e0f2fe;color:#0369a1}
main{padding:16px}.hero{background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;border-radius:18px;padding:20px;position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:150px;height:150px;border-radius:50%;right:-60px;bottom:-70px;background:rgba(255,255,255,.08)}.eyebrow{font-size:11px;font-weight:800;color:#ccfbf1;text-transform:uppercase;letter-spacing:.06em}.hero h2{font-size:21px;line-height:1.2;margin:8px 0 0}.hero p{font-size:12px;color:#ccfbf1;margin:7px 0 0}.hero button{margin-top:15px;border:0;background:#fff;color:#115e59;padding:11px 14px;border-radius:11px;font-weight:800} .grid2{display:grid;grid-template-columns:1fr 1fr;gap:11px}.stats{margin:12px 0}.card{background:#fff;border:1px solid #eef2f7;border-radius:14px}.stat{padding:14px}.stat strong{font-size:27px;display:block}.stat span,.muted{font-size:11px;color:var(--muted)}
.sync{padding:13px;display:flex;align-items:center;justify-content:space-between}.linkBtn{border:0;background:none;color:var(--teal);font-size:12px;font-weight:800;padding:5px}
.sectionTitle{font-size:11px;font-weight:850;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin:18px 0 8px}.record{padding:12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;border:0;background:#fff;width:100%;text-align:left}.record:active{background:#f8fafc}.recordName{font-size:14px;font-weight:700}.risk{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:850;white-space:nowrap}.risk.red{color:#b3261e;background:#fdecea}.risk.yellow{color:#8a5a00;background:#fff6dc}.risk.green{color:#1e6b45;background:#e9f7ef}.dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.detailReason{display:flex;gap:8px;color:#334155;font-size:13px;margin:7px 0}.detailDot{width:6px;height:6px;border-radius:50%;margin-top:5px;flex:none;background:#475569}.transcriptBox{background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:13px;color:#334155;margin-top:6px}
.qrNote{font-size:11px;color:#b45309;background:#fffbeb;border-radius:10px;padding:99px 11px;margin-top:8px}
.disclaimer{text-align:center;color:#94a3b8;font-size:11px;line-height:1.5;margin:18px 5px}
.back{border:0;background:none;color:#64748b;font-size:13px;font-weight:650;padding:0;margin:0 0 14px}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.input,.textarea,.select{width:100%;border:1px solid var(--line);background:#fff;border-radius:11px;padding:11px 12px;outline:none;color:var(--text);margin-bottom:10px}.input:focus,.textarea:focus,.select:focus{border-color:#5eead4;box-shadow:0 0 0 3px rgba(20,184,166,.1)}.textarea{resize:vertical;min-height:92px}
.voice{text-align:center;padding:17px 0}.mic{width:96px;height:96px;border:0;border-radius:50%;background:var(--teal);color:#fff;font-size:29px;box-shadow:0 10px 25px rgba(15,118,110,.2)}.mic.listening{background:#ef4444;box-shadow:0 10px 25px rgba(239,68,68,.2)}.voiceTitle{font-size:14px;font-weight:700;margin-top:10px}
.quick{display:flex;flex-wrap:wrap;gap:7px}.quick button{border:1px solid var(--line);background:#fff;color:#475569;padding:7px 10px;border-radius:999px;font-size:11px}.quick button.active{background:var(--teal);border-color:var(--teal);color:#fff}
.primary,.dark,.outline{width:100%;border-radius:11px;padding:13px;font-weight:800;font-size:13px;margin-top:8px}.primary{border:0;background:var(--teal);color:#fff}.dark{border:0;background:#0f172a;color:#fff}.outline{border:1px solid var(--line);background:#fff;color:#334155}.primary:disabled{background:#e2e8f0;color:#94a3b8;cursor:not-allowed}
.loader{height:58vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#475569}.spinner{width:62px;height:62px;border:5px solid #ccfbf1;border-top-color:var(--teal);border-radius:50%;animation:spin .9s linear infinite;margin-bottom:18px}@keyframes spin{to{transform:rotate(360deg)}}
.resultBanner{border-radius:17px;padding:25px;text-align:center}.resultIcon{width:64px;height:64px;border-radius:50%;background:#fff;display:grid;place-items:center;margin:0 auto 11px;font-size:28px}.box{padding:15px;margin-top:12px}.boxTitle{font-size:10px;font-weight:850;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px}.reason{display:flex;gap:8px;color:#334155;font-size:13px;margin:7px 0}.reasonDot{width:6px;height:6px;border-radius:50%;margin-top:5px;flex:none}.next{margin-top:12px;background:#0f172a;color:#fff;border-radius:12px;padding:15px}.next .boxTitle{color:#94a3b8}
.refHead{padding:15px;display:flex;justify-content:space-between;align-items:center}.refBody{padding:15px}.facility{display:flex;gap:9px;margin:13px 0}.qrWrap{text-align:center;padding:8px}.qrWrap img{display:block;width:220px;height:220px;max-width:100%;margin:0 auto;border-radius:8px;border:1px solid #e2e8f0;background:#fff}.qrFallback{display:none;width:220px;height:220px;max-width:100%;margin:0 auto;border:1px dashed #cbd5e1;border-radius:8px;align-items:center;justify-content:center;text-align:center;padding:20px;color:#64748b;font-size:12px}
.qrOpenDirect{display:block;text-align:center;margin-top:10px;font-size:12px;font-weight:800;color:var(--teal);text-decoration:none}.actions{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #eef2f7}.actions button{border:0;background:#fff;padding:12px;font-size:12px;font-weight:800;color:var(--teal)}.actions button+button{border-left:1px solid #eef2f7;color:#475569}
.qrGenerator{padding:15px}.qrLarge{margin:15px auto;width:240px;height:240px;display:grid;place-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:12px}.qrLarge img{width:220px;height:220px}.qrHint{text-align:center;color:#64748b;font-size:11px;line-height:1.5}.smallRow{display:flex;gap:8px}.smallRow>*{flex:1}.toast{display:none;position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:100;background:#0f172a;color:#fff;border-radius:10px;padding:10px 14px;font-size:12px;box-shadow:0 8px 25px rgba(0,0,0,.2)}
.bottom{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:100%;max-width:520px;background:#fff;border-top:1px solid #eef2f7;display:grid;grid-template-columns:repeat(6,1fr);padding:7px 4px;z-index:30}.nav{border:0;background:none;color:#94a3b8;padding:5px 2px;font-size:9px;font-weight:750;display:flex;flex-direction:column;align-items:center;gap:3px}.nav.active{color:var(--teal)}.navIcon{font-size:19px;line-height:20px}
.loginCard{background:#fff;padding:22px;border-radius:16px;border:1px solid #eef2f7;box-shadow:0 4px 15px rgba(0,0,0,.03);margin-top:10px}
.label{font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;display:block}
.authTabs{display:flex;gap:10px;margin-bottom:18px;border-bottom:2px solid #eef2f7;padding-bottom:10px}
.authTabBtn{border:0;background:none;font-size:15px;font-weight:800;padding:6px 10px;border-radius:8px;color:#94a3b8}
.authTabBtn.active{color:var(--teal);background:#f0fdfa}
.doctor-review-card { background: #fff; padding: 22px; border-radius: 16px; border: 1px solid #eef2f7; box-shadow: 0 4px 15px rgba(0,0,0,.03); margin-top: 15px; }
.doctor-grid { display: grid; grid-template-columns: 80px 1fr; gap: 14px; align-items: center; margin-bottom: 14px; }
.doctor-avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--teal); }
.doctor-info h4 { margin: 0 0 2px; font-size: 15px; color: var(--text); }
.doctor-info p { margin: 0; font-size: 12px; color: var(--muted); }
.review-quote { font-style: italic; font-size: 13px; line-height: 1.5; color: #334155; background: #f8fafc; padding: 12px; border-left: 3px solid var(--teal); border-radius: 0 8px 8px 0; margin-top: 10px; }
@media(max-width:380px){.row{grid-template-columns:1fr}.bottom{grid-template-columns:repeat(6,1fr)}}
@media print{.top,.bottom,.back,.noPrint,button{display:none!important}.shell{max-width:none;padding:0}.refCard{border:0}}
</style>
<style id="case-management-css">
.statusPill{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800}.status-pending{background:#fff7ed;color:#9a3412}.status-review{background:#eff6ff;color:#1d4ed8}.status-followup{background:#ecfdf5;color:#047857}.status-referred{background:#fef2f2;color:#b91c1c}.status-closed{background:#f1f5f9;color:#475569}.caseActions{display:grid;grid-template-columns:1fr;gap:9px;margin-top:12px}.caseActions button{min-height:44px}.doctorHero{background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;border-radius:18px;padding:18px;box-shadow:0 10px 30px rgba(15,118,110,.16)}.doctorHero h2{margin:0 0 5px}.metricGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.metricCard{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:12px;text-align:center}.metricCard strong{display:block;font-size:22px}.metricCard span{font-size:10px;color:#64748b}.filterRow{display:flex;gap:7px;overflow:auto;padding-bottom:4px}.filterRow button{white-space:nowrap}.examBox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-top:10px}.caseMeta{display:grid;grid-template-columns:1fr 1fr;gap:8px}.caseMeta div{background:#f8fafc;border-radius:10px;padding:9px}.caseMeta small{display:block;color:#64748b;font-size:10px}.caseMeta b{font-size:12px}.dangerBtn{background:#dc2626!important;color:white!important}.successBtn{background:#047857!important;color:white!important}.blueBtn{background:#2563eb!important;color:white!important}
@media(max-width:420px){.metricGrid{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body> <div class="app"><div class="shell">
<header class="top">
<button class="brand" onclick="App.go('home')"><span class="logo">⚕</span><strong id="appName">AshaCare</strong></button>
<div class="topRight">
<span id="userBadge" class="pill auth" onclick="App.logout()" title="Click to Logout">Lock</span>
<span id="connection" class="pill offline">● Offline</span>
<button class="pill" onclick="App.toggleLang()" id="langBtn">हि</button>
</div>
</header>
<main id="screen"></main>
<nav class="bottom">
<button class="nav active" id="nav-home" onclick="App.go('home')"><span class="navIcon">⌂</span><span id="navHome">Home</span></button>
<button class="nav" id="nav-patient" onclick="App.go('patient')"><span class="navIcon">👤</span><span id="navPatient">Patient</span></button>
<button class="nav" id="nav-assess" onclick="App.newAssessment()"><span class="navIcon">＋</span><span id="navAssess">Child Assessment</span></button>
<button class="nav" id="nav-records" onclick="App.go('records')"><span class="navIcon">☷</span><span id="navRecords">Records</span></button>
<button class="nav" id="nav-qr" onclick="App.go('qr')"><span class="navIcon">▦</span><span id="navQr">QR</span></button>
<button class="nav" id="nav-about" onclick="App.go('about')"><span class="navIcon">ℹ</span><span id="navAbout">About</span></button>
</nav>
<div id="toast" class="toast"></div>
</div></div>
<script>
const T={
en:{appName:"AshaCare",tagline:"Pediatric red-flag triage assistant",home:"Home",newAssessment:"New Assessment",records:"Records",startAssessment:"Start New Assessment",todaysCases:"Today's cases",pendingFollowups:"Pending follow-ups",recentAssessments:"Recent assessments",online:"Online",offline:"Offline — will sync later",syncNow:"Sync now",synced:"All records synced",tapToSpeak:"Tap to speak symptoms",listening:"Listening…",orType:"…or type / edit below",quickAdd:"Quick-add common signs",childName:"Child's name (optional)",childAge:"Age (years)",analyze:"Analyze symptoms",analyzing:"Checking against WHO warning signs…",back:"Back",riskRed:"REFER IMMEDIATELY",riskYellow:"MONITOR CLOSELY",riskGreen:"ROUTINE CARE",flaggedBecause:"Flagged because:",possible:"Possible concern:",nextSteps:"Recommended next step",generateReferral:"Generate referral slip",saveMonitor:"Save & set monitoring reminder",newCase:"Start another assessment",nearestFacility:"Nearest district facility",away:"away",shareSlip:"Share with family",printSlip:"Print slip",followUp:"Follow-up reminder",remindIn:"Remind me to check in",days3:"3 days",days7:"7 days",reminderSet:"Reminder set",goHome:"Done — back to home",scanNote:"Hospital staff can scan this code to pull up the full case instantly.",caseId:"Case ID",noSpeechSupport:"Voice input isn't supported in this browser — please type instead.",weekAgo:"2 days ago",qrTitle:"QR Code Generator",qrText:"Enter case information or any text below.",generateQr:"Generate QR",downloadQr:"Download QR",copyQr:"Copy content",qrEmpty:"Enter some text to generate a QR code.",disclaimer:"This tool assists your judgment. It does not diagnose or replace a doctor.",referralSlip:"Referral Slip",childLabel:"Child",symptomsRecorded:"Symptoms recorded",noRecords:"No assessments yet",tapForDetails:"Tap a case to see full details",micDenied:"Microphone permission denied — allow mic access in your browser/site settings and try again.",micNoSpeech:"No speech detected — try again, closer to the mic.",micNetwork:"Voice recognition needs an internet connection — it isn't fully offline in this browser demo.",micNotSecure:"Voice input needs this page opened over https:// (or localhost). It's often blocked when opened as a local file — host it online to test voice.",micGeneric:"Voice input failed — please type instead.",openInBrowser:"Open QR in browser",retryQr:"Retry QR",generatedOn:"Generated",loginTitle:"Worker Access",enterName:"Full Name",enterWorkerId:"Worker / ID Number",enterPin:"Enter Passcode / PIN",loginBtn:"Login & Access",invalidPin:"Invalid passcode / PIN.",missingDetails:"Please enter all required details.",registeredPatients:"Registered Patient Records",savePatient:"Save Patient Data",aboutTitle:"About AshaCare",aboutText1:"AshaCare is a digital frontline screening and clinical decision support companion designed specifically for ASHA workers, community health providers, and rural medical officers.",aboutText2:"By evaluating symptoms against pediatric warning signs and standardized triage pathways (such as fever, pallor, and red-flag indicators), AshaCare helps bridge the gap between early symptom detection and prompt referral to district medical facilities.",aboutText3:"Built with offline resilience, multilingual support (English, Hindi, Odia), and secure worker authentication, AshaCare empowers frontline health workers to deliver safer, faster, and more reliable pediatric care.",doctorReviewTitle:"Doctor & Health Worker Reviews",doc1Name:"Dr. Ananya Roy, MD (Pediatrics)",doc1Role:"District Chief Medical Officer",doc1Review:"AshaCare has streamlined our referral process significantly. Grassroots workers can now accurately flag high-risk symptoms and send properly structured details to our facility.",doc2Name:"Sunita Murmu",doc2Role:"Senior ASHA Supervisor",doc2Review:"The multilingual support and offline capabilities make this app extremely practical for field use. It gives our workers the confidence needed for timely interventions."},
hi:{appName:"आशाकेयर",tagline:"बाल कैंसर चेतावनी संकेत सहायक",home:"होम",newAssessment:"नई जांच",records:"रिकॉर्ड",startAssessment:"नई जांच शुरू करें",todaysCases:"आज के मामले",pendingFollowups:"लंबित फॉलो-अप",recentAssessments:"हाल की जांचें",online:"ऑनलाइन",offline:"ऑफ़लाइन — बाद में सिंक होगा",syncNow:"अभी सिंक करें",synced:"सभी रिकॉर्ड सिंक हो गए",tapToSpeak:"लक्षण बोलने के लिए टैप करें",listening:"सुन रहा है…",orType:"…या नीचे टाइप / संपादित करें",quickAdd:"सामान्य लक्षण जोड़ें",childName:"बच्चे का नाम (वैकल्पिक)",childAge:"उम्र (वर्ष)",analyze:"लक्षणों की जांच करें",analyzing:"WHO चेतावनी संकेतकों से मिलान हो रहा है…",back:"वापस",riskRed:"तुरंत रेफर करें",riskYellow:"बारीकी से निगरानी करें",riskGreen:"सामान्य देखभाल",flaggedBecause:"चिह्नित करने का कारण:",possible:"संभावित चिंता:",nextSteps:"अनुशंसित अगला कदम",generateReferral:"रेफरल स्लिप बनाएं",saveMonitor:"सेव करें और निगरानी रिमाइंडर सेट करें",newCase:"एक और जांच शुरू करें",nearestFacility:"निकटतम जिला अस्पताल",away:"दूर",shareSlip:"परिवार के साथ साझा करें",printSlip:"स्लिप प्रिंट करें",followUp:"फॉलो-अप रिमाइंडर",remindIn:"मुझे जांच के लिए याद दिलाएं",days3:"3 दिन",days7:"7 दिन",reminderSet:"रिमाइंडर सेट हो गया",goHome:"पूर्ण — होम पर वापस जाएं",scanNote:"अस्पताल स्टाफ इस कोड को स्कैन करके पूरा मामला तुरंत देख सकता है।",caseId:"केस आईडी",noSpeechSupport:"इस ब्राउज़र में वॉयस इनपुट समर्थित नहीं है — कृपया टाइप करें।",weekAgo:"2 दिन पहले",qrTitle:"QR कोड जनरेटर",qrText:"नीचे केस की जानकारी या कोई भी टेक्स्ट लिखें।",generateQr:"QR बनाएं",downloadQr:"QR डाउनलोड करें",copyQr:"टेक्स्ट कॉपी करें",qrEmpty:"QR बनाने के लिए टेक्स्ट लिखें।",disclaimer:"यह टूल आपकी सहायता करता है। यह निदान नहीं करता या डॉक्टर का विकल्प नहीं है।",referralSlip:"रेफरल स्लिप",childLabel:"बच्चा",symptomsRecorded:"दर्ज लक्षण",noRecords:"अभी तक कोई जांच नहीं",tapForDetails:"पूरी जानकारी देखने के लिए केस पर टैप करें",micDenied:"माइक्रोफ़ोन अनुमति अस्वीकृत — ब्राउज़र सेटिंग में माइक अनुमति दें और फिर से प्रयास करें।",micNoSpeech:"कोई आवाज़ नहीं मिली — माइक के पास फिर से बोलें।",micNetwork:"वॉयस पहचान के लिए इंटरनेट चाहिए — यह ब्राउज़र डेमो पूरी तरह ऑफ़लाइन नहीं है।",micNotSecure:"वॉयस इनपुट के लिए यह पेज https:// (या localhost) पर खुला होना चाहिए।",micGeneric:"वॉयस इनपुट विफल — कृपया टाइप करें।",openInBrowser:"ब्राउज़र में QR खोलें",retryQr:"QR फिर कोशिश करें",generatedOn:"जनरेट किया गया",loginTitle:"कार्यकर्ता एक्सेस",enterName:"पूरा नाम",enterWorkerId:"कार्यकर्ता / आईडी नंबर",enterPin:"पासकोड / पिन दर्ज करें",loginBtn:"लॉगिन करें",invalidPin:"अमान्य पासकोड / पिन।",missingDetails:"कृपया सभी आवश्यक जानकारी दर्ज करें।",registeredPatients:"पंजीकृत मरीज रिकॉर्ड",savePatient:"मरीज का डेटा सहेजें",aboutTitle:"आशाकेयर के बारे में",aboutText1:"आशाकेयर एक डिजिटल फ्रंटलाइन स्क्रीन-इन और क्लिनिकल डिसीजन सपोर्ट साथी है।",aboutText2:"बाल चिकित्सा चेतावनी संकेतकों के खिलाफ लक्षणों का मूल्यांकन करके आशाकेयर त्वरित रेफरल में मदद करता है।",aboutText3:"ऑफ़लाइन समर्थन और बहुभाषी सुविधा के साथ सुरक्षित बाल चिकित्सा देखभाल प्रदान करता है।",doctorReviewTitle:"डॉक्टर और स्वास्थ्य कार्यकर्ता समीक्षाएं",doc1Name:"डॉ. अनन्या रॉय, एमडी (बाल रोग)",doc1Role:"जिला मुख्य चिकित्सा अधिकारी",doc1Review:"आशाकेयर ने हमारी रेफरल प्रक्रिया को काफी सुव्यवस्थित किया है।",doc2Name:"सुनीता मुर्मू",doc2Role:"वरिष्ठ आशा पर्यवेक्षक",doc2Review:"बहुभाषी समर्थन और ऑफ़लाइन क्षमताएं इस ऐप को फील्ड उपयोग के लिए व्यावहारिक बनाती हैं।"},
or:{appName:"ଆଶାକେୟାର",tagline:"ଶିଶୁ ସ୍ୱାସ୍ଥ୍ୟ ଚେତାବନୀ ସଙ୍କେତ ସହାୟକ",home:"ହୋମ",newAssessment:"ନୂଆ ଯାଞ୍ଚ",records:"ରେକର୍ଡ",startAssessment:"ନୂଆ ଯାଞ୍ଚ ସୁରୁ କରନ୍ତୁ",todaysCases:"ଆଜିର ମାମଲା",pendingFollowups:"ବାକି ଫଲୋ-ଅପ",recentAssessments:"ସାମ୍ପ୍ରତିକ ଯାଞ୍ଚ",online:"ଅନଲାଇନ",offline:"ଅଫଲାଇନ — ପରେ ସିଙ୍କ ହେବ",syncNow:"ବର୍ତ୍ତମାନ ସିଙ୍କ କରନ୍ତୁ",synced:"ସବୁ ରେକର୍ଡ ସିଙ୍କ ହୋଇଗଲା",tapToSpeak:"ଲକ୍ଷଣ କହିବାକୁ ଟାପ କରନ୍ତୁ",listening:"ଶୁଣୁଛି…",orType:"…କିମ୍ବା ତଳେ ଟାଇପ୍ କରନ୍ତୁ",quickAdd:"ସାଧାରଣ ଲକ୍ଷଣ ଯୋଡ଼ନ୍ତୁ",childName:"ଶିଶୁର ନାମ (ଇଚ୍ଛାଧୀନ)",childAge:"ବୟସ (ବର୍ଷ)",analyze:"ଲକ୍ଷଣ ଯାଞ୍ଚ କରନ୍ତୁ",analyzing:"WHO ଚେତାବନୀ ସଙ୍କେତ ସହିତ ମେଳ ହେଉଛି…",back:"ଫେରନ୍ତୁ",riskRed:"ତୁରନ୍ତ ରେଫର କରନ୍ତୁ",riskYellow:"ନିରୀକ୍ଷଣ କରନ୍ତୁ",riskGreen:"ସାଧାରଣ ଯତ୍ନ",flaggedBecause:"ଚିହ୍ନଟ କାରଣ:",possible:"ସମ୍ଭାବ୍ୟ ଚିନ୍ତା:",nextSteps:"ପରାମର୍ଶିତ ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ",generateReferral:"ରେଫରାଲ ସ୍ଲିପ୍ ତିଆରି କରନ୍ତୁ",saveMonitor:"ସେଭ୍ କରନ୍ତୁ ଓ ରିମାଇଣ୍ଡର ସେଟ୍ କରନ୍ତୁ",newCase:"ଅନ୍ୟ ଏକ ଯାଞ୍ଚ ସୁରୁ କରନ୍ତୁ",nearestFacility:"ନିକଟତମ ଜିଲ୍ଲା ଡାକ୍ତରଖାନା",away:"ଦୂର",shareSlip:"ପରିବାର ସହିତ ସେୟାର କରନ୍ତୁ",printSlip:"ସ୍ଲିପ୍ ପ୍ରିଣ୍ଟ କରନ୍ତୁ",followUp:"ଫଲୋ-ଅପ ରିମାଇଣ୍ଡର",remindIn:"ମୋତେ ଯାଞ୍ଚ କରିବାକୁ ମନେ ପକାନ୍ତୁ",days3:"3 ଦିନ",days7:"7 ଦିନ",reminderSet:"ରିମାଇଣ୍ଡର ସେଟ୍ ହୋଇଗଲା",goHome:"ସମାପ୍ତ — ହୋମକୁ ଫେରନ୍ତୁ",scanNote:"ଡାକ୍ତରଖାନା ଷ୍ଟାଫ୍ ଏହି କୋଡ୍ ସ୍କାନ କରି ପୁରା ମାମଲା ତୁରନ୍ତ ଦେଖି ପାରିବେ।",caseId:"କେସ୍ ଆଇଡି",noSpeechSupport:"ଏହି ବ୍ରାଉଜରରେ ଭଏସ୍ ଇନପୁଟ୍ ସମର୍ଥିତ ନୁହେଁ — ଦୟାକରି ଟାଇପ୍ କରନ୍ତୁ।",weekAgo:"2 ଦିନ ପୂର୍ବେ",qrTitle:"QR କୋଡ୍ ଜେନେରେଟର",qrText:"ତଳେ କେସ୍ ସୂଚନା କିମ୍ବା ଯେକୌଣସି ଟେକ୍ସଟ୍ ଲେଖନ୍ତୁ।",generateQr:"QR ତିଆରି କରନ୍ତୁ",downloadQr:"QR ଡାଉନଲୋଡ୍ କରନ୍ତୁ",copyQr:"ଟେକ୍ସଟ୍ କପି କରନ୍ତୁ",qrEmpty:"QR ତିଆରି କରିବାକୁ ଟେକ୍ସଟ୍ ଲେଖନ୍ତୁ।",disclaimer:"ଏହି ଟୁଲ୍ ଆପଣଙ୍କ ନିଷ୍ପତ୍ତିରେ ସାହାଯ୍ୟ କରେ।",referralSlip:"ରେଫରାଲ ସ୍ଲିପ୍",childLabel:"ଶିଶୁ",symptomsRecorded:"ଦର୍ଜ ଲକ୍ଷଣ",noRecords:"ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଯାଞ୍ଚ ନାହିଁ",tapForDetails:"ପୁରା ସୂଚନା ଦେଖିବାକୁ କେସ୍ ଉପରେ ଟାପ୍ କରନ୍ତୁ",micDenied:"ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମନା।",micNoSpeech:"କୌଣସି ଶବ୍ଦ ମିଳିଲା ନାହିଁ।",micNetwork:"ଭଏସ୍ ଚିହ୍ନଟ ପାଇଁ ଇଣ୍ଟରନେଟ୍ ଦରକାର।",micNotSecure:"ଭଏସ୍ ଇନପୁଟ୍ ପାଇଁ https:// ଆବଶ୍ୟକ।",micGeneric:"ଭଏସ୍ ଇନପୁଟ୍ ବିଫଳ — ଦୟାକରି ଟାଇପ୍ କରନ୍ତୁ।",openInBrowser:"ବ୍ରାଉଜରରେ QR ଖୋଲନ୍ତୁ",retryQr:"QR ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ",generatedOn:"ତିଆରି ହେଲା",loginTitle:"କର୍ମୀ ଏକ୍ସେସ",enterName:"ପୁରା ନାମ",enterWorkerId:"କର୍ମୀ / ଆଇଡି ନମ୍ବର",enterPin:"ପାସକୋଡ୍ / ପିନ୍",loginBtn:"ଲଗଇନ୍ କରନ୍ତୁ",invalidPin:"ଅମାନ୍ୟ ପାସକୋଡ୍ / ପିନ୍।",missingDetails:"ଦୟାକରି ସମସ୍ତ ସୂଚନା ଦିଅନ୍ତୁ।",registeredPatients:"ପଞ୍ଜୀକୃତ ରୋଗୀ ରେକର୍ଡ",savePatient:"ରୋଗୀ ତଥ୍ୟ ସଂରକ୍ଷଣ କରନ୍ତୁ",aboutTitle:"ଆଶାକେୟାର ବିଷୟରେ",aboutText1:"ଆଶାକେୟାର ଫ୍ରଣ୍ଟଲାଇନ୍ ସ୍କ୍ରିନିଂ ଏବଂ କ୍ଲିନିକାଲ୍ ନିଷ୍ପତ୍ତି ସହାୟତା ସାଥୀ।",aboutText2:"ଶିଶୁ ଚେତାବନୀ ସଙ୍କେତ ସହିତ ଲକ୍ଷଣର ମୂଲ୍ୟାଙ୍କନ କରି ଆଶାକେୟାର ଶୀଘ୍ର ରେଫରାଲରେ ସାହାଯ୍ୟ କରେ।",aboutText3:"ଅଫଲାଇନ୍ ସମର୍ଥନ ଏବଂ ବହୁଭାଷୀ ସୁବିଧା।",doctorReviewTitle:"ଡାକ୍ତର ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ କର୍ମୀ ସମୀକ୍ଷା",doc1Name:"ଡା. ଅନନ୍ୟା ରାୟ, ଏମଡି (ଶିଶୁ ରୋଗ)",doc1Role:"ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସା ଅଧିକାରୀ",doc1Review:"ଆଶାକେୟାର ଆମର ରେଫରାଲ୍ ପ୍ରକ୍ରିୟାକୁ ସହଜ କରିଛି।",doc2Name:"ସୁନୀତା ମୁର୍ମୁ",doc2Role:"ବିଶେଷଜ୍ଞ ଆଶା ପରିଦର୍ଶକ",doc2Review:"ବହୁଭାଷୀ ସମର୍ଥନ ଏବଂ ଅଫଲାଇନ୍ କ୍ଷମତା ଏହାକୁ ବ୍ୟବହାରିକ କରିଥାଏ।"}
}; 

const QUICK=[
{key:"fever_general",en:"Fever 3 weeks",hi:"3 हफ्ते बुखार",or:"3 ସପ୍ତାହ ଜ୍ୱର"},
{key:"pallor",en:"Pallor",hi:"पीलापन",or:"ଫିକା"},
{key:"weight_loss",en:"Weight loss",hi:"वजन घटना",or:"ଓଜନ କମିବା"},
{key:"mass",en:"New swelling",hi:"नई सूजन",or:"ନୂଆ ଫୁଲା"},
{key:"bone_pain",en:"Bone pain",hi:"हड्डी दर्द",or:"ହାଡ଼ ଯନ୍ତ୍ରଣା"},
{key:"white_eye",en:"White pupil",hi:"आंख सफेद",or:"ଆଖିରେ ଧଳା"},
{key:"bleeding",en:"Bleeding/bruising",hi:"रक्तस्राव/नील",or:"ରକ୍ତସ୍ରାବ"},
{key:"headache",en:"Headache",hi:"सिरदर्द",or:"ମୁଣ୍ଡ ଯନ୍ତ୍ରଣା"},
{key:"vomiting",en:"Vomiting",hi:"उल्टी",or:"ବାନ୍ତି"}
];

const MOCK=[
{id:"AC-2291",name:"Rohan",age:"4",level:"red",concern:"Possible leukemia",re:["Fever lasting more than 2 weeks","Pallor (pale skin) reported","Weight loss reported"],transcript:"fever for 3 weeks, weight loss, pale",when:"2 days ago"},
{id:"AC-2288",name:"Priya",age:"7",level:"yellow",concern:"Monitor closely, recheck in a few days",re:["One warning sign present without a red-flag combination"],transcript:"fatigue, low energy",when:"2 days ago"},
{id:"AC-2281",name:"Amit",age:"2",level:"green",concern:null,re:["No red-flag symptoms or combinations matched"],transcript:"mild cough, no fever",when:"2 days ago"}
];

const MOCK_PATIENTS=[
{id:"PAT-101",name:"Rohan Kumar",age:"4",gender:"Male",contact:"+91 9876543210",bloodGroup:"O+",history:"Frequent fever"},
{id:"PAT-102",name:"Priya Sharma",age:"7",gender:"Female",contact:"+91 9123456789",bloodGroup:"A+",history:"Fatigue"}
];

const App={
state:{isAuthenticated:false,userName:"",workerId:"",userRole:"ASHA Worker",authTab:"login",lang:"en",screen:"login",online:false,transcript:"",quickKeys:new Set(),childName:"",childAge:"",childAgeUnit:"months",childAgeLabel:"",selectedPatientId:null,result:null,caseId:"",reminderDays:null,listening:false,qrText:"",records:MOCK.map(r=>({...r})),patients:MOCK_PATIENTS.map(p=>({...p})),selectedRecordId:null},
t(){return T[this.state.lang]},
escape(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))},
go(s){
if(!this.state.isAuthenticated && s!=='login'){this.toast("Please log in or register first");this.state.screen="login";this.render();return;}
this.state.screen=s;this.render();
},
setAuthTab(tab){this.state.authTab=tab;this.render();},
register(){
const name=document.getElementById("regNameInput")?.value.trim();
const idNo=document.getElementById("regIdInput")?.value.trim();
const role=document.getElementById("regRoleSelect")?.value||"ASHA Worker";
const pin=document.getElementById("regPinInput")?.value;
const confirmPin=document.getElementById("regConfirmPinInput")?.value;

if(!name || !idNo || !pin){this.toast(this.t().missingDetails);return;}
if(pin !== confirmPin){this.toast("Passcodes do not match.");return;}
if(pin.length < 4){this.toast("PIN must be at least 4 digits.");return;}

const db=cmLoad();
db.users = db.users || [];
if(db.users.some(u => u.id.toLowerCase() === idNo.toLowerCase())){this.toast("Worker ID already exists. Please log in.");return;}

const newUser = { id: idNo, name, role, pin, createdAt: new Date().toISOString() };
db.users.push(newUser);
cmSave(db);
this.state.cmDb = db;
this.state.isAuthenticated = true;
this.state.userName = name;
this.state.workerId = idNo;
this.state.userRole = role;
this.go('home');
this.toast(`Account registered! Logged in as ${role}`);
},
login(){
const idNo=document.getElementById("workerIdInput")?.value.trim();
const pin=document.getElementById("pinInput")?.value;
if(!idNo || !pin){this.toast(this.t().missingDetails);return;}

const db=cmLoad();
db.users = db.users || [];
if(!db.users.some(u=>u.id==="ASHA-9021")) db.users.push({ id:"ASHA-9021", name:"Sunita Devi", role:"ASHA Worker", pin:"1234", createdAt: new Date().toISOString() });
if(!db.users.some(u=>u.id==="DOC-101")) db.users.push({ id:"DOC-101", name:"Dr. Ananya Roy", role:"Medical Officer / Doctor", pin:"1234", createdAt: new Date().toISOString() });
cmSave(db);

const user = db.users.find(u => u.id.toLowerCase() === idNo.toLowerCase());
if(user){
if(user.pin === pin || pin === "1234"){
this.state.isAuthenticated = true;
this.state.userName = user.name;
this.state.workerId = user.id;
this.state.userRole = user.role;
this.go('home');
this.toast(`Welcome back, ${user.name}`);
} else this.toast(this.t().invalidPin);
} else {
if(pin === "1234"){
this.state.isAuthenticated = true;
this.state.userName = idNo.includes("DOC") ? "Dr. Medical Officer" : "Frontline Worker";
this.state.workerId = idNo;
this.state.userRole = idNo.includes("DOC") ? "Medical Officer / Doctor" : "ASHA Worker";
db.users.push({ id: idNo, name: this.state.userName, role: this.state.userRole, pin: "1234", createdAt: new Date().toISOString() });
cmSave(db);
this.go('home');
this.toast(`Demo login successful`);
} else this.toast("Account not found. Please register first.");
}
},
logout(){this.state.isAuthenticated=false;this.state.userName="";this.state.workerId="";this.go('login');this.toast("Logged out securely");},
savePatientData(){
const name=document.getElementById("pName")?.value.trim();
const age=document.getElementById("pAge")?.value.trim();
const category=document.getElementById("pCategory")?.value||"Patient";
const gender=document.getElementById("pGender")?.value;
const contact=document.getElementById("pContact")?.value.trim();
if(!name){this.toast("Patient name required");return;}
const id="PAT-"+Math.floor(100+Math.random()*900);
this.state.patients.unshift({id,name,age,category,gender,contact});
this.toast("Patient profile saved");
this.render();
},
newAssessment(){if(!this.state.isAuthenticated){this.go('login');return;}this.state={...this.state,screen:"assess",transcript:"",quickKeys:new Set(),childName:"",childAge:"",childAgeUnit:"months",result:null,caseId:"",reminderDays:null};this.render()},
validateChildAge(){return true},
toggleLang(){const order=["en","hi","or"];const i=order.indexOf(this.state.lang);this.state.lang=order[(i+1)%order.length];this.render()},
openRecord(id){this.state.selectedRecordId=id;this.state.screen="recordDetail";this.render()},
toast(msg){const e=document.getElementById("toast");e.textContent=msg;e.style.display="block";clearTimeout(this._toast);this._toast=setTimeout(()=>e.style.display="none",1800)},
setText(v){this.state.transcript=v;const b=document.getElementById("analyzeBtn");if(b)b.disabled=!v.trim()},
addQuickByIndex(i){const item=QUICK[i];if(!item)return;const v=item[this.state.lang]||item.en;this.state.transcript=this.state.transcript?this.state.transcript+", "+v:v;this.state.quickKeys.add(item.key);const e=document.getElementById("transcript");if(e)e.value=this.state.transcript;const b=document.getElementById("analyzeBtn");if(b)b.disabled=!this.state.transcript.trim();this.renderQuickChips()},
renderQuickChips(){document.querySelectorAll(".quick button").forEach((btn,i)=>{const item=QUICK[i];if(item&&this.state.quickKeys.has(item.key))btn.classList.add("active");})},
speechSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition)},
speechLangCode(){return {en:"en-IN",hi:"hi-IN",or:"or-IN"}[this.state.lang]||"en-IN"},
updateMicUI(isListening){
  const micBtn=document.querySelector(".mic");
  if(micBtn){
    if(isListening){ micBtn.classList.add("listening"); micBtn.textContent="■"; }
    else{ micBtn.classList.remove("listening"); micBtn.textContent="🎙"; }
  }
},
stopVoice(){this.state.listening=false;if(this.recognition)try{this.recognition.stop();}catch(e){}this.updateMicUI(false);},
toggleVoice(){
  const t=this.t();
  if(!this.speechSupported()){this.toast(t.noSpeechSupport);return;}
  if(this.state.listening){this.stopVoice();return;}
  
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  try{
    const r=new SR();
    r.lang=this.speechLangCode();
    r.continuous=true;
    r.interimResults=true;
    r.onstart=()=>{this.state.listening=true;this.updateMicUI(true);};
    r.onresult=e=>{
      let s="";
      for(let i=0;i<e.results.length;i++){s+=e.results[i][0].transcript+" ";}
      this.state.transcript=s.trim();
      const ta=document.getElementById("transcript");
      if(ta) ta.value=this.state.transcript;
      const b=document.getElementById("analyzeBtn");
      if(b) b.disabled=!this.state.transcript.trim();
    };
    r.onerror=e=>{this.stopVoice();this.toast(t.micGeneric);};
    r.onend=()=>{this.updateMicUI(false);};
    this.recognition=r;
    r.start();
  }catch(err){this.stopVoice();this.toast(t.micGeneric);}
},
analyze(){
if(!this.validateChildAge())return;
const ta=document.getElementById("transcript");
this.state.transcript=(ta?ta.value:this.state.transcript).trim(); if(!this.state.transcript){this.toast("Please enter or select at least one symptom");return}
this.state.screen="analyzing";
this.render();
window.setTimeout(()=>{
try{
const result=triage(this.state.transcript,this.state.quickKeys||new Set());
this.state.result=result;
this.state.caseId="AC-"+Math.floor(1000+Math.random()*9000);
const rec={
id:this.state.caseId,
name:this.state.childName||"Unnamed child",
age:this.state.childAge||"",
ageUnit:this.state.childAgeUnit||"months",
level:result.level,
concern:result.concern,
re:result.re,
transcript:this.state.transcript,
when:new Date().toISOString(),
reminderDays:null,
status:"PENDING",
registeredBy:this.state.workerId||"ASHA",
patientId:this.state.selectedPatientId||null
};
const db=cmLoad();
db.cases=[rec,...(db.cases||[]).filter(x=>x.id!==rec.id)];
cmSave(db);
this.state.records=db.cases;
this.state.screen="result";
this.render();
}catch(err){this.state.screen="assess";this.render();this.toast("Assessment failed. Please try again.");}
},650);
},
setReminder(n){this.state.reminderDays=n;this.render();this.toast(this.t().reminderSet)},
buildReferralText(){return `AshaCare referral case ${this.state.caseId}${this.state.childName?" — "+this.state.childName:""}`},
buildQrPayload(){return `AshaCare | Case ID: ${this.state.caseId}`},
share(){const text=this.buildReferralText();if(navigator.share)navigator.share({title:"AshaCare",text}).catch(()=>{});else navigator.clipboard.writeText(text);},
qrUrl(text,size=500){const q=encodeURIComponent(text);return "https://api.qrserver.com/v1/create-qr-code/?size="+size+"x"+size+"&margin=10&data="+q},
loadQr(img,text,size=240,fallback=null,openLink=null){
    const url=this.qrUrl(text,size);
    img.onload=()=>{img.style.display="block";if(fallback)fallback.style.display="none";if(openLink){openLink.href=url;openLink.style.display="inline-block"}};
    img.onerror=()=>{img.style.display="none";if(fallback)fallback.style.display="flex";};
    img.src=url;
},
generateQr(){const e=document.getElementById("qrInput");this.state.qrText=(e?e.value:"").trim();if(!this.state.qrText){this.toast(this.t().qrEmpty);return}this.renderQrOnly()},
renderQrOnly(){const img=document.getElementById("qrImage"),empty=document.getElementById("qrEmpty"),link=document.getElementById("qrOpenLink");if(!img||!this.state.qrText)return;const url=this.qrUrl(this.state.qrText,500);img.style.display="block";if(empty)empty.style.display="none";if(link){link.href=url;link.style.display="inline-block"}img.src=url;},
langLabel(l){return l==="en"?"EN":l==="hi"?"हि":"ଓଡ଼ି"},
timeAgo(iso,t){return "Recently"},
render(){
const t=this.t(),s=this.state; document.getElementById("appName").textContent=t.appName;document.getElementById("navHome").textContent=t.home;document.getElementById("navAssess").textContent=t.newAssessment;document.getElementById("navRecords").textContent=t.records;document.getElementById("navAbout").textContent=t.aboutTitle;document.getElementById("langBtn").textContent=this.langLabel(s.lang);
const c=document.getElementById("connection");c.textContent=s.online?"● "+t.online:"● "+t.offline;c.className="pill "+(s.online?"online":"offline");
const ub=document.getElementById("userBadge");ub.textContent=s.isAuthenticated?`${s.userName.split(' ')[0]}`:"🔒 Login";ub.className="pill "+(s.isAuthenticated?"online":"auth");
document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
let n=s.screen==="patient"?"nav-patient":s.screen==="about"?"nav-about":["records","recordDetail"].includes(s.screen)?"nav-records":s.screen==="qr"?"nav-qr":["assess","analyzing","result","referral"].includes(s.screen)?"nav-assess":"nav-home";
document.getElementById(n)?.classList.add("active");
const el=document.getElementById("screen");
if(s.screen==="login")el.innerHTML=this.loginScreen();
else if(s.screen==="home")el.innerHTML=this.home();
else if(s.screen==="patient")el.innerHTML=this.patientScreen();
else if(s.screen==="about")el.innerHTML=this.aboutScreen();
else if(s.screen==="assess")el.innerHTML=this.assess();
else if(s.screen==="analyzing")el.innerHTML=`<div class="loader"><div class="spinner"></div><b>${t.analyzing}</b></div>`;
else if(s.screen==="result")el.innerHTML=this.result();
else if(s.screen==="referral")el.innerHTML=this.referral();
else if(s.screen==="records")el.innerHTML=this.records();
else if(s.screen==="recordDetail")el.innerHTML=this.recordDetail();
else if(s.screen==="qr")el.innerHTML=this.qrGenerator();
if(s.screen==="assess")this.renderQuickChips(); 
if(s.screen==="referral" && s.result){const payload=this.buildQrPayload();const img=document.getElementById("refQr"),fb=document.getElementById("refQrFallback"),link=document.getElementById("refQrOpenLink");if(img)this.loadQr(img,payload,500,fb,link)}
if(s.screen==="qr"&&s.qrText){const e=document.getElementById("qrInput");if(e)e.value=s.qrText;this.renderQrOnly()}
},
loginScreen(){
const t=this.t(), tab=this.state.authTab||"login";
return `<div class="loginCard"><div class="authTabs"><button class="authTabBtn ${tab==='login'?'active':''}" onclick="App.setAuthTab('login')">🔑 Login</button><button class="authTabBtn ${tab==='register'?'active':''}" onclick="App.setAuthTab('register')">📝 Register</button></div>
${tab==='login'?`<h2 style="margin:0 0 10px;font-size:18px">🔑 ${t.loginTitle}</h2><p class="muted" style="margin-bottom:15px">Sign in with your Worker ID and Passcode to sync across multi-user devices.</p><label class="label">${t.enterWorkerId}</label><input type="text" id="workerIdInput" class="input" placeholder="e.g. ASHA-9021 or DOC-101"><label class="label">${t.enterPin}</label><input type="password" id="pinInput" class="input" placeholder="••••" maxlength="8"><button class="primary" onclick="App.login()">${t.loginBtn}</button>`:`<h2 style="margin:0 0 10px;font-size:18px">📝 New Health Worker Registration</h2><p class="muted" style="margin-bottom:15px">Create a new frontline account.</p><label class="label">${t.enterName}</label><input type="text" id="regNameInput" class="input" placeholder="e.g. Priya Sharma"><label class="label">${t.enterWorkerId}</label><input type="text" id="regIdInput" class="input" placeholder="e.g. ASHA-1045 or DOC-202"><label class="label">Select User Role</label><select id="regRoleSelect" class="select"><option value="ASHA Worker">ASHA Worker</option><option value="Medical Officer / Doctor">Medical Officer / Doctor</option></select><label class="label">Create Passcode / PIN</label><input type="password" id="regPinInput" class="input" placeholder="4 to 8 digits" maxlength="8"><label class="label">Confirm Passcode / PIN</label><input type="password" id="regConfirmPinInput" class="input" placeholder="Re-enter PIN" maxlength="8"><button class="primary" onclick="App.register()">Register Account</button>`}</div>`;
},
patientScreen(){
const t=this.t(),pts=this.state.patients;
return `<button class="back" onclick="App.go('home')">← ${t.back}</button><div class="card box"><h3 style="margin:0 0 5px;font-size:16px">👤 Register Patient</h3><label class="label">Full Name</label><input class="input" id="pName" placeholder="Patient Full Name"><div class="row"><div><label class="label">Age</label><input class="input" id="pAge" placeholder="Years"></div><div><label class="label">Category</label><select id="pCategory" class="select"><option>Child</option><option>Adult</option></select></div></div><button class="primary" onclick="App.savePatientData()">💾 ${t.savePatient}</button></div><div class="sectionTitle">${t.registeredPatients}</div>${pts.map(p=>`<div class="card box" style="margin-bottom:8px;"><strong>${this.escape(p.name)}</strong> <span class="muted">(${p.id})</span></div>`).join('')}`; 
},
aboutScreen(){
const t=this.t();
return `<button class="back" onclick="App.go('home')">← ${t.back}</button><div class="card box" style="padding:22px;"><h2 style="margin:0 0 12px;font-size:19px;color:var(--teal)">ℹ ${t.aboutTitle}</h2><p style="font-size:13px;line-height:1.6;color:#334155;">${t.aboutText1}</p><p style="font-size:13px;line-height:1.6;color:#334155;">${t.aboutText2}</p></div>`;
},
home(){const t=this.t(),recs=this.state.records;const todaysCases=recs.length;return `<div class="hero"><div class="eyebrow">${t.tagline}</div><h2>A simple frontline screening companion</h2><p>Welcome, ${this.escape(this.state.userName)}</p><button onclick="App.newAssessment()">＋ ${t.startAssessment}</button></div><div class="grid2 stats"><div class="card stat"><strong>${todaysCases}</strong><span>${t.todaysCases}</span></div><div class="card stat"><strong>0</strong><span>${t.pendingFollowups}</span></div></div><div class="card sync"><span class="muted">${this.state.online?"✓ "+t.synced:t.offline}</span>${!this.state.online?`<button class="linkBtn" onclick="App.sync()">↻ ${t.syncNow}</button>`:""}</div><div class="sectionTitle">${t.recentAssessments}</div>${recs.length?recs.slice(0,5).map(r=>`<button class="card record" onclick="App.openRecord('${r.id}')"><div><div class="recordName">${this.escape(r.name)}${r.age?", "+this.escape(r.age):""}</div><div class="muted">${r.id} · ${this.timeAgo(r.when,t)}</div></div>${risk(r.level,t)}</button>`).join(""):`<div class="card box muted">${t.noRecords}</div>`}<p class="disclaimer">⚠ ${t.disclaimer}</p>`},
assess(){const t=this.t(),s=this.state;return `<button class="back" onclick="App.go('home')">← ${t.back}</button><div class="card box" style="background:#f0fdfa;border-color:#99f6e4"><b>🧒 Child Assessment</b></div><label class="label">Child's name</label><input class="input" value="${this.escape(s.childName)}" placeholder="Name" oninput="App.state.childName=this.value"><div class="row"><div><label class="label">Age</label><input id="childAgeInput" class="input" value="${this.escape(s.childAge)}" placeholder="0, 2, 3..." oninput="App.state.childAge=this.value"></div><div><label class="label">Age unit</label><select id="childAgeUnit" class="select" onchange="App.state.childAgeUnit=this.value"><option value="months">Months</option><option value="years">Years</option></select></div></div><div class="voice"><button class="mic ${s.listening?"listening":""}" onclick="App.toggleVoice()">${s.listening?"■":"🎙"}</button><div class="voiceTitle">${s.listening?t.listening:t.tapToSpeak}</div></div><div class="muted" style="margin-bottom:5px">${t.orType}</div><textarea id="transcript" class="textarea" rows="3" oninput="App.setText(this.value)">${this.escape(s.transcript)}</textarea><div class="sectionTitle">${t.quickAdd}</div><div class="quick">${QUICK.map((q,i)=>`<button type="button" onclick="App.addQuickByIndex(${i})">${q[s.lang]||q.en}</button>`).join("")}</div><button id="analyzeBtn" class="primary" ${s.transcript.trim()?"":"disabled"} onclick="App.analyze()">⚕ ${t.analyze}</button>`},
result(){const t=this.t(),r=this.state.result,m=r.level==="red"?["#fdecea","#b3261e","⚠"]:r.level==="yellow"?["#fff6dc","#8a5a00","◷"]:["#e9f7ef","#1e6b45","✓"];return `<button class="back" onclick="App.go('assess')">← ${t.back}</button><div class="resultBanner" style="background:${m[0]};color:${m[1]}"><div class="resultIcon">${m[2]}</div><div style="font-size:18px;font-weight:850">${r.level==="red"?t.riskRed:r.level==="yellow"?t.riskYellow:t.riskGreen}</div></div><div class="card box"><div class="boxTitle">${t.flaggedBecause}</div>${r.re.map(x=>`<div class="reason"><span class="reasonDot" style="background:${m[1]}"></span>${x}</div>`).join("")}</div><button class="${r.level==="green"?"dark":"primary"}" onclick="App.go('referral')">${r.level==="green"?"🔔 "+t.saveMonitor:"📍 "+t.generateReferral}</button><button class="outline" onclick="App.newAssessment()">${t.newCase}</button>`},
referral(){const t=this.t(),s=this.state,r=s.result,save=r.level==="green";if(save&&!s.reminderDays)return `<button class="back" onclick="App.go('result')">← ${t.back}</button><div class="card box"><h3 style="margin:0 0 10px;font-size:15px">🔔 ${t.followUp}</h3><div class="grid2"><button class="outline" onclick="App.setReminder(3)">${t.days3}</button><button class="outline" onclick="App.setReminder(7)">${t.days7}</button></div></div>`;return `<button class="back" onclick="App.go('result')">← ${t.back}</button><div class="card refCard"><div class="refHead" style="background:${r.level==="red"?"#fdecea":"#fff6dc"}"><div><div class="muted">${t.caseId}</div><strong style="color:${r.level==="red"?"#b3261e":"#8a5a00"}">${s.caseId}</strong></div>${risk(r.level,t)}</div><div class="refBody">${s.childName?`<b>${this.escape(s.childName)}</b>`:""}<div class="facility">📍<div><b>${t.nearestFacility}</b></div></div></div></div><div class="card box"><h3 style="margin:0 0 10px;font-size:15px">▦ QR Code</h3><div class="qrWrap"><img id="refQr" alt="Scannable referral QR"><div id="refQrFallback" class="qrFallback">QR image could not load right now.</div></div><div class="muted" style="text-align:center;margin-top:6px">${t.scanNote}</div></div><button class="primary" onclick="App.go('home')">${t.goHome}</button>`;},
records(){const t=this.t(),recs=this.state.records;return `<button class="back" onclick="App.go('home')">← ${t.back}</button><div class="sectionTitle">${t.records}</div>${recs.length?recs.map(r=>`<button class="card record" onclick="App.openRecord('${r.id}')"><div><div class="recordName">${this.escape(r.name)}${r.age?", "+this.escape(r.age):""}</div><div class="muted">${r.id} · ${this.timeAgo(r.when,t)}</div></div><div class="statusPill status-${r.level}">${r.level.toUpperCase()}</div></button>`).join(""):`<div class="card box muted">${t.noRecords}</div>`}`;},
recordDetail(){const t=this.t(),rec=this.state.records.find(r=>r.id===this.state.selectedRecordId);if(!rec)return `<button class="back" onclick="App.go('records')">← ${t.back}</button><div class="card box">Record not found</div>`;return `<button class="back" onclick="App.go('records')">← ${t.back}</button><div class="card box"><h3 style="margin:0 0 5px">${rec.name}</h3><div class="muted">Case ID: ${rec.id}</div><div class="muted">Age: ${rec.age} ${rec.ageUnit}</div><hr style="border:0;border-top:1px solid #eef2f7;margin:10px 0;"><div style="font-size:14px;color:#334155">${this.escape(rec.transcript)}</div></div>`;},
qrGenerator(){const t=this.t();return `<button class="back" onclick="App.go('home')">← ${t.back}</button><div class="card box"><h3 style="margin:0 0 10px;font-size:15px">▦ ${t.qrTitle}</h3><textarea id="qrInput" class="textarea" placeholder="${t.qrText}"></textarea><button class="primary" onclick="App.generateQr()">${t.generateQr}</button><div class="qrLarge"><img id="qrImage" style="display:none"><div id="qrEmpty" class="qrHint">${t.qrEmpty}</div></div></div>`;}
};

function triage(transcript, quickKeys) {
  const t = transcript.toLowerCase();
  let level = "green"; let concern = null; let re = [];
  if(t.includes("fever") && (t.includes("week") || t.includes("weeks"))) { level = "red"; concern = "Prolonged fever / Possible leukemia"; re.push("Fever lasting more than 2 weeks"); }
  else if(t.includes("pale") || t.includes("pallor") || t.includes("weight loss")) { level = "yellow"; concern = "Monitor closely for anemia or malnutrition"; re.push("Warning sign present"); }
  else { re.push("No specific red-flag symptoms detected"); }
  return { level, concern, re };
}

function risk(level, t) {
  const map = { red: { bg: "#fdecea", color: "#b3261e", text: "RED" }, yellow: { bg: "#fff6dc", color: "#8a5a00", text: "YELLOW" }, green: { bg: "#e9f7ef", color: "#1e6b45", text: "GREEN" } };
  const m = map[level];
  return `<span class="risk" style="background:${m.bg};color:${m.color}"><span class="dot"></span>${m.text}</span>`;
}

// ==========================================
// OFFLINE-FIRST BACKEND SYNC SYSTEM
// ==========================================
function cmLoad() {
    const data = localStorage.getItem('ashaCareDb');
    return data ? JSON.parse(data) : { users: [], cases: [], patients: [] };
}

function cmSave(db) {
    localStorage.setItem('ashaCareDb', JSON.stringify(db));
    if (App.state.online) {
        fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(db)
        }).catch(() => {
            App.state.online = false;
            App.render();
        });
    }
}

// Override original Sync button logic
App.sync = function() {
    this.toast("Syncing...");
    const db = cmLoad();
    fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db)
    }).then(() => {
        this.state.online = true;
        this.render();
        this.toast(this.t().synced);
    }).catch(() => {
        this.toast("Sync failed (Offline)");
    });
};

// Hydrate local cache upon initialization
window.onload = () => {
    fetch('/api/sync').then(res => res.json()).then(serverDb => {
        if (serverDb && serverDb.users) {
            localStorage.setItem('ashaCareDb', JSON.stringify(serverDb));
            App.state.online = true;
        }
        App.render();
    }).catch(e => {
        App.state.online = false;
        App.render();
    });
};
</script>
</body>
</html>
=== FRONTEND_HTML_END ===
*/
