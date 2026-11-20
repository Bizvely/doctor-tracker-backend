const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'doctorTrackerSecretKey2026';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => console.error('MongoDB Connection Error:', err.message));

// ==================== MONGOOSE SCHEMAS & MODELS ====================

// 1. User Schema (Admin / Staff / Doctor Login)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// 2. Doctor Schema
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  hospital: { type: String, required: true },
  phone: { type: String, required: true },
  schedule: { type: String, required: true },
  status: { type: String, enum: ['Available', 'Busy', 'On Leave'], default: 'Available' },
  fee: { type: Number, default: 500 }
}, { timestamps: true });

const Doctor = mongoose.model('Doctor', doctorSchema);

// 3. Patient / Tracker Schema
const patientSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  age: { type: Number, required: true },
  phone: { type: String, required: true },
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointmentDate: { type: String, required: true },
  status: { type: String, enum: ['Waiting', 'In Consultation', 'Completed', 'Cancelled'], default: 'Waiting' },
  notes: { type: String, default: '' }
}, { timestamps: true });

const Patient = mongoose.model('Patient', patientSchema);

// ==================== AUTH MIDDLEWARE ====================
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access Denied. No token provided.' });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid Token' });
  }
};

// ==================== API ROUTES ====================

// Health Check Route
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Doctor Tracker API is live and running!' });
});

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// --- DOCTOR ROUTES ---
// Get all doctors (Public / Protected)
app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching doctors', error: err.message });
  }
});

// Add a new doctor
app.post('/api/doctors', async (req, res) => {
  try {
    const newDoctor = new Doctor(req.body);
    const savedDoctor = await newDoctor.save();
    res.status(201).json(savedDoctor);
  } catch (err) {
    res.status(400).json({ message: 'Error adding doctor', error: err.message });
  }
});

// Update doctor status or info
app.put('/api/doctors/:id', async (req, res) => {
  try {
    const updatedDoctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedDoctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(updatedDoctor);
  } catch (err) {
    res.status(400).json({ message: 'Error updating doctor', error: err.message });
  }
});

// Delete a doctor
app.delete('/api/doctors/:id', async (req, res) => {
  try {
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Doctor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting doctor', error: err.message });
  }
});

// --- PATIENT TRACKER ROUTES ---
// Get all patients with doctor details
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.find().populate('assignedDoctor', 'name specialty hospital status').sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching patients', error: err.message });
  }
});

// Add a new patient record
app.post('/api/patients', async (req, res) => {
  try {
    const newPatient = new Patient(req.body);
    const savedPatient = await newPatient.save();
    const populatedPatient = await Patient.findById(savedPatient._id).populate('assignedDoctor', 'name specialty hospital status');
    res.status(201).json(populatedPatient);
  } catch (err) {
    res.status(400).json({ message: 'Error adding patient', error: err.message });
  }
});

// Update patient status
app.put('/api/patients/:id', async (req, res) => {
  try {
    const updatedPatient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('assignedDoctor', 'name specialty hospital status');
    if (!updatedPatient) return res.status(404).json({ message: 'Patient not found' });
    res.json(updatedPatient);
  } catch (err) {
    res.status(400).json({ message: 'Error updating patient', error: err.message });
  }
});

// Delete patient record
app.delete('/api/patients/:id', async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ message: 'Patient record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting patient', error: err.message });
  }
});

// Dashboard Summary Stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const availableDoctors = await Doctor.countDocuments({ status: 'Available' });
    const totalPatients = await Patient.countDocuments();
    const waitingPatients = await Patient.countDocuments({ status: 'Waiting' });

    res.json({
      totalDoctors,
      availableDoctors,
      totalPatients,
      waitingPatients
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
