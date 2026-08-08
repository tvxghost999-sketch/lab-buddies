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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root, then fall back to server directory
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

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

// --- Schemas & Models ---

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  otpCode: { type: String },
  otpExpires: { type: Date }
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
  status: { type: String, default: 'Active' },
  password: { type: String },
  storageLimit: { type: Number, default: 25 * 1024 * 1024 },
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

// --- Room Cleanup & Self-Destruct Helpers ---
const parseTimerDuration = (timerStr) => {
  const match = timerStr.match(/^(\d+)\s+(Minute|Hour)s?$/i);
  if (!match) return 2 * 60 * 60 * 1000; // default 2 hours

  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith('minute')) {
    return val * 60 * 1000;
  } else if (unit.startsWith('hour')) {
    return val * 60 * 60 * 1000;
  }
  return 2 * 60 * 60 * 1000;
};

const cleanupRoomData = async (pin) => {
  try {
    console.log(`[CLEANUP] Purging room ${pin} and all associated assets...`);

    // 1. Find all file items in the feed
    const files = await FeedItem.find({ roomPin: pin, type: 'file' });
    
    // 2. Delete files from Cloudinary if hosted there
    for (const file of files) {
      if (file.cloudinaryPublicId && useCloudinary) {
        try {
          const ext = file.fileType ? file.fileType.toLowerCase() : '';
          const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
          const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
          const resourceType = isImage ? 'image' : isVideo ? 'video' : 'raw';
          
          await cloudinary.uploader.destroy(file.cloudinaryPublicId, { resource_type: resourceType });
          console.log(`[CLEANUP] Deleted file ${file.fileName} (${file.cloudinaryPublicId}) as resource_type: ${resourceType} from Cloudinary`);
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
            console.log(`[CLEANUP] Deleted local fallback upload: ${localFileName}`);
          } catch (unlinkErr) {
            console.error(`[CLEANUP] Failed to delete local file ${localFilePath}:`, unlinkErr);
          }
        }
      }
    }

    // 4. Delete room database collections
    await Room.deleteOne({ pin });
    await FeedItem.deleteMany({ roomPin: pin });
    await Note.deleteMany({ roomPin: pin });
    await Member.deleteMany({ roomPin: pin });
    await Activity.deleteMany({ roomPin: pin });

    // 5. Broadcast expire event to sockets
    io.to(pin).emit('room-expired');
    console.log(`[CLEANUP] Room ${pin} has been fully destroyed.`);
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

    const newUser = new User({
      name,
      email,
      password,
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

    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    return res.status(200).json({
      message: 'Logged in successfully!',
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
        let fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const isGeneric = /@(gmail|yahoo|outlook|hotmail|live|aol|icloud)\.com$/i.test(fromEmail);
        if (isGeneric || fromEmail === 'onboarding@resend.dev') {
          fromEmail = 'onboarding@resend.dev';
        }
        await resend.emails.send({
          from: `Lab Buddies <${fromEmail}>`,
          to: email,
          subject: 'Verification OTP - Lab Buddies',
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 3px solid #111111; border-radius: 12px; padding: 24px; background-color: #FFFDF9; box-shadow: 4px 4px 0px 0px #111111;">
              <h2 style="font-size: 22px; font-weight: 900; text-transform: uppercase; color: #111111; margin-top: 0; border-bottom: 3px solid #111111; padding-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                ⚡ Lab Buddies
              </h2>
              <p style="font-size: 14px; font-weight: 700; color: #111111; margin-top: 16px;">
                Hello there! Use the verification OTP code below to verify your account:
              </p>
              <div style="background-color: #FFD600; border: 3px solid #111111; border-radius: 8px; padding: 16px; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #111111; margin: 24px 0; box-shadow: 3px 3px 0px 0px #111111;">
                ${otp}
              </div>
              <p style="font-size: 11px; font-weight: 700; color: #111111; opacity: 0.6; margin-bottom: 0; line-height: 1.5;">
                This code is valid for 10 minutes. If you did not request this code, you can safely ignore this email.
              </p>
            </div>
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

// Health check ping route
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Check room exists and retrieve data
app.get('/api/room/:pin', async (req, res) => {
  try {
    const { pin } = req.params;
    const room = await Room.findOne({ pin });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
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

// File Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
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
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'auto',
          folder: 'lab_buddies_uploads',
        });

        // Cleanup local temporary file immediately
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Failed to unlink local temporary file:', unlinkErr);
        }

        return res.status(200).json({
          fileName: req.file.originalname,
          fileSize: fileSizeStr,
          fileType: fileExt,
          fileUrl: uploadResult.secure_url,
          cloudinaryPublicId: uploadResult.public_id,
          fileSizeBytes: req.file.size,
        });
      } catch (cloudinaryErr) {
        console.error('Cloudinary upload error, falling back to local storage URL:', cloudinaryErr);
        // Fall back to local URL if Cloudinary fails
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
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
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
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
      let assignedRole = 'member';
      if (room) {
        if (room.createdBy === name) {
          assignedRole = 'host';
        }
      }

      // Save member connection
      let member = await Member.findOne({ roomPin: pin, name });
      if (member) {
        member.socketId = socket.id;
        member.isOnline = true;
        member.role = assignedRole; // Sync role
        await member.save();
      } else {
        member = new Member({
          roomPin: pin,
          socketId: socket.id,
          name,
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
      const now = Date.now();
      const lastTime = rateLimitMap.get(socket.id);
      const cooldown = 1500; // 1.5 seconds cooldown

      if (lastTime && (now - lastTime < cooldown)) {
        socket.emit('rate-limited', { message: 'You are sending messages too fast! Please wait a moment.' });
        return;
      }
      rateLimitMap.set(socket.id, now);

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

  // Disconnection handler
  socket.on('disconnect', async () => {
    rateLimitMap.delete(socket.id);
    try {
      const member = await Member.findOne({ socketId: socket.id });
      if (member) {
        const pin = member.roomPin;

        // If they were host, trigger auto-transfer
        if (member.role === 'host') {
          await handleHostTransfer(pin, socket.id);
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

// Background Room self-destruct sweeper (runs every 1 minute)
setInterval(async () => {
  try {
    const now = Date.now();
    const rooms = await Room.find({});
    for (const room of rooms) {
      const duration = parseTimerDuration(room.autoDeleteTimer);
      const createdAtMs = room.createdAtMs || new Date(room.createdAt).getTime() || now;
      if (now - createdAtMs >= duration) {
        console.log(`[SWEEPER] Room ${room.pin} expired. Triggering auto-delete...`);
        await cleanupRoomData(room.pin);
      }
    }
  } catch (err) {
    console.error('[SWEEPER] Error running database sweeper:', err);
  }
}, 60000); // Check every 1 minute

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Express and Socket.io server running on port ${PORT}`);
});
