import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root, then fall back to server directory
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

// Cryptographic JWT Engine (HMAC-SHA256)
const JWT_SECRET = process.env.JWT_SECRET || 'lab_buddies_master_secret_key_2026_!#987654321';

const signJwt = (payload, expiresInMs = 7 * 24 * 60 * 60 * 1000) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Date.now() + expiresInMs;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
};

const verifyJwt = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  if (signature.length !== expectedSignature.length) return null;
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );

  if (!isValid) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
};

// Login brute-force rate limiter (Max 5 attempts / 15 mins)
const loginAttemptsMap = new Map();

// Initialize Resend (with safety checks for default template key value)
const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_api_key_here'
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Initialize Cloudinary if credentials are provided
const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('Cloudinary service initialized successfully.');
} else {
  console.log('Cloudinary credentials missing. File uploads will fall back to local disk storage.');
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Configure CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- MongoDB / Mongoose Connections ---
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/share-with-buddies';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- Voice Room State and Configuration ---
const voiceRooms = new Map(); // roomPin -> Map<socketId, { name, isMuted }>
const voiceMicLocks = new Map(); // roomPin -> boolean (true = mics locked by host)
const VOICE_PARTICIPANT_LIMIT = parseInt(process.env.VOICE_PARTICIPANT_LIMIT, 10) || 20;

// Configurable STUN/TURN servers
let ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" }
];
if (process.env.ICE_SERVERS) {
  try {
    ICE_SERVERS = JSON.parse(process.env.ICE_SERVERS);
  } catch (e) {
    console.error('Failed to parse ICE_SERVERS env variable, using default Google STUN.', e);
  }
}

// --- Schemas & Models ---

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  plan: { type: String, enum: ['free', 'pro', 'premium', 'student'], default: 'free' },
  otpCode: { type: String },
  otpExpires: { type: Date },
  rollNumber: { type: String },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const RoomSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  maxMembers: { type: Number, default: 20 },
  autoDeleteTimer: { type: String, default: '2 Hours' },
  isLocked: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  isFileSharingEnabled: { type: Boolean, default: true },
  roomVisibility: { type: Boolean, default: true },
  createdAt: { type: String, required: true },
  createdAtMs: { type: Number, default: Date.now },
  createdBy: { type: String, required: true },
  originalCreator: { type: String },
  status: { type: String, default: 'Active' },
  password: { type: String },
  storageLimit: { type: Number, default: 25 * 1024 * 1024 },
  voiceMicsLocked: { type: Boolean, default: false },
});
const Room = mongoose.model('Room', RoomSchema);

const FeedItemSchema = new mongoose.Schema({
  roomPin: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ['message', 'code', 'file'] },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, required: true },
  timestamp: { type: String, required: true },
  content: { type: String }, // messages
  code: { type: String },    // snippets
  language: { type: String },// snippets language
  fileName: { type: String },// files
  fileSize: { type: String },// files
  fileType: { type: String },// files
  fileUrl: { type: String }, // files downloadable url
  cloudinaryPublicId: { type: String }, // files hosted on Cloudinary
  fileSizeBytes: { type: Number }, // raw file size in bytes
  totalDownloads: { type: Number, default: 0 },
  uniqueDownloaders: [{ type: String }],
});
const FeedItem = mongoose.model('FeedItem', FeedItemSchema);

const NoteSchema = new mongoose.Schema({
  roomPin: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  color: { type: String, default: 'yellow' },
  pinned: { type: Boolean, default: false },
  createdBy: { type: String, required: true },
  createdAt: { type: String, required: true },
});
const Note = mongoose.model('Note', NoteSchema);

const MemberSchema = new mongoose.Schema({
  roomPin: { type: String, required: true, index: true },
  socketId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, required: true, enum: ['host', 'member'] },
  joinedAt: { type: String, required: true },
  isOnline: { type: Boolean, default: true },
  isMuted: { type: Boolean, default: false },
});
const Member = mongoose.model('Member', MemberSchema);

// Activity Log schema (for history tab)
const ActivitySchema = new mongoose.Schema({
  roomPin: { type: String, required: true, index: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: String, required: true },
  user: { type: String }
});
const Activity = mongoose.model('Activity', ActivitySchema);

// Lifetime Platform Statistics Schema
const PlatformStatSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  totalRoomsCreated: { type: Number, default: 0 },
  totalFilesUploaded: { type: Number, default: 0 },
  totalDownloadsServed: { type: Number, default: 0 },
  totalStorageBytesProcessed: { type: Number, default: 0 },
  peakConcurrentUsers: { type: Number, default: 0 },
  totalRewardAdsWatched: { type: Number, default: 0 },
  totalBannerImpressions: { type: Number, default: 0 },
  totalBannerClicks: { type: Number, default: 0 },
});
const PlatformStat = mongoose.model('PlatformStat', PlatformStatSchema);

// Privacy-Safe Room Archive Schema (Metadata only — zero message/file contents)
const RoomArchiveSchema = new mongoose.Schema({
  pin: { type: String, required: true, index: true },
  name: { type: String, default: 'Study Room' },
  createdBy: { type: String, default: 'Host' },
  totalParticipants: { type: Number, default: 1 },
  totalFiles: { type: Number, default: 0 },
  totalStorageMB: { type: String, default: '0.00' },
  totalDownloads: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  destroyedAt: { type: Date, default: Date.now },
  destructionReason: { type: String, default: 'Timer Expiry' },
  durationMinutes: { type: Number, default: 0 },
});
const RoomArchive = mongoose.model('RoomArchive', RoomArchiveSchema);

// Admin Action Audit Trail Schema
const AdminAuditLogSchema = new mongoose.Schema({
  adminEmail: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String, default: '' },
  details: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});
const AdminAuditLog = mongoose.model('AdminAuditLog', AdminAuditLogSchema);

// Helper to record admin audit logs
const logAdminAction = async (adminEmail, action, target, details) => {
  try {
    await AdminAuditLog.create({ adminEmail, action, target, details });
  } catch (err) {
    console.error('[AUDIT ERROR]:', err);
  }
};

// Run database backfill to populate missing fileSizeBytes for historic files
const runDatabaseBackfill = async () => {
  try {
    const itemsToMigrate = await FeedItem.find({ type: 'file', $or: [{ fileSizeBytes: { $exists: false } }, { fileSizeBytes: null }, { fileSizeBytes: 0 }] });
    if (itemsToMigrate.length > 0) {
      console.log(`[Migration] Found ${itemsToMigrate.length} file feed items with missing/zero fileSizeBytes. Backfilling...`);
      let migratedCount = 0;
      for (const item of itemsToMigrate) {
        if (item.fileSize) {
          const match = item.fileSize.match(/([\d.]+)\s*(KB|MB|GB|Bytes|B)/i);
          if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            let bytes = 0;
            if (unit.startsWith('K')) bytes = Math.round(val * 1024);
            else if (unit.startsWith('M')) bytes = Math.round(val * 1024 * 1024);
            else if (unit.startsWith('G')) bytes = Math.round(val * 1024 * 1024 * 1024);
            else bytes = Math.round(val);
            
            item.fileSizeBytes = bytes;
            await item.save();
            migratedCount++;
          }
        }
      }
      console.log(`[Migration] Backfilled fileSizeBytes for ${migratedCount} files successfully.`);
    }

    // Sync PlatformStat global metrics baseline
    const fileItems = await FeedItem.find({ type: 'file' });
    const currentStorageBytes = fileItems.reduce((acc, f) => acc + (f.fileSizeBytes || 0), 0);
    const currentDownloads = fileItems.reduce((acc, f) => acc + (f.totalDownloads || 0), 0);
    const totalFiles = fileItems.length;

    let stats = await PlatformStat.findOne({ key: 'global' });
    if (!stats) {
      const activeRoomsCount = await Room.countDocuments({ status: 'Active' });
      await PlatformStat.create({
        key: 'global',
        totalRoomsCreated: activeRoomsCount,
        totalFilesUploaded: totalFiles,
        totalDownloadsServed: currentDownloads,
        totalStorageBytesProcessed: currentStorageBytes,
      });
      console.log(`[Migration] Initialized global PlatformStat baseline.`);
    } else {
      let updated = false;
      if (!stats.totalStorageBytesProcessed || stats.totalStorageBytesProcessed < currentStorageBytes) {
        stats.totalStorageBytesProcessed = currentStorageBytes;
        updated = true;
      }
      if (!stats.totalFilesUploaded || stats.totalFilesUploaded < totalFiles) {
        stats.totalFilesUploaded = totalFiles;
        updated = true;
      }
      if (!stats.totalDownloadsServed || stats.totalDownloadsServed < currentDownloads) {
        stats.totalDownloadsServed = currentDownloads;
        updated = true;
      }
      if (updated) {
        await stats.save();
        console.log(`[Migration] Synced global PlatformStat lifetime metrics to active DB baselines.`);
      }
    }
  } catch (migErr) {
    console.error('[Migration] Failed to run database migration:', migErr);
  }
};
// Run the backfill on startup after a safe delay
setTimeout(runDatabaseBackfill, 5000);

// Helper to increment platform lifetime statistics
const incrementPlatformStat = async (field, amount = 1) => {
  try {
    await PlatformStat.findOneAndUpdate(
      { key: 'global' },
      { $inc: { [field]: amount } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('[PLATFORM STAT ERROR]:', err);
  }
};

// --- Room Cleanup & Self-Destruct Helpers ---
const parseTimerDuration = (timerStr) => {
  if (!timerStr) return 2 * 60 * 60 * 1000;
  let totalMs = 0;
  const hourMatch = timerStr.match(/(\d+)\s*h(?:our)?s?/i);
  if (hourMatch) {
    totalMs += parseInt(hourMatch[1], 10) * 60 * 60 * 1000;
  }
  const minMatch = timerStr.match(/(\d+)\s*m(?:in(?:ute)?)?s?/i);
  if (minMatch) {
    totalMs += parseInt(minMatch[1], 10) * 60 * 1000;
  }
  if (totalMs === 0) {
    const rawNum = parseInt(timerStr, 10);
    if (!isNaN(rawNum) && rawNum > 0) totalMs = rawNum * 60 * 1000;
  }
  return totalMs > 0 ? totalMs : 2 * 60 * 60 * 1000;
};

const cleanupRoomData = async (pin, destructionReason = 'Timer Expiry') => {
  try {
    console.log(`\n=============================================`);
    console.log(`[CLEANUP] Starting cleanup for Room PIN: ${pin} (Reason: ${destructionReason})`);

    const room = await Room.findOne({ pin });
    const files = await FeedItem.find({ roomPin: pin, type: 'file' });
    const membersCount = await Member.countDocuments({ roomPin: pin });
    const totalStorageBytes = files.reduce((acc, f) => acc + (f.fileSizeBytes || 0), 0);
    const totalDownloads = files.reduce((acc, f) => acc + (f.totalDownloads || 0), 0);
    
    // Save Privacy-Safe Room Archive Summary
    if (room) {
      const createdAtMs = room.createdAtMs || new Date(room.createdAt).getTime() || Date.now();
      const durationMin = Math.round((Date.now() - createdAtMs) / (60 * 1000));
      await RoomArchive.create({
        pin,
        name: room.name || 'Study Room',
        createdBy: room.createdBy || 'Host',
        totalParticipants: Math.max(1, membersCount),
        totalFiles: files.length,
        totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
        totalDownloads,
        createdAt: new Date(createdAtMs),
        destroyedAt: new Date(),
        destructionReason,
        durationMinutes: durationMin > 0 ? durationMin : 1,
      });
    }

    const deletedPublicIds = [];
    
    // 2. Delete files from Cloudinary if hosted there
    for (const file of files) {
      if (file.cloudinaryPublicId && useCloudinary) {
        try {
          const ext = file.fileType ? file.fileType.toLowerCase() : '';
          const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
          const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
          const resourceType = isImage ? 'image' : isVideo ? 'video' : 'raw';
          
          await cloudinary.uploader.destroy(file.cloudinaryPublicId, { resource_type: resourceType });
          deletedPublicIds.push(file.cloudinaryPublicId);
          console.log(`[CLEANUP] Deleted Cloudinary asset: ${file.fileName} (${file.cloudinaryPublicId}) [${resourceType}]`);
        } catch (cloudinaryErr) {
          console.error(`[CLEANUP] Failed to delete file ${file.fileName} from Cloudinary:`, cloudinaryErr);
        }
      }
      
      // 3. Fallback: delete from local uploads folder if stored locally
      if (file.fileUrl && file.fileUrl.includes('/uploads/')) {
        const localFileName = file.fileUrl.substring(file.fileUrl.lastIndexOf('/') + 1);
        const localFilePath = path.join(__dirname, 'uploads', localFileName);
        if (fs.existsSync(localFilePath)) {
          try {
            fs.unlinkSync(localFilePath);
            console.log(`[CLEANUP] Deleted local file: ${localFileName}`);
          } catch (unlinkErr) {
            console.error(`[CLEANUP] Failed to delete local file ${localFilePath}:`, unlinkErr);
          }
        }
      }
    }

    // 4. Atomically purge all associated MongoDB collections
    const [delRoom, delFeed, delNotes, delMembers, delActivities] = await Promise.all([
      Room.deleteMany({ pin }),
      FeedItem.deleteMany({ roomPin: pin }),
      Note.deleteMany({ roomPin: pin }),
      Member.deleteMany({ roomPin: pin }),
      Activity.deleteMany({ roomPin: pin }),
    ]);

    // 5. Broadcast expire event to all connected sockets
    io.to(pin).emit('room-expired');

    console.log(`[CLEANUP AUDIT] Room PIN: ${pin}`);
    console.log(`  - Room Document Purged: ${delRoom.deletedCount}`);
    console.log(`  - Feed Items (Messages, Code, Files) Destroyed: ${delFeed.deletedCount}`);
    console.log(`  - Notes & Collaborative Pads Destroyed: ${delNotes.deletedCount}`);
    console.log(`  - Active Members Cleared: ${delMembers.deletedCount}`);
    console.log(`  - Activity & History Logs Destroyed: ${delActivities.deletedCount}`);
    console.log(`  - Cloudinary Media Assets Purged: ${deletedPublicIds.length} (${JSON.stringify(deletedPublicIds)})`);
    console.log(`[CLEANUP AUDIT] Room #${pin} and all associated data completely destroyed.`);
    console.log(`=============================================\n`);
  } catch (err) {
    console.error(`[CLEANUP] Error purger failed for room ${pin}:`, err);
  }
};

// --- Multer File Storage configuration (Scalable Local Storage) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    // Keep extension but add timestamp to ensure unique naming
    const fileExt = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExt);
    cb(null, `${baseName}-${Date.now()}${fileExt}`);
  },
});
const upload = multer({ storage });

// --- Express HTTP Endpoints ---

// Auth: Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, country, state } = req.body;

    // Presence checks
    if (!name || !email || !password || !country || !state) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Name check
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long.' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long, containing 1 uppercase, 1 lowercase, 1 number, and 1 special symbol (@$!%*?&).' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash password before storing (salt rounds = 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      country,
      state,
      isVerified: false
    });
    await newUser.save();

    return res.status(201).json({
      message: 'Account created successfully!',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        country: newUser.country,
        state: newUser.state,
        isVerified: newUser.isVerified
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // NoSQL Injection Defense: Strict string verification
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid email or password format.' });
    }

    // Brute-force rate limiting (Max 5 failed attempts per IP / 15 minutes)
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const attempts = loginAttemptsMap.get(ip) || { count: 0, lockUntil: 0 };

    if (attempts.lockUntil > now) {
      const waitMin = Math.ceil((attempts.lockUntil - now) / 60000);
      return res.status(429).json({ error: `Too many failed login attempts. IP locked for ${waitMin} more minute(s).` });
    }

    const user = await User.findOne({ email: email.trim() });
    const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !passwordMatch) {
      attempts.count += 1;
      if (attempts.count >= 5) {
        attempts.lockUntil = now + 15 * 60 * 1000; // 15 min lock
        console.warn(`[SECURITY] Locked IP ${ip} due to 5 consecutive failed login attempts on ${email}`);
      }
      loginAttemptsMap.set(ip, attempts);
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Clear failed attempts on success
    loginAttemptsMap.delete(ip);

    // Generate Tamper-Proof Signed JWT
    const token = signJwt({
      id: user._id.toString(),
      email: user.email,
      role: user.role || 'user',
      plan: user.plan || 'free'
    });

    return res.status(200).json({
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        plan: user.plan || 'free',
        country: user.country,
        state: user.state,
        isVerified: user.isVerified,
        rollNumber: user.rollNumber
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// Auth: Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await user.save();

    if (resend) {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'contact@hariommodi.online';
        await resend.emails.send({
          from: `Lab Buddies <${fromEmail}>`,
          to: email,
          subject: '🔐 Your Verification Code — Lab Buddies',
          html: `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <title>Verify your Lab Buddies account</title>
              </head>
              <body style="margin:0;padding:0;width:100%;background-color:#09090b;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <div style="width:100%;max-width:600px;margin:0 auto;padding:16px 8px;box-sizing:border-box;">
                  <div style="background-color:#121215;border:1px solid rgba(255,255,255,0.1);border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.8);">

                    <!-- Top accent bar -->
                    <div style="background:linear-gradient(90deg,#FFD600 0%,#FF6A00 100%);height:4px;width:100%;"></div>

                    <!-- Header -->
                    <div style="padding:32px 24px 20px 24px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;">
                      <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:0.05em;margin-bottom:4px;">LAB BUDDIES</div>
                      <div style="font-size:12px;color:#FFD600;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">Instant Study Rooms — No Login Required</div>
                    </div>

                    <!-- Body -->
                    <div style="padding:28px 24px;">
                      <div style="font-size:22px;font-weight:800;color:#ffffff;margin-bottom:14px;letter-spacing:-0.02em;">Verify your account 👋</div>
                      <div style="font-size:15px;color:#a1a1aa;line-height:1.7;margin-bottom:24px;">
                        Use the one-time verification code below to confirm your Lab Buddies account. This code expires in <strong style="color:#f4f4f5;">10 minutes</strong>.
                      </div>

                      <!-- OTP Box -->
                      <div style="background:rgba(255,214,0,0.08);border:2px solid rgba(255,214,0,0.4);border-radius:14px;padding:28px 20px;text-align:center;margin:0 0 24px 0;">
                        <div style="font-size:11px;font-weight:700;color:#FFD600;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:16px;">Your Verification Code</div>
                        <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#FFD600;font-variant-numeric:tabular-nums;">${otp}</div>
                      </div>

                      <!-- Steps -->
                      <div style="background:#0e0e11;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
                        <div style="font-size:13px;font-weight:700;color:#ffffff;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.06em;">What happens next?</div>
                        <div style="font-size:13px;color:#a1a1aa;margin-bottom:10px;">
                          <span style="color:#FFD600;font-weight:bold;margin-right:10px;">✓</span>
                          <strong style="color:#f4f4f5;">Enter the code</strong> on the verification screen in Lab Buddies.
                        </div>
                        <div style="font-size:13px;color:#a1a1aa;">
                          <span style="color:#FFD600;font-weight:bold;margin-right:10px;">✓</span>
                          <strong style="color:#f4f4f5;">Start collaborating</strong> — create study rooms, share files, and share code instantly.
                        </div>
                      </div>

                      <div style="font-size:12px;color:#52525b;line-height:1.6;">
                        If you didn't create a Lab Buddies account, you can safely ignore this email. This code will expire automatically.
                      </div>
                    </div>

                    <!-- Footer -->
                    <div style="padding:20px 24px;background:#0c0c0e;border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-size:12px;color:#71717a;line-height:1.6;">
                      <div>Lab Buddies — Free, no-login study rooms for students</div>
                      <div>© 2026 Lab Buddies. All rights reserved.</div>
                    </div>

                  </div>
                </div>
              </body>
            </html>
          `
        });
        console.log(`[RESEND EMAIL] Successfully sent OTP to ${email}`);
      } catch (emailErr) {
        console.error('Failed to send email via Resend, falling back to simulator:', emailErr);
        console.log(`[SIMULATED EMAIL FALLBACK] To: ${email} | Subject: Verification OTP | Code: ${otp}`);
      }
    } else {
      console.log(`[SIMULATED EMAIL] To: ${email} | Subject: Verification OTP | Code: ${otp}`);
    }

    return res.status(200).json({
      message: 'OTP sent successfully!'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// Auth: Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ error: 'Invalid OTP code.' });
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json({ error: 'OTP code expired.' });
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: 'Email verified successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        country: user.country,
        state: user.state,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Verification failed.' });
  }
});

// Update profile details (Name & Roll Number)
app.put('/api/auth/update-profile', async (req, res) => {
  try {
    const { email, name, rollNumber } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (name) user.name = name;
    if (rollNumber !== undefined) user.rollNumber = rollNumber;
    await user.save();

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        country: user.country,
        state: user.state,
        isVerified: user.isVerified,
        rollNumber: user.rollNumber
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Health check ping route
app.get('/ping', (req, res) => {
  res.send('pong');
});

// REST API endpoint to create a room (prevents race condition in deployed high-latency environments)
app.post('/api/room', async (req, res) => {
  try {
    const { pin, name, maxMembers, autoDeleteTimer, password, createdBy } = req.body;

    const existing = await Room.findOne({ pin });
    if (existing) {
      return res.status(400).json({ error: 'Room already exists.' });
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';

    const newRoom = new Room({
      pin,
      name,
      maxMembers,
      autoDeleteTimer,
      password: password || undefined,
      isLocked: false,
      isMuted: false,
      isFileSharingEnabled: true,
      roomVisibility: true,
      createdAt: timestamp,
      createdAtMs: Date.now(),
      createdBy,
      originalCreator: createdBy,
      status: 'Active',
      storageLimit: 25 * 1024 * 1024 // 25MB initial limit
    });

    await newRoom.save();
    console.log(`Room ${pin} successfully created via REST API.`);
    return res.status(201).json({ success: true, room: newRoom });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error creating room.' });
  }
});

// Check room exists and retrieve data
app.get('/api/room/:pin', async (req, res) => {
  try {
    const { pin } = req.params;
    const room = await Room.findOne({ pin });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const now = Date.now();
    const duration = parseTimerDuration(room.autoDeleteTimer);
    const createdAtMs = room.createdAtMs || new Date(room.createdAt).getTime() || now;
    if (now - createdAtMs >= duration) {
      console.log(`[ON-DEMAND PURGE] Room #${pin} expired on GET. Purging...`);
      await cleanupRoomData(pin);
      return res.status(404).json({ error: 'Room has expired and self-destructed.' });
    }

    const feed = await FeedItem.find({ roomPin: pin }).sort({ _id: 1 });
    const notes = await Note.find({ roomPin: pin });
    const members = await Member.find({ roomPin: pin, isOnline: true });
    const activities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

    return res.status(200).json({
      room,
      feed,
      notes,
      members,
      activities
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to retrieve room details.' });
  }
});

// Upload Rate Limiting (30 uploads / 60 seconds per IP)
const uploadRateLimitMap = new Map();
const checkUploadRateLimit = (ip) => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxUploads = 30;

  let timestamps = uploadRateLimitMap.get(ip) || [];
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= maxUploads) {
    uploadRateLimitMap.set(ip, timestamps);
    return false;
  }

  timestamps.push(now);
  uploadRateLimitMap.set(ip, timestamps);
  return true;
};

// Public API to track banner ad impressions
app.post('/api/track-banner-impression', async (req, res) => {
  try {
    await incrementPlatformStat('totalBannerImpressions', 1);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[API] Error tracking banner impression:', err);
    return res.status(500).json({ error: 'Failed to track impression' });
  }
});

// Public API to track banner ad clicks
app.post('/api/track-banner-click', async (req, res) => {
  try {
    await incrementPlatformStat('totalBannerClicks', 1);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[API] Error tracking banner click:', err);
    return res.status(500).json({ error: 'Failed to track click' });
  }
});

// File Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!checkUploadRateLimit(clientIp)) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(429).json({ error: 'Too many uploads. Please wait 1 minute before uploading again.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const pin = req.body.pin;
    
    // 1. Single File Size cap: 5 MB
    const maxFileSize = 5 * 1024 * 1024;
    if (req.file.size > maxFileSize) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'File size exceeds free plan limit (5 MB).' });
    }

    // 2. Cumulative room storage size cap (default 25 MB, expandable via ads)
    if (pin) {
      const room = await Room.findOne({ pin });
      const currentLimit = room ? (room.storageLimit || 25 * 1024 * 1024) : 25 * 1024 * 1024;
      
      const filesInRoom = await FeedItem.find({ roomPin: pin, type: 'file' });
      const currentStorageBytes = filesInRoom.reduce((sum, item) => sum + (item.fileSizeBytes || 0), 0);
      
      if (currentStorageBytes + req.file.size > currentLimit) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        const limitMB = Math.round(currentLimit / (1024 * 1024));
        return res.status(400).json({ 
          error: `Room storage capacity exceeded (Max ${limitMB} MB).`,
          code: 'STORAGE_EXCEEDED'
        });
      }
    }

    const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
    let fileSizeStr = `${fileSizeMB} MB`;
    if (req.file.size < 1024 * 1024) {
      fileSizeStr = `${(req.file.size / 1024).toFixed(2)} KB`;
    }

    const fileExt = path.extname(req.file.originalname).slice(1);

    // If Cloudinary is configured, upload it there
    if (useCloudinary) {
      try {
        const isHd = req.body.hd === 'true';
        const fileExtLower = path.extname(req.file.originalname).toLowerCase();
        const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(fileExtLower);
        const isVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(fileExtLower);

        const uploadOptions = {
          resource_type: 'auto',
          folder: 'lab_buddies_uploads',
        };

        if (!isHd) {
          if (isImage) {
            uploadOptions.quality = 'auto:eco';
            uploadOptions.transformation = [
              { width: 1200, height: 1200, crop: 'limit' }
            ];
          } else if (isVideo) {
            uploadOptions.quality = 'auto:eco';
          }
        }

        const uploadResult = await cloudinary.uploader.upload(req.file.path, uploadOptions);

        // Cleanup local temporary file immediately
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Failed to unlink local temporary file:', unlinkErr);
        }

        const finalSizeBytes = uploadResult.bytes || req.file.size;
        const finalSizeMB = (finalSizeBytes / (1024 * 1024)).toFixed(2);
        let finalSizeStr = `${finalSizeMB} MB`;
        if (finalSizeBytes < 1024 * 1024) {
          finalSizeStr = `${(finalSizeBytes / 1024).toFixed(2)} KB`;
        }

        await incrementPlatformStat('totalFilesUploaded', 1);
        await incrementPlatformStat('totalStorageBytesProcessed', finalSizeBytes);

        return res.status(200).json({
          fileName: req.file.originalname,
          fileSize: finalSizeStr,
          fileType: fileExt,
          fileUrl: uploadResult.secure_url,
          cloudinaryPublicId: uploadResult.public_id,
          fileSizeBytes: finalSizeBytes,
        });
      } catch (cloudinaryErr) {
        console.error('Cloudinary upload error, falling back to local storage URL:', cloudinaryErr);
        // Fall back to local URL if Cloudinary fails
        const hostHeader = req.get('host') || '';
        const hostBase = hostHeader.includes('render.com') ? 'https://lab-buddies-7r70.onrender.com' : `${req.protocol}://${hostHeader}`;
        const fileUrl = `${hostBase}/uploads/${req.file.filename}`;
        
        await incrementPlatformStat('totalFilesUploaded', 1);
        await incrementPlatformStat('totalStorageBytesProcessed', req.file.size);

        return res.status(200).json({
          fileName: req.file.originalname,
          fileSize: fileSizeStr,
          fileType: fileExt,
          fileUrl: fileUrl,
          fileSizeBytes: req.file.size,
        });
      }
    }

    // Default local storage fallback if Cloudinary is not configured
    const hostHeader = req.get('host') || '';
    const hostBase = hostHeader.includes('render.com') ? 'https://lab-buddies-7r70.onrender.com' : `${req.protocol}://${hostHeader}`;
    const fileUrl = `${hostBase}/uploads/${req.file.filename}`;
    
    await incrementPlatformStat('totalFilesUploaded', 1);
    await incrementPlatformStat('totalStorageBytesProcessed', req.file.size);

    return res.status(200).json({
      fileName: req.file.originalname,
      fileSize: fileSizeStr,
      fileType: fileExt,
      fileUrl: fileUrl,
      fileSizeBytes: req.file.size,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'File upload failed.' });
  }
});

// --- ADMIN AUTHORIZATION MIDDLEWARE & ENDPOINTS ---

const adminAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];

    if (!authHeader) {
      return res.status(401).json({ error: 'Cryptographic authorization token required. Please sign in as admin.' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    const payload = verifyJwt(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid, tampered, or expired admin token signature.' });
    }

    let user = null;
    if (payload.id) {
      try {
        user = await User.findById(payload.id);
      } catch (idErr) {
        user = null;
      }
    }
    if (!user && payload.email) {
      user = await User.findOne({ email: payload.email });
    }

    if (!user && payload.role === 'admin') {
      req.adminUser = { email: payload.email || 'master-admin', role: 'admin', name: 'Master Admin' };
      return next();
    }

    if (!user) {
      return res.status(401).json({ error: 'Admin account not found in database.' });
    }

    if (user.role !== 'admin' && payload.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Verified Admin role required.' });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    console.error('[ADMIN AUTH ERROR]:', err);
    return res.status(500).json({ error: 'Internal admin authorization error.' });
  }
};

// 1. Admin Metrics Overview
app.get('/api/admin/metrics', adminAuthMiddleware, async (req, res) => {
  try {
    const totalActiveRooms = await Room.countDocuments({ status: 'Active' });
    const totalUsers = await User.countDocuments();
    const totalFiles = await FeedItem.countDocuments({ type: 'file' });
    
    const fileItems = await FeedItem.find({ type: 'file' }).select('fileSizeBytes totalDownloads');
    const totalStorageBytes = fileItems.reduce((acc, f) => acc + (f.fileSizeBytes || 0), 0);
    const totalDownloads = fileItems.reduce((acc, f) => acc + (f.totalDownloads || 0), 0);

    const onlineMembers = await Member.countDocuments({ isOnline: true });
    const proUsers = await User.countDocuments({ plan: { $in: ['pro', 'premium'] } });

    // Lifetime Platform Stats
    let stats = await PlatformStat.findOne({ key: 'global' });
    if (!stats) {
      stats = await PlatformStat.create({
        key: 'global',
        totalRoomsCreated: totalActiveRooms,
        totalFilesUploaded: totalFiles,
        totalDownloadsServed: totalDownloads,
        totalStorageBytesProcessed: totalStorageBytes,
      });
    }

    const totalArchives = await RoomArchive.countDocuments();

    return res.status(200).json({
      activeRooms: totalActiveRooms,
      totalUsers,
      totalFiles,
      totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
      totalDownloads,
      onlineMembers,
      proUsers,
      serverUptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
      lifetime: {
        totalRoomsCreated: (stats.totalRoomsCreated || 0) + totalArchives,
        totalFilesUploaded: stats.totalFilesUploaded || 0,
        totalDownloadsServed: stats.totalDownloadsServed || 0,
        totalStorageMBProcessed: ((stats.totalStorageBytesProcessed || 0) / (1024 * 1024)).toFixed(2),
        totalArchivedSessions: totalArchives,
        totalRewardAdsWatched: stats.totalRewardAdsWatched || 0,
        totalBannerImpressions: stats.totalBannerImpressions || 0,
        totalBannerClicks: stats.totalBannerClicks || 0,
        ctrPercentage: (() => {
          const totalImpressions = (stats.totalBannerImpressions || 0) + (stats.totalRewardAdsWatched || 0);
          return totalImpressions > 0 ? ((stats.totalBannerClicks || 0) / totalImpressions * 100).toFixed(2) : '0.00';
        })(),
        pageRPM: (() => {
          const totalImpressions = (stats.totalBannerImpressions || 0) + (stats.totalRewardAdsWatched || 0);
          const totalEarnings = (stats.totalRewardAdsWatched || 0) * 0.10 + 
                                (stats.totalBannerImpressions || 0) * 0.005 + 
                                (stats.totalBannerClicks || 0) * 0.50;
          return totalImpressions > 0 ? ((totalEarnings / totalImpressions) * 1000).toFixed(2) : '0.00';
        })(),
        estimatedRevenueRs: (() => {
          const totalEarnings = (stats.totalRewardAdsWatched || 0) * 0.10 + 
                                (stats.totalBannerImpressions || 0) * 0.005 + 
                                (stats.totalBannerClicks || 0) * 0.50;
          return totalEarnings.toFixed(3);
        })(),
      }
    });
  } catch (err) {
    console.error('[ADMIN METRICS ERROR]:', err);
    return res.status(500).json({ error: 'Failed to retrieve admin metrics.' });
  }
});

// 2. Admin Rooms List
app.get('/api/admin/rooms', adminAuthMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ _id: -1 }).limit(100);
    
    // Enrich with file counts and member counts
    const enrichedRooms = await Promise.all(rooms.map(async (r) => {
      const fileCount = await FeedItem.countDocuments({ roomPin: r.pin, type: 'file' });
      const memberCount = await Member.countDocuments({ roomPin: r.pin, isOnline: true });
      const files = await FeedItem.find({ roomPin: r.pin, type: 'file' }).select('fileSizeBytes');
      const storageBytes = files.reduce((sum, f) => sum + (f.fileSizeBytes || 0), 0);
      
      return {
        pin: r.pin,
        name: r.name,
        createdBy: r.createdBy,
        status: r.status,
        isLocked: r.isLocked,
        isMuted: r.isMuted,
        autoDeleteTimer: r.autoDeleteTimer,
        createdAt: r.createdAt,
        fileCount,
        memberCount,
        storageMB: (storageBytes / (1024 * 1024)).toFixed(2),
        storageLimitMB: Math.round((r.storageLimit || 25 * 1024 * 1024) / (1024 * 1024))
      };
    }));

    return res.status(200).json({ rooms: enrichedRooms });
  } catch (err) {
    console.error('[ADMIN ROOMS ERROR]:', err);
    return res.status(500).json({ error: 'Failed to retrieve rooms.' });
  }
});

// 3. Admin Force Delete Room (Purges from Cloudinary & DB, Archives Summary)
app.delete('/api/admin/rooms/:pin', adminAuthMiddleware, async (req, res) => {
  try {
    const { pin } = req.params;
    console.log(`[ADMIN ACTION] Force-deleting room ${pin} by admin ${req.adminUser.email}`);
    await cleanupRoomData(pin, 'Admin Terminated');
    await logAdminAction(req.adminUser.email, 'DELETE_ROOM', `Room #${pin}`, 'Force terminated room and purged assets');
    return res.status(200).json({ message: `Room ${pin} and all associated Cloudinary assets destroyed.` });
  } catch (err) {
    console.error('[ADMIN DELETE ROOM ERROR]:', err);
    return res.status(500).json({ error: 'Failed to delete room.' });
  }
});

// 4. Admin Toggle Lock Room
app.patch('/api/admin/rooms/:pin/toggle-lock', adminAuthMiddleware, async (req, res) => {
  try {
    const { pin } = req.params;
    const room = await Room.findOne({ pin });
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    room.isLocked = !room.isLocked;
    await room.save();

    io.to(pin).emit('room-settings-updated', room);
    await logAdminAction(req.adminUser.email, 'TOGGLE_LOCK', `Room #${pin}`, `Lock status set to ${room.isLocked}`);
    return res.status(200).json({ message: `Room ${pin} lock set to ${room.isLocked}`, isLocked: room.isLocked });
  } catch (err) {
    console.error('[ADMIN LOCK ROOM ERROR]:', err);
    return res.status(500).json({ error: 'Failed to toggle room lock.' });
  }
});

const sanitizeFileUrl = (url, req) => {
  if (!url) return url;
  return url.replace(/lab-buddies-backend\.onrender\.com/g, 'lab-buddies-7r70.onrender.com');
};

// 5. Admin Files List
app.get('/api/admin/files', adminAuthMiddleware, async (req, res) => {
  try {
    const rawFiles = await FeedItem.find({ type: 'file' }).sort({ _id: -1 }).limit(200);
    const files = rawFiles.map(f => {
      const obj = f.toObject();
      if (obj.fileUrl) {
        obj.fileUrl = sanitizeFileUrl(obj.fileUrl, req);
      }
      return obj;
    });
    return res.status(200).json({ files });
  } catch (err) {
    console.error('[ADMIN FILES ERROR]:', err);
    return res.status(500).json({ error: 'Failed to retrieve files.' });
  }
});

// 6. Admin Delete Individual File
app.delete('/api/admin/files/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const file = await FeedItem.findById(id);
    if (!file) return res.status(404).json({ error: 'File not found.' });

    // Destroy on Cloudinary
    if (file.cloudinaryPublicId && useCloudinary) {
      try {
        const ext = file.fileType ? file.fileType.toLowerCase() : '';
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
        const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
        const resourceType = isImage ? 'image' : isVideo ? 'video' : 'raw';
        await cloudinary.uploader.destroy(file.cloudinaryPublicId, { resource_type: resourceType });
        console.log(`[ADMIN CLEANUP] Purged Cloudinary asset: ${file.cloudinaryPublicId}`);
      } catch (cErr) {
        console.error('Cloudinary destroy error:', cErr);
      }
    }

    await FeedItem.findByIdAndDelete(id);
    io.to(file.roomPin).emit('feed-item-deleted', { itemId: id });
    await logAdminAction(req.adminUser.email, 'DELETE_FILE', file.fileName, `Purged file from Room #${file.roomPin}`);

    return res.status(200).json({ message: `File ${file.fileName} purged successfully.` });
  } catch (err) {
    console.error('[ADMIN DELETE FILE ERROR]:', err);
    return res.status(500).json({ error: 'Failed to delete file.' });
  }
});

// 7. Admin Room Archives (Privacy-Safe Session Summaries)
app.get('/api/admin/archives', adminAuthMiddleware, async (req, res) => {
  try {
    const archives = await RoomArchive.find().sort({ destroyedAt: -1 }).limit(100);
    return res.status(200).json({ archives });
  } catch (err) {
    console.error('[ADMIN ARCHIVES ERROR]:', err);
    return res.status(500).json({ error: 'Failed to retrieve room archives.' });
  }
});

// 8. Admin Audit Trail Logs
app.get('/api/admin/audit-logs', adminAuthMiddleware, async (req, res) => {
  try {
    const logs = await AdminAuditLog.find().sort({ timestamp: -1 }).limit(150);
    return res.status(200).json({ logs });
  } catch (err) {
    console.error('[ADMIN AUDIT LOGS ERROR]:', err);
    return res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

// 9. Admin Users List
app.get('/api/admin/users', adminAuthMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password -otpCode').sort({ _id: -1 }).limit(200);
    return res.status(200).json({ users });
  } catch (err) {
    console.error('[ADMIN USERS ERROR]:', err);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// 8. Admin Update User Role
app.patch('/api/admin/users/:id/role', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.status(200).json({ message: `User role updated to ${role}`, user });
  } catch (err) {
    console.error('[ADMIN ROLE UPDATE ERROR]:', err);
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// 9. Admin Update User Plan
app.patch('/api/admin/users/:id/plan', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    if (!['free', 'pro', 'premium', 'student'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan.' });
    }

    const user = await User.findByIdAndUpdate(id, { plan }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.status(200).json({ message: `User plan updated to ${plan}`, user });
  } catch (err) {
    console.error('[ADMIN PLAN UPDATE ERROR]:', err);
    return res.status(500).json({ error: 'Failed to update user plan.' });
  }
});

// 10. Admin Delete User
app.delete('/api/admin/users/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.status(200).json({ message: `User ${user.email} removed.` });
  } catch (err) {
    console.error('[ADMIN DELETE USER ERROR]:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// 11. Admin Global System Broadcast
app.post('/api/admin/broadcast', adminAuthMiddleware, async (req, res) => {
  try {
    const { message, title, type } = req.body;
    if (!message) return res.status(400).json({ error: 'Broadcast message required.' });

    io.emit('system-broadcast', {
      title: title || 'System Announcement',
      message,
      type: type || 'info',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    console.log(`[ADMIN BROADCAST] "${title}: ${message}" sent by ${req.adminUser.email}`);
    return res.status(200).json({ message: 'Broadcast published to all active clients.' });
  } catch (err) {
    console.error('[ADMIN BROADCAST ERROR]:', err);
    return res.status(500).json({ error: 'Failed to publish broadcast.' });
  }
});

// Track socket message frequency
const rateLimitMap = new Map();

// Helper to automatically transfer host if host leaves
const handleHostTransfer = async (pin, oldHostSocketId) => {
  try {
    const room = await Room.findOne({ pin });
    if (!room) return;

    const leavingMember = await Member.findOne({ socketId: oldHostSocketId, roomPin: pin });
    if (!leavingMember || leavingMember.role !== 'host') return;

    // Promote next oldest online member
    const nextHost = await Member.findOne({ roomPin: pin, isOnline: true, socketId: { $ne: oldHostSocketId } }).sort({ joinedAt: 1 });
    if (nextHost) {
      // Demote old host role
      leavingMember.role = 'member';
      await leavingMember.save();

      // Promote new host
      nextHost.role = 'host';
      await nextHost.save();

      // Update room creator so REST API matches
      room.createdBy = nextHost.name;
      await room.save();

      // Log in Activity log
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newActivity = new Activity({
        roomPin: pin,
        type: 'info',
        description: `Host role automatically transferred to ${nextHost.name}`,
        timestamp,
        user: 'System'
      });
      await newActivity.save();

      // Broadcast changes
      io.to(pin).emit('room-settings-updated', room);
      
      const activeMembers = await Member.find({ roomPin: pin, isOnline: true });
      const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);
      io.to(pin).emit('room-members-updated', activeMembers);
      io.to(pin).emit('activities-updated', activeActivities);
      
      console.log(`Auto host transfer: ${nextHost.name} is now the host in room ${pin}`);
    }
  } catch (err) {
    console.error('Host transfer error:', err);
  }
};

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join room event
  socket.on('join-room', async ({ pin, name, role }) => {
    try {
      socket.join(pin);
      
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Determine role: creator is host, everyone else is member
      const room = await Room.findOne({ pin });
      if (!room) {
        socket.emit('room-expired');
        return;
      }

      const now = Date.now();
      const duration = parseTimerDuration(room.autoDeleteTimer);
      const createdAtMs = room.createdAtMs || new Date(room.createdAt).getTime() || now;
      if (now - createdAtMs >= duration) {
        console.log(`[ON-DEMAND PURGE] Room #${pin} expired on join. Purging...`);
        await cleanupRoomData(pin);
        socket.emit('room-expired');
        return;
      }

      let assignedRole = 'member';
      let normalizedName = name;
      const creatorName = room.originalCreator || room.createdBy;
        if (creatorName && creatorName.toLowerCase() === name.toLowerCase()) {
          assignedRole = 'host';
          normalizedName = creatorName; // Enforce original case
          
          // Demote any other user who is currently host in that room to member
          await Member.updateMany({ roomPin: pin, name: { $ne: normalizedName }, role: 'host' }, { role: 'member' });
          
          // Reset room's createdBy back to the original host
          if (room.createdBy !== normalizedName) {
            room.createdBy = normalizedName;
            await room.save();
          }
        } else if (room.createdBy && room.createdBy.toLowerCase() === name.toLowerCase()) {
          assignedRole = 'host';
          normalizedName = room.createdBy;
        }

      // Save member connection (case-insensitive lookup to prevent duplicate records)
      let member = await Member.findOne({ roomPin: pin, name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } });
      if (member) {
        member.socketId = socket.id;
        member.isOnline = true;
        member.role = assignedRole; // Sync role
        member.name = normalizedName; // Keep consistent casing
        await member.save();
      } else {
        member = new Member({
          roomPin: pin,
          socketId: socket.id,
          name: normalizedName,
          role: assignedRole,
          joinedAt: timestamp,
          isOnline: true,
          isMuted: false
        });
        await member.save();
      }

      // Log join activity
      const newActivity = new Activity({
        roomPin: pin,
        type: 'join',
        description: `${name} joined the room`,
        timestamp,
        user: name
      });
      await newActivity.save();

      // Retrieve full updated list of online members
      const activeMembers = await Member.find({ roomPin: pin, isOnline: true });
      const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

      // Broadcast join to others and emit update to self
      io.to(pin).emit('room-members-updated', activeMembers);
      io.to(pin).emit('activities-updated', activeActivities);
      
      console.log(`User ${name} joined room ${pin} (Socket: ${socket.id})`);
    } catch (err) {
      console.error('Error on join-room:', err);
    }
  });

  // Knock room event
  socket.on('knock-room', async ({ pin, name, password }) => {
    try {
      const room = await Room.findOne({ pin });
      if (!room) {
        socket.emit('knock-result', { status: 'error', message: 'Room PIN not found.' });
        return;
      }

      const now = Date.now();
      const duration = parseTimerDuration(room.autoDeleteTimer);
      const createdAtMs = room.createdAtMs || new Date(room.createdAt).getTime() || now;
      if (now - createdAtMs >= duration) {
        console.log(`[ON-DEMAND PURGE] Room #${pin} expired on knock. Purging...`);
        await cleanupRoomData(pin);
        socket.emit('knock-result', { status: 'error', message: 'This room has expired and self-destructed.' });
        return;
      }

      if (room.isLocked) {
        socket.emit('knock-result', { status: 'error', message: 'This room is locked by the host.' });
        return;
      }

      // Password validation
      if (room.password) {
        if (!password) {
          socket.emit('knock-result', { status: 'error', message: 'Room requires a password.', requiresPassword: true });
          return;
        }
        if (room.password !== password) {
          socket.emit('knock-result', { status: 'error', message: 'Incorrect room password.', requiresPassword: true });
          return;
        }
      }

      // Check if user is ALREADY an approved member in this room
      const existingMember = await Member.findOne({ roomPin: pin, name });
      if (existingMember) {
        // User is already an accepted member of this room! Auto-admit them without notifying host again
        socket.emit('knock-result', { status: 'accepted', autoJoin: true, pin });
        console.log(`User ${name} is already an accepted member of room ${pin}. Auto-approved.`);
        return;
      }

      // Find the active host in this room
      const host = await Member.findOne({ roomPin: pin, role: 'host', isOnline: true });
      if (!host) {
        // If no active host is online, let them join directly (e.g. host reclaimed or room is empty)
        socket.emit('knock-result', { status: 'accepted', autoJoin: true, pin });
        return;
      }

      // Forward request to host socket
      io.to(host.socketId).emit('member-knocking', {
        name,
        socketId: socket.id
      });
      console.log(`Knock request: ${name} (Socket ${socket.id}) knocking for room ${pin}`);
    } catch (err) {
      console.error('Knock error:', err);
    }
  });

  socket.on('accept-knock', async ({ pin, targetSocketId }) => {
    try {
      let host = await Member.findOne({ socketId: socket.id, roomPin: pin, role: 'host' });
      if (!host) {
        // Fallback: check if this socket belongs to the room creator
        const room = await Room.findOne({ pin });
        if (room) {
          const creatorMember = await Member.findOne({ roomPin: pin, name: room.createdBy });
          if (creatorMember && creatorMember.socketId === socket.id) {
            creatorMember.role = 'host';
            await creatorMember.save();
            host = creatorMember;
          }
        }
      }

      if (!host) {
        console.log(`Unauthorized accept-knock attempt by socket ${socket.id} for room ${pin}`);
        return;
      }

      io.to(targetSocketId).emit('knock-result', { status: 'accepted', pin });
      console.log(`Knock accepted for socket: ${targetSocketId} by Host ${host.name}`);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('reject-knock', async ({ pin, targetSocketId }) => {
    try {
      let host = await Member.findOne({ socketId: socket.id, roomPin: pin, role: 'host' });
      if (!host) {
        // Fallback: check if this socket belongs to the room creator
        const room = await Room.findOne({ pin });
        if (room) {
          const creatorMember = await Member.findOne({ roomPin: pin, name: room.createdBy });
          if (creatorMember && creatorMember.socketId === socket.id) {
            creatorMember.role = 'host';
            await creatorMember.save();
            host = creatorMember;
          }
        }
      }

      if (!host) {
        console.log(`Unauthorized reject-knock attempt by socket ${socket.id} for room ${pin}`);
        return;
      }

      io.to(targetSocketId).emit('knock-result', { status: 'rejected' });
      console.log(`Knock rejected for socket: ${targetSocketId} by Host ${host.name}`);
    } catch (err) {
      console.error(err);
    }
  });

  // Share message / code / file event
  socket.on('send-feed-item', async ({ pin, item }) => {
    try {
      // Bypass 1.5s cooldown for files since they are already rate-limited via HTTP upload checks
      if (item.type !== 'file' && lastTime && (now - lastTime < cooldown)) {
        socket.emit('rate-limited', { message: 'You are sending messages too fast! Please wait a moment.' });
        return;
      }
      if (item.type !== 'file') {
        rateLimitMap.set(socket.id, now);
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Save feed item to database
      const newFeedItem = new FeedItem({
        roomPin: pin,
        type: item.type,
        senderId: item.senderId,
        senderName: item.senderName,
        senderRole: item.senderRole,
        timestamp,
        content: item.content,
        code: item.code,
        language: item.language,
        fileName: item.fileName,
        fileSize: item.fileSize,
        fileType: item.fileType,
        fileUrl: item.fileUrl,
        cloudinaryPublicId: item.cloudinaryPublicId,
        fileSizeBytes: item.fileSizeBytes,
      });
      await newFeedItem.save();

      // Save activity
      let actDesc = `${item.senderName} sent a message`;
      let actType = 'info';
      if (item.type === 'code') {
        actDesc = `${item.senderName} shared a code snippet`;
        actType = 'code_share';
      } else if (item.type === 'file') {
        actDesc = `${item.senderName} uploaded ${item.fileName}`;
        actType = 'upload';
      }

      const newActivity = new Activity({
        roomPin: pin,
        type: actType,
        description: actDesc,
        timestamp,
        user: item.senderName
      });
      await newActivity.save();

      const activeFeed = await FeedItem.find({ roomPin: pin }).sort({ _id: 1 });
      const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

      // Broadcast to room
      io.to(pin).emit('feed-updated', activeFeed);
      io.to(pin).emit('activities-updated', activeActivities);
    } catch (err) {
      console.error(err);
    }
  });

  // Storage full alert relayed from a guest to the host in the room
  socket.on('member-storage-full', async ({ pin, name }) => {
    try {
      console.log(`[STORAGE] Member ${name} in room ${pin} reported storage full.`);
      const host = await Member.findOne({ roomPin: pin, role: 'host', isOnline: true });
      if (host && host.socketId) {
        io.to(host.socketId).emit('host-storage-alert', { name });
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Host triggers ads on all connected devices in the room
  socket.on('trigger-storage-ad-request', ({ pin }) => {
    try {
      console.log(`[STORAGE] Host requested storage ads playback for room ${pin}`);
      io.to(pin).emit('play-storage-ad');
    } catch (err) {
      console.error(err);
    }
  });

  // Relay Google Meet style live reactions to all connected clients in the room
  socket.on('send-live-reaction', ({ pin, emoji, name }) => {
    try {
      io.to(pin).emit('live-reaction-received', { emoji, name });
    } catch (err) {
      console.error(err);
    }
  });

  // Relay real-time attendance heartbeat (active duration counters)
  socket.on('send-attendance-heartbeat', ({ pin, rollNumber, activeSeconds }) => {
    try {
      io.to(pin).emit('attendance-heartbeat-received', { rollNumber, activeSeconds });
    } catch (err) {
      console.error(err);
    }
  });

  // Host ad completed -> increment limit, save settings, update feed & activity log
  socket.on('host-ad-completed', async ({ pin }) => {
    try {
      console.log(`[STORAGE] Host ad completion received. Increasing limit for room ${pin}`);
      const room = await Room.findOne({ pin });
      if (room) {
        const oldLimit = room.storageLimit || 25 * 1024 * 1024;
        const newLimit = oldLimit + 25 * 1024 * 1024;
        room.storageLimit = newLimit;
        await room.save();

        const limitMB = Math.round(newLimit / (1024 * 1024));
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newActivity = new Activity({
          roomPin: pin,
          type: 'info',
          description: `Room storage limit increased to ${limitMB} MB after watching ads`,
          timestamp,
          user: 'System'
        });
        await newActivity.save();

        const newFeedItem = new FeedItem({
          roomPin: pin,
          type: 'message',
          senderId: 'system',
          senderName: 'System',
          senderRole: 'admin',
          timestamp,
          content: `📢 Room storage limit expanded to ${limitMB} MB!`,
        });
        await newFeedItem.save();

        const activeFeed = await FeedItem.find({ roomPin: pin }).sort({ _id: 1 });
        const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

        io.to(pin).emit('storage-limit-increased', { newLimit });
        io.to(pin).emit('room-settings-updated', room);
        io.to(pin).emit('feed-updated', activeFeed);
        io.to(pin).emit('activities-updated', activeActivities);
        io.to(pin).emit('stop-storage-ad');
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Note actions
  socket.on('create-note', async ({ pin, note }) => {
    try {
      const createdAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const newNote = new Note({
        roomPin: pin,
        title: note.title,
        content: note.content,
        color: note.color,
        pinned: note.pinned,
        createdBy: note.createdBy,
        createdAt
      });
      await newNote.save();

      const activeNotes = await Note.find({ roomPin: pin });
      io.to(pin).emit('notes-updated', activeNotes);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('toggle-pin-note', async ({ pin, noteId }) => {
    try {
      const note = await Note.findById(noteId);
      if (note) {
        note.pinned = !note.pinned;
        await note.save();
        
        const activeNotes = await Note.find({ roomPin: pin });
        io.to(pin).emit('notes-updated', activeNotes);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('delete-note', async ({ pin, noteId }) => {
    try {
      await Note.findByIdAndDelete(noteId);
      
      const activeNotes = await Note.find({ roomPin: pin });
      io.to(pin).emit('notes-updated', activeNotes);
    } catch (err) {
      console.error(err);
    }
  });

  // Host Controls: Lock Room
  socket.on('toggle-lock-room', async ({ pin }) => {
    try {
      const host = await Member.findOne({ socketId: socket.id, roomPin: pin, role: 'host' });
      if (!host) {
        socket.emit('rate-limited', { message: 'Action rejected: only the host can lock the room.' });
        return;
      }
      const room = await Room.findOne({ pin });
      if (room) {
        room.isLocked = !room.isLocked;
        await room.save();
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newActivity = new Activity({
          roomPin: pin,
          type: 'lock',
          description: `Host ${room.isLocked ? 'locked' : 'unlocked'} the room`,
          timestamp,
          user: 'Host'
        });
        await newActivity.save();

        const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

        io.to(pin).emit('room-settings-updated', room);
        io.to(pin).emit('activities-updated', activeActivities);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Host Controls: Mute Chat
  socket.on('toggle-mute-chat', async ({ pin }) => {
    try {
      const host = await Member.findOne({ socketId: socket.id, roomPin: pin, role: 'host' });
      if (!host) {
        socket.emit('rate-limited', { message: 'Action rejected: only the host can mute chat.' });
        return;
      }
      const room = await Room.findOne({ pin });
      if (room) {
        room.isMuted = !room.isMuted;
        await room.save();

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newActivity = new Activity({
          roomPin: pin,
          type: 'mute',
          description: `Host ${room.isMuted ? 'muted' : 'unmuted'} chat messaging`,
          timestamp,
          user: 'Host'
        });
        await newActivity.save();

        const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

        io.to(pin).emit('room-settings-updated', room);
        io.to(pin).emit('activities-updated', activeActivities);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Host Controls: Update General Room Settings
  socket.on('update-room-settings', async ({ pin, settings }) => {
    try {
      const host = await Member.findOne({ socketId: socket.id, roomPin: pin, role: 'host' });
      if (!host) {
        socket.emit('rate-limited', { message: 'Action rejected: only the host can update room settings.' });
        return;
      }
      const room = await Room.findOne({ pin });
      if (room) {
        if (settings.name !== undefined) room.name = settings.name;
        if (settings.maxMembers !== undefined) room.maxMembers = settings.maxMembers;
        if (settings.autoDeleteTimer !== undefined) room.autoDeleteTimer = settings.autoDeleteTimer;
        if (settings.roomVisibility !== undefined) room.roomVisibility = settings.roomVisibility;
        await room.save();

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newActivity = new Activity({
          roomPin: pin,
          type: 'setting_change',
          description: `Host updated room configuration`,
          timestamp,
          user: 'Host'
        });
        await newActivity.save();

        const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

        io.to(pin).emit('room-settings-updated', room);
        io.to(pin).emit('activities-updated', activeActivities);
      }
    } catch (err) {
      console.error('[Socket update-room-settings error]:', err);
    }
  });

  // Host Controls: Mute Member
  socket.on('toggle-mute-member', async ({ pin, memberId }) => {
    try {
      const host = await Member.findOne({ socketId: socket.id, roomPin: pin, role: 'host' });
      if (!host) {
        socket.emit('rate-limited', { message: 'Action rejected: only the host can mute members.' });
        return;
      }
      const member = await Member.findById(memberId);
      if (member) {
        member.isMuted = !member.isMuted;
        await member.save();
        
        const activeMembers = await Member.find({ roomPin: pin, isOnline: true });
        io.to(pin).emit('room-members-updated', activeMembers);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Host Controls: Kick Member
  socket.on('kick-member', async ({ pin, memberId }) => {
    try {
      const host = await Member.findOne({ socketId: socket.id, roomPin: pin, role: 'host' });
      if (!host) {
        socket.emit('rate-limited', { message: 'Action rejected: only the host can kick members.' });
        return;
      }
      const member = await Member.findById(memberId);
      if (member) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newActivity = new Activity({
          roomPin: pin,
          type: 'leave',
          description: `Host removed ${member.name}`,
          timestamp,
          user: 'Host'
        });
        await newActivity.save();

        // Mark offline and change socket status
        member.isOnline = false;
        await member.save();

        // Tell specific client that they are kicked
        io.to(member.socketId).emit('kicked-from-room');

        const activeMembers = await Member.find({ roomPin: pin, isOnline: true });
        const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

        io.to(pin).emit('room-members-updated', activeMembers);
        io.to(pin).emit('activities-updated', activeActivities);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Host Controls: Clear Feed
  socket.on('clear-feed', async ({ pin }) => {
    try {
      const host = await Member.findOne({ socketId: socket.id, roomPin: pin, role: 'host' });
      if (!host) {
        socket.emit('rate-limited', { message: 'Action rejected: only the host can clear the feed.' });
        return;
      }
      await FeedItem.deleteMany({ roomPin: pin });
      
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newActivity = new Activity({
        roomPin: pin,
        type: 'delete',
        description: 'Feed items cleared by Host',
        timestamp,
        user: 'Host'
      });
      await newActivity.save();

      const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

      io.to(pin).emit('feed-updated', []);
      io.to(pin).emit('activities-updated', activeActivities);
    } catch (err) {
      console.error(err);
    }
  });

  // Manual Host Transfer
  socket.on('transfer-host-role', async ({ pin, targetMemberId }) => {
    try {
      const host = await Member.findOne({ socketId: socket.id, roomPin: pin, role: 'host' });
      if (!host) {
        socket.emit('rate-limited', { message: 'Action rejected: only the host can transfer permissions.' });
        return;
      }

      const targetMember = await Member.findById(targetMemberId);
      if (!targetMember || !targetMember.isOnline) {
        socket.emit('rate-limited', { message: 'Target member not found or offline.' });
        return;
      }

      // Swap roles
      host.role = 'member';
      await host.save();

      targetMember.role = 'host';
      await targetMember.save();

      // Update Room document createdBy so REST API loads it as host
      const room = await Room.findOne({ pin });
      if (room) {
        room.createdBy = targetMember.name;
        await room.save();
        io.to(pin).emit('room-settings-updated', room);
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newActivity = new Activity({
        roomPin: pin,
        type: 'info',
        description: `Host role transferred to ${targetMember.name} by Host`,
        timestamp,
        user: 'System'
      });
      await newActivity.save();

      const activeMembers = await Member.find({ roomPin: pin, isOnline: true });
      const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);
      io.to(pin).emit('room-members-updated', activeMembers);
      io.to(pin).emit('activities-updated', activeActivities);
    } catch (err) {
      console.error(err);
    }
  });

  // Claim Host Role (when no active host is online)
  socket.on('claim-host-role', async ({ pin }) => {
    try {
      const room = await Room.findOne({ pin });
      if (!room) return;

      // Check if there is any host currently online in the room
      const activeHost = await Member.findOne({ roomPin: pin, role: 'host', isOnline: true });
      if (activeHost) {
        socket.emit('rate-limited', { message: 'Action rejected: the host is currently online in the room.' });
        return;
      }

      // Find the member claiming the role
      const claimant = await Member.findOne({ socketId: socket.id, roomPin: pin });
      if (!claimant) {
        socket.emit('rate-limited', { message: 'Member not found.' });
        return;
      }

      // Demote any offline hosts to member to avoid multiple hosts
      await Member.updateMany({ roomPin: pin, role: 'host' }, { role: 'member' });

      // Promote the claimant
      claimant.role = 'host';
      await claimant.save();

      // Update room creator, preserving the original host name
      if (!room.originalCreator) {
        room.originalCreator = room.createdBy;
      }
      room.createdBy = claimant.name;
      await room.save();

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newActivity = new Activity({
        roomPin: pin,
        type: 'info',
        description: `${claimant.name} claimed the Host role (previous host went offline)`,
        timestamp,
        user: 'System'
      });
      await newActivity.save();

      const activeMembers = await Member.find({ roomPin: pin, isOnline: true });
      const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

      io.to(pin).emit('room-settings-updated', room);
      io.to(pin).emit('room-members-updated', activeMembers);
      io.to(pin).emit('activities-updated', activeActivities);
      
      console.log(`[Host] Member ${claimant.name} claimed the Host role in room ${pin}`);
    } catch (err) {
      console.error(err);
    }
  });

  // Host Controls: Delete Room (Scrub all data)
  socket.on('delete-room', async ({ pin }) => {
    try {
      const host = await Member.findOne({ socketId: socket.id, roomPin: pin, role: 'host' });
      if (!host) {
        socket.emit('rate-limited', { message: 'Action rejected: only the host can delete the room.' });
        return;
      }
      await cleanupRoomData(pin);
    } catch (err) {
      console.error(err);
    }
  });

  // Rewarded Ad: Unlock +25 MB Room Storage (Max 100 MB)
  socket.on('unlock-storage', async ({ pin }) => {
    try {
      const room = await Room.findOne({ pin });
      if (!room) return;

      const currentLimitMB = Math.round((room.storageLimit || 25 * 1024 * 1024) / (1024 * 1024));
      if (currentLimitMB >= 100) {
        socket.emit('rate-limited', { message: 'Maximum room storage limit (100 MB) already reached.' });
        return;
      }

      const newLimitMB = Math.min(100, currentLimitMB + 25);
      room.storageLimit = newLimitMB * 1024 * 1024;
      await room.save();
      await incrementPlatformStat('totalRewardAdsWatched', 1);

      io.to(pin).emit('storage-limit-updated', {
        storageLimit: room.storageLimit,
        limitMB: newLimitMB
      });
      console.log(`[STORAGE] Room ${pin} unlocked +25 MB storage. New Limit: ${newLimitMB} MB.`);
    } catch (err) {
      console.error('[STORAGE] Error unlocking room storage:', err);
    }
  });

  // Track Banner Ad Impression Analytics
  socket.on('track-banner-impression', async () => {
    try {
      await incrementPlatformStat('totalBannerImpressions', 1);
    } catch (err) {
      console.error('[STATS] Error tracking banner impression:', err);
    }
  });

  // Track Banner Ad Click Analytics
  socket.on('track-banner-click', async () => {
    try {
      await incrementPlatformStat('totalBannerClicks', 1);
    } catch (err) {
      console.error('[STATS] Error tracking banner click:', err);
    }
  });

  // Track File Download Analytics
  socket.on('track-download', async ({ pin, fileId, downloaderId }) => {
    try {
      if (!fileId) return;
      const item = await FeedItem.findById(fileId);
      if (item && item.type === 'file') {
        item.totalDownloads = (item.totalDownloads || 0) + 1;
        if (downloaderId && (!item.uniqueDownloaders || !item.uniqueDownloaders.includes(downloaderId))) {
          if (!item.uniqueDownloaders) item.uniqueDownloaders = [];
          item.uniqueDownloaders.push(downloaderId);
        }
        await item.save();

        await incrementPlatformStat('totalDownloadsServed', 1);
        await incrementPlatformStat('totalStorageBytesProcessed', item.fileSizeBytes || 0);

        io.to(pin).emit('file-stats-updated', {
          fileId: item._id.toString(),
          totalDownloads: item.totalDownloads,
          uniqueDownloads: item.uniqueDownloaders?.length || 1,
        });
      }
    } catch (err) {
      console.error('[DOWNLOAD-STATS] Error tracking file download:', err);
    }
  });

  // Create Room (called via REST or ws helper)
  socket.on('create-room', async (roomData) => {
    try {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
      
      const newRoom = new Room({
        pin: roomData.pin,
        name: roomData.name,
        maxMembers: roomData.maxMembers,
        autoDeleteTimer: roomData.autoDeleteTimer,
        password: roomData.password || undefined,
        isLocked: false,
        isMuted: false,
        isFileSharingEnabled: true,
        roomVisibility: true,
        createdAt: timestamp,
        createdAtMs: Date.now(),
        createdBy: roomData.createdBy,
        status: 'Active'
      });
      await newRoom.save();

      console.log(`Room ${roomData.pin} created in MongoDB.`);
    } catch (err) {
      console.error(err);
    }
  });

  // --- VOICE ROOM SIGNALING EVENTS ---
  
  // Expose WebRTC configurations dynamically
  socket.on('voice:get-config', (callback) => {
    if (typeof callback === 'function') {
      callback({
        iceServers: ICE_SERVERS,
        maxParticipants: VOICE_PARTICIPANT_LIMIT
      });
    }
  });

  // When a user joins the voice room
  socket.on('voice:user-joined', async ({ pin, name }) => {
    try {
      // 1. Security validation: Verify the user is an online member of this specific room
      const member = await Member.findOne({ roomPin: pin, name, isOnline: true });
      if (!member) {
        console.error(`[Voice Security] Access Denied: User ${name} is not an online member of Room ${pin}`);
        return;
      }

      // Ensure voice room exists
      if (!voiceRooms.has(pin)) {
        voiceRooms.set(pin, new Map());
      }
      const voiceRoom = voiceRooms.get(pin);

      // 2. Validate max participant limit
      const room = await Room.findOne({ pin });
      if (room && room.voiceMicsLocked) {
        voiceMicLocks.set(pin, true);
        // Notify this specific user that mics are locked in this room
        socket.emit('voice:mics-locked');
      }

      const limit = room ? (room.maxMembers || VOICE_PARTICIPANT_LIMIT) : VOICE_PARTICIPANT_LIMIT;
      if (voiceRoom.size >= limit) {
        console.warn(`[Voice] Join rejected: Room ${pin} voice channel is full (${voiceRoom.size}/${limit})`);
        socket.emit('voice:error', { message: 'Voice room is full.' });
        return;
      }

      // Prevent duplicate connection under same socket.id
      if (voiceRoom.has(socket.id)) {
        console.log(`[Voice] User ${name} already connected in voice room ${pin}`);
        return;
      }

      // Save user details
      voiceRoom.set(socket.id, { name, isMuted: false });

      // Join the isolated Socket.io voice room for signaling broadcast
      socket.join(`voice:${pin}`);
      console.log(`[Voice] User ${name} (${socket.id}) joined voice channel in Room ${pin}`);

      // Collect existing voice room participants (excluding current joiner)
      const existingUsers = [];
      voiceRoom.forEach((val, key) => {
        if (key !== socket.id) {
          existingUsers.push({
            socketId: key,
            name: val.name,
            isMuted: val.isMuted
          });
        }
      });

      // Send current users list to the new joiner
      socket.emit('voice:room-users', existingUsers);

      // Broadcast join notification to existing members in this voice channel
      socket.to(`voice:${pin}`).emit('voice:user-joined', {
        socketId: socket.id,
        name,
        isMuted: false
      });

      // Broadcast updated general presence list to the entire text room
      io.to(pin).emit('voice:room-state-updated', Array.from(voiceRoom.entries()).map(([id, val]) => ({
        socketId: id,
        name: val.name,
        isMuted: val.isMuted
      })));

    } catch (error) {
      console.error('[Voice] Error joining voice room:', error);
      socket.emit('voice:error', { message: 'An error occurred while joining the voice room.' });
    }
  });

  // When a user leaves the voice room
  socket.on('voice:user-left', ({ pin }) => {
    try {
      const voiceRoom = voiceRooms.get(pin);
      if (voiceRoom && voiceRoom.has(socket.id)) {
        const user = voiceRoom.get(socket.id);
        voiceRoom.delete(socket.id);

        socket.leave(`voice:${pin}`);
        console.log(`[Voice] User ${user.name} (${socket.id}) left voice channel in Room ${pin}`);

        // Broadcast to other voice room participants
        socket.to(`voice:${pin}`).emit('voice:user-left', { socketId: socket.id });

        // Update overall presence
        io.to(pin).emit('voice:room-state-updated', Array.from(voiceRoom.entries()).map(([id, val]) => ({
          socketId: id,
          name: val.name,
          isMuted: val.isMuted
        })));
      }
    } catch (error) {
      console.error('[Voice] Error leaving voice room:', error);
    }
  });

  // WebRTC offer signaling
  // Security: sender OR receiver must be an active voice speaker (allows listener↔speaker)
  socket.on('voice:offer', ({ pin, targetSocketId, offer }) => {
    const voiceRoom = voiceRooms.get(pin);
    const senderInVoice   = voiceRoom && voiceRoom.has(socket.id);
    const receiverInVoice = voiceRoom && voiceRoom.has(targetSocketId);
    if (senderInVoice || receiverInVoice) {
      socket.to(targetSocketId).emit('voice:offer', {
        initiatorSocketId: socket.id,
        offer
      });
    } else {
      console.warn(`[Voice Security] Blocked offer: Neither socket is an active speaker in room ${pin}`);
    }
  });

  // WebRTC answer signaling
  // Security: sender OR receiver must be an active voice speaker
  socket.on('voice:answer', ({ pin, targetSocketId, answer }) => {
    const voiceRoom = voiceRooms.get(pin);
    const senderInVoice   = voiceRoom && voiceRoom.has(socket.id);
    const receiverInVoice = voiceRoom && voiceRoom.has(targetSocketId);
    if (senderInVoice || receiverInVoice) {
      socket.to(targetSocketId).emit('voice:answer', {
        responderSocketId: socket.id,
        answer
      });
    } else {
      console.warn(`[Voice Security] Blocked answer: Neither socket is an active speaker in room ${pin}`);
    }
  });

  // WebRTC ICE Candidate signaling
  // Security: sender OR receiver must be an active voice speaker
  socket.on('voice:ice-candidate', ({ pin, targetSocketId, candidate }) => {
    const voiceRoom = voiceRooms.get(pin);
    const senderInVoice   = voiceRoom && voiceRoom.has(socket.id);
    const receiverInVoice = voiceRoom && voiceRoom.has(targetSocketId);
    if (senderInVoice || receiverInVoice) {
      socket.to(targetSocketId).emit('voice:ice-candidate', {
        senderSocketId: socket.id,
        candidate
      });
    } else {
      console.warn(`[Voice Security] Blocked ice-candidate: Neither socket is an active speaker in room ${pin}`);
    }
  });

  // Passive listen request: a room member (not in voice) wants to receive audio from a speaker.
  // The speaker receives this and creates an offer back to the listener.
  // Security: targetSpeakerSocketId must be an active voice participant.
  socket.on('voice:listen-request', ({ pin, targetSpeakerSocketId }) => {
    try {
      const voiceRoom = voiceRooms.get(pin);
      if (voiceRoom && voiceRoom.has(targetSpeakerSocketId)) {
        // Forward request to the speaker so they can initiate a WebRTC offer to this listener
        socket.to(targetSpeakerSocketId).emit('voice:listen-request', {
          listenerSocketId: socket.id
        });
      } else {
        console.warn(`[Voice] listen-request ignored: target ${targetSpeakerSocketId} is not an active speaker`);
      }
    } catch (error) {
      console.error('[Voice] Error handling listen-request:', error);
    }
  });

  // Microphone mute
  socket.on('voice:mute', ({ pin }) => {
    try {
      const voiceRoom = voiceRooms.get(pin);
      if (voiceRoom && voiceRoom.has(socket.id)) {
        const user = voiceRoom.get(socket.id);
        user.isMuted = true;

        socket.to(`voice:${pin}`).emit('voice:mute', { socketId: socket.id });

        io.to(pin).emit('voice:room-state-updated', Array.from(voiceRoom.entries()).map(([id, val]) => ({
          socketId: id,
          name: val.name,
          isMuted: val.isMuted
        })));
      }
    } catch (error) {
      console.error('[Voice] Error muting mic:', error);
    }
  });

  // Microphone unmute
  socket.on('voice:unmute', ({ pin }) => {
    try {
      // Reject if host has locked all mics
      if (voiceMicLocks.get(pin) === true) {
        console.log(`[Voice] Unmute blocked: mics are locked by host in room ${pin}`);
        // Re-enforce mute on this client
        socket.emit('voice:force-mute');
        return;
      }
      const voiceRoom = voiceRooms.get(pin);
      if (voiceRoom && voiceRoom.has(socket.id)) {
        const user = voiceRoom.get(socket.id);
        user.isMuted = false;

        socket.to(`voice:${pin}`).emit('voice:unmute', { socketId: socket.id });

        io.to(pin).emit('voice:room-state-updated', Array.from(voiceRoom.entries()).map(([id, val]) => ({
          socketId: id,
          name: val.name,
          isMuted: val.isMuted
        })));
      }
    } catch (error) {
      console.error('[Voice] Error unmuting mic:', error);
    }
  });

  // Host: mute all active voice participants at once
  socket.on('voice:mute-all', async ({ pin }) => {
    try {
      const member = await Member.findOne({ socketId: socket.id, roomPin: pin });
      if (!member || member.role !== 'host') {
        console.warn(`[Voice Security] Mute-all rejected: ${socket.id} is not host of room ${pin}`);
        return;
      }

      const voiceRoom = voiceRooms.get(pin);
      if (!voiceRoom || voiceRoom.size === 0) return;

      voiceRoom.forEach((user) => { user.isMuted = true; });
      console.log(`[Voice] Host muted all ${voiceRoom.size} participant(s) in room ${pin}`);

      io.to(`voice:${pin}`).emit('voice:force-mute');
      io.to(pin).emit('voice:room-state-updated', Array.from(voiceRoom.entries()).map(([id, val]) => ({
        socketId: id, name: val.name, isMuted: val.isMuted
      })));
    } catch (error) {
      console.error('[Voice] Error in mute-all:', error);
    }
  });

  // Host: lock all mics — members cannot unmute themselves until host unlocks
  socket.on('voice:lock-mics', async ({ pin }) => {
    try {
      const member = await Member.findOne({ socketId: socket.id, roomPin: pin });
      if (!member || member.role !== 'host') {
        console.warn(`[Voice Security] Lock-mics rejected: ${socket.id} is not host of room ${pin}`);
        return;
      }

      // 1. First mute everyone immediately
      const voiceRoom = voiceRooms.get(pin);
      if (voiceRoom) {
        voiceRoom.forEach((user) => { user.isMuted = true; });
        io.to(`voice:${pin}`).emit('voice:force-mute');
        io.to(pin).emit('voice:room-state-updated', Array.from(voiceRoom.entries()).map(([id, val]) => ({
          socketId: id, name: val.name, isMuted: val.isMuted
        })));
      }

      // 2. Then set lock status and persist to DB
      voiceMicLocks.set(pin, true);
      console.log(`[Voice] Host locked all mics in room ${pin}`);

      const room = await Room.findOne({ pin });
      if (room) {
        room.voiceMicsLocked = true;
        await room.save();
        io.to(pin).emit('room-settings-updated', room);
      }

      // Notify all room members that mics are now locked
      io.to(pin).emit('voice:mics-locked');
    } catch (error) {
      console.error('[Voice] Error in lock-mics:', error);
    }
  });

  // Host: unlock mics — members can unmute themselves again
  socket.on('voice:unlock-mics', async ({ pin }) => {
    try {
      const member = await Member.findOne({ socketId: socket.id, roomPin: pin });
      if (!member || member.role !== 'host') {
        console.warn(`[Voice Security] Unlock-mics rejected: ${socket.id} is not host of room ${pin}`);
        return;
      }

      voiceMicLocks.set(pin, false);
      console.log(`[Voice] Host unlocked all mics in room ${pin}`);

      const room = await Room.findOne({ pin });
      if (room) {
        room.voiceMicsLocked = false;
        await room.save();
        io.to(pin).emit('room-settings-updated', room);
      }

      // Notify all room members that mics are now unlocked
      io.to(pin).emit('voice:mics-unlocked');
    } catch (error) {
      console.error('[Voice] Error in unlock-mics:', error);
    }
  });

  // Disconnection handler
  socket.on('disconnect', async () => {
    rateLimitMap.delete(socket.id);
    try {
      // Clean up voice room membership if any
      voiceRooms.forEach((voiceRoom, pin) => {
        if (voiceRoom.has(socket.id)) {
          const user = voiceRoom.get(socket.id);
          voiceRoom.delete(socket.id);
          
          socket.to(`voice:${pin}`).emit('voice:user-left', { socketId: socket.id });
          
          io.to(pin).emit('voice:room-state-updated', Array.from(voiceRoom.entries()).map(([id, val]) => ({
            socketId: id,
            name: val.name,
            isMuted: val.isMuted
          })));
          
          console.log(`[Voice] Cleaned up user ${user.name} (${socket.id}) from voice room ${pin} on disconnect`);
        }
      });

      const member = await Member.findOne({ socketId: socket.id });
      if (member) {
        const pin = member.roomPin;

        // If they were host, do not auto-transfer. They stay the host.
        if (member.role === 'host') {
          // Role is retained so they stay host on rejoin
        }

        member.isOnline = false;
        await member.save();

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newActivity = new Activity({
          roomPin: pin,
          type: 'leave',
          description: `${member.name} left the room`,
          timestamp,
          user: member.name
        });
        await newActivity.save();

        const activeMembers = await Member.find({ roomPin: pin, isOnline: true });
        const activeActivities = await Activity.find({ roomPin: pin }).sort({ _id: -1 }).limit(30);

        io.to(pin).emit('room-members-updated', activeMembers);
        io.to(pin).emit('activities-updated', activeActivities);
        
        console.log(`User ${member.name} disconnected (Socket: ${socket.id})`);
      }
    } catch (err) {
      console.error(err);
    }
  });
});

// Background Room self-destruct sweeper & integrity scrub (runs every 1 minute)
setInterval(async () => {
  try {
    const now = Date.now();
    const rooms = await Room.find({});
    const activePins = rooms.map((r) => r.pin);

    // 1. Process expired rooms
    for (const room of rooms) {
      const duration = parseTimerDuration(room.autoDeleteTimer);
      const createdAtMs = room.createdAtMs || new Date(room.createdAt).getTime() || now;
      if (now - createdAtMs >= duration) {
        console.log(`[SWEEPER] Room #${room.pin} self-destruct timer expired. Purging all room data...`);
        await cleanupRoomData(room.pin);
      }
    }

    // 2. Orphaned database records garbage collection
    if (activePins.length > 0) {
      await Promise.all([
        FeedItem.deleteMany({ roomPin: { $nin: activePins } }),
        Note.deleteMany({ roomPin: { $nin: activePins } }),
        Member.deleteMany({ roomPin: { $nin: activePins } }),
        Activity.deleteMany({ roomPin: { $nin: activePins } }),
      ]);
    }
  } catch (err) {
    console.error('[SWEEPER] Error running database sweeper:', err);
  }
}, 60000); // Check every 1 minute

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Express and Socket.io server running on port ${PORT}`);
});
