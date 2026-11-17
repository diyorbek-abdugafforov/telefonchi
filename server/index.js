import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';

import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import devicesRoutes from './routes/devices.js';
import purchasesRoutes from './routes/purchases.js';
import salesRoutes from './routes/sales.js';
import inventoryRoutes from './routes/inventory.js';
import customersRoutes from './routes/customers.js';
import suppliersRoutes from './routes/suppliers.js';
import financeRoutes from './routes/finance.js';
import repairsRoutes from './routes/repairs.js';
import reportsRoutes from './routes/reports.js';
import staffRoutes from './routes/staff.js';
import settingsRoutes from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database with schemas and sample seeds
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Image upload endpoint (supports base64 image data from camera or file picker)
app.post('/api/upload', (req, res) => {
  try {
    const { image, name = 'phone_photo' } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: "Rasm ma'lumotlari kiritilmadi" });
    }

    // Check if base64 data url
    const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      // If it's already an HTTP URL or local upload path, return as is
      if (image.startsWith('http') || image.startsWith('/uploads/')) {
        return res.json({ success: true, url: image });
      }
      return res.status(400).json({ success: false, error: "Noto'g'ri rasm formati (base64 talab etiladi)" });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);
    const fileUrl = `/uploads/${filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/repairs', repairsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    system: 'Telefon savdosi va ombor hisobi tizimi',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production build
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Telefon Savdosi va Ombor Tizimi Serveri Ishga Tushdi!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`💼 Boshqaruv: Barcha rollar va modullar tayyor`);
  console.log(`=======================================================`);
});
