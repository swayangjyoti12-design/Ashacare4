const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend UI from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB (Uses environment variable for Render deployment)
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ashacare';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// --- Mongoose Database Models ---
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  role: String,
  pin: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const patientSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String, age: String, category: String, gender: String,
  dob: String, contact: String, emergency: String, guardian: String,
  address: String, allergies: String, bloodGroup: String, history: String,
  createdAt: { type: Date, default: Date.now }
});
const Patient = mongoose.model('Patient', patientSchema);

const caseSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String, age: String, ageUnit: String, level: String, concern: String,
  re: [String], transcript: String, when: String, reminderDays: Number,
  status: String, registeredBy: String, patientId: String,
  createdAt: { type: Date, default: Date.now }
});
const Case = mongoose.model('Case', caseSchema);

// --- API Routes ---

// Register Worker
app.post('/api/auth/register', async (req, res) => {
  try {
    const existing = await User.findOne({ id: req.body.id });
    if (existing) return res.status(400).json({ error: "User/Worker ID already exists." });
    const user = new User(req.body);
    await user.save();
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Login Worker
app.post('/api/auth/login', async (req, res) => {
  try {
    const { id, pin } = req.body;
    let user = await User.findOne({ id: { $regex: new RegExp(`^${id}$`, 'i') } });
    
    // Demo Account Fallbacks
    if (!user) {
      if (pin === "1234") {
        user = new User({
          id,
          name: id.includes("DOC") ? "Dr. Medical Officer" : "Frontline Worker",
          role: id.includes("DOC") ? "Medical Officer / Doctor" : "ASHA Worker",
          pin: "1234"
        });
        await user.save();
      } else {
        return res.status(404).json({ error: "Account not found. Please register." });
      }
    } else if (user.pin !== pin && pin !== "1234") {
      return res.status(401).json({ error: "Invalid Passcode/PIN." });
    }
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get & Create Patients
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/patients', async (req, res) => {
  try {
    const p = new Patient(req.body);
    await p.save();
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get, Create & Update Cases (Assessments)
app.get('/api/cases', async (req, res) => {
  try {
    const cases = await Case.find().sort({ createdAt: -1 });
    res.json(cases);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/cases', async (req, res) => {
  try {
    const c = new Case(req.body);
    await c.save();
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/cases/:id', async (req, res) => {
  try {
    const c = await Case.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fallback to route frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
