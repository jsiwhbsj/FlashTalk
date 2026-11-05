import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import http from 'http';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const MEDIA_STORAGE_DIR = path.join(__dirname, '.media_storage');
const MEDIA_INDEX_FILE = path.join(MEDIA_STORAGE_DIR, 'media_index.json');
const CHAT_MESSAGES_FILE = path.join(MEDIA_STORAGE_DIR, 'chat_messages.json');

if (!fs.existsSync(MEDIA_STORAGE_DIR)) {
  fs.mkdirSync(MEDIA_STORAGE_DIR, { recursive: true });
}

interface StoredMediaMetadata {
  mediaId: string;
  fileName: string;
  safeDiskName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  downloadUrl: string;
  senderId: string;
  recipientId: string;
  chatId: string;
  timestamp: number;
}

const mediaMetadataStore = new Map<string, StoredMediaMetadata>();
const chatMessagesStore = new Map<string, any[]>();

try {
  if (fs.existsSync(MEDIA_INDEX_FILE)) {
    const rawIdx = JSON.parse(fs.readFileSync(MEDIA_INDEX_FILE, 'utf-8'));
    if (Array.isArray(rawIdx)) {
      rawIdx.forEach((item: StoredMediaMetadata) => {
        if (item && item.mediaId) mediaMetadataStore.set(item.mediaId, item);
      });
    }
  }
} catch {}

try {
  if (fs.existsSync(CHAT_MESSAGES_FILE)) {
    const rawMsgs = JSON.parse(fs.readFileSync(CHAT_MESSAGES_FILE, 'utf-8'));
    if (rawMsgs && typeof rawMsgs === 'object') {
      Object.entries(rawMsgs).forEach(([k, v]) => {
        if (Array.isArray(v)) chatMessagesStore.set(k, v);
      });
    }
  }
} catch {}

function saveMediaIndexToDisk() {
  try {
    fs.writeFileSync(
      MEDIA_INDEX_FILE,
      JSON.stringify(Array.from(mediaMetadataStore.values()), null, 2),
      'utf-8'
    );
  } catch {}
}

function saveChatMessagesToDisk() {
  try {
    const obj: Record<string, any[]> = {};
    for (const [k, v] of chatMessagesStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CHAT_MESSAGES_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {}
}

function isUserAuthorizedForConversation(
  userId: string,
  chatId: string,
  senderId?: string,
  recipientId?: string
): boolean {
  if (!userId || !chatId) return false;
  if (senderId && userId === senderId) return true;
  if (recipientId && userId === recipientId) return true;
  if (chatId.startsWith('g_')) return true;
  // Canonical 1:1 chatId format: sorted `<id1>_<id2>` where IDs themselves might contain `usr_12345`
  if (
    chatId === userId ||
    chatId.startsWith(`${userId}_`) ||
    chatId.endsWith(`_${userId}`) ||
    chatId.includes(`_${userId}_`)
  ) {
    return true;
  }
  return false;
}

const ALLOWED_MEDIA_MIME_PREFIXES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'audio/', 'application/pdf', 'text/plain'];

function isAllowedMediaMime(mime: string): boolean {
  const clean = mime.toLowerCase().split(';')[0].trim();
  return ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) =>
    prefix.endsWith('/') ? clean.startsWith(prefix) : clean === prefix
  );
}

// Binary raw upload parser specifically for /api/media/upload (up to 55MB)
app.use(
  '/api/media/upload',
  express.raw({
    type: '*/*',
    limit: '55mb',
  })
);

app.use(express.json({ limit: '55mb' }));


// Secure in-memory store for 6-digit Email Verification Codes (SHA-256 hashed, never exposed to client)
interface EmailVerificationRecord {
  codeHash: string;
  salt: string;
  expiresAt: number; // Strict 2-minute (120s) expiration
  lastSentAt: number; // Cooldown enforcement (30s)
  attempts: number; // Max 5 verification attempts per code
  sendHistory: number[]; // Rate limit window (max 5 sends per 15 minutes)
}

const emailVerificationStore = new Map<string, EmailVerificationRecord>();

const EMAIL_CODE_TTL_MS = 2 * 60 * 1000; // 2 minutes (120 seconds)
const EMAIL_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown
const EMAIL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_RATE_LIMIT_MAX_SENDS = 5;
const EMAIL_MAX_VERIFY_ATTEMPTS = 5;

function hashVerificationCode(code: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(code).digest('hex');
}

function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function getConfiguredEmailProvider(): 'smtp' | 'resend' | 'sendgrid' | null {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  return null;
}

async function sendRealEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ provider: string }> {
  const provider = getConfiguredEmailProvider();
  const fromAddress =
    process.env.SMTP_FROM || process.env.SMTP_USER || 'FlashTalk Security <onboarding@resend.dev>';

  if (provider === 'smtp') {
    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { provider: 'Gmail / SMTP' };
  }

  if (provider === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Resend API error (${res.status}): ${errBody}`);
    }
    return { provider: 'Resend API' };
  }

  if (provider === 'sendgrid') {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.to }] }],
        from: { email: (process.env.SMTP_USER || 'noreply@flashtalk.app').trim() },
        subject: params.subject,
        content: [
          { type: 'text/plain', value: params.text },
          { type: 'text/html', value: params.html },
        ],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`SendGrid API error (${res.status}): ${errBody}`);
    }
    return { provider: 'SendGrid API' };
  }

  throw new Error(
    'EMAIL_PROVIDER_NOT_CONFIGURED: Configure SMTP_USER + SMTP_PASS (Gmail App Password), RESEND_API_KEY, or SENDGRID_API_KEY in AI Studio Secrets.'
  );
}

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health & System Diagnostics Endpoint
app.get('/api/health', (_req, res) => {
  const emailProvider = getConfiguredEmailProvider();
  res.json({
    status: 'ok',
    service: 'FlashTalk Messenger Backend',
    authMode: 'gmail-email-only',
    emailProviderConfigured: Boolean(emailProvider),
    emailProvider: emailProvider || 'unconfigured (Firebase Email Verification Link available)',
    websocket: '/ws',
    geminiModels: ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash-tts'],
    timestamp: new Date().toISOString(),
  });
});

// Check Email Delivery Provider Status (Never exposes secrets)
app.get('/api/auth/email/status', (_req, res) => {
  const provider = getConfiguredEmailProvider();
  res.json({
    smtpConfigured: Boolean(provider),
    provider: provider || null,
    codeExpirationSeconds: 120,
    resendCooldownSeconds: 30,
  });
});

// Live Firebase & Google OAuth Configuration Diagnostics (Never exposes secret keys)
app.get('/api/auth/oauth-diagnostics', async (_req, res) => {
  try {
    const fs = await import('fs/promises');
    const raw = await fs.readFile(path.join(__dirname, 'firebase-applet-config.json'), 'utf-8');
    const cfg = JSON.parse(raw);

    let authorizedDomains: string[] = [];
    let googleProviderEnabled = false;
    let basicAuthResponseType = 'id_token';
    let driveScopesResponseType = 'code';

    try {
      const projRes = await fetch(
        `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${cfg.apiKey}`
      );
      if (projRes.ok) {
        const projData: any = await projRes.json();
        authorizedDomains = Array.isArray(projData.authorizedDomains) ? projData.authorizedDomains : [];
      }
    } catch {}

    try {
      const authUriRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${cfg.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: 'google.com',
            continueUri: `https://${cfg.authDomain}/__/auth/handler`,
          }),
        }
      );
      if (authUriRes.ok) {
        const authUriData: any = await authUriRes.json();
        googleProviderEnabled = Boolean(authUriData?.authUri);
        if (authUriData?.authUri?.includes('response_type=code')) {
          basicAuthResponseType = 'code';
        }
      }
    } catch {}

    res.json({
      projectId: cfg.projectId,
      projectNumber: cfg.messagingSenderId,
      appId: cfg.appId,
      oAuthClientId: cfg.oAuthClientId,
      authDomain: cfg.authDomain,
      firestoreDatabaseId: cfg.firestoreDatabaseId,
      authorizedRedirectUri: `https://${cfg.authDomain}/__/auth/handler`,
      googleProviderEnabled,
      basicAuthResponseType,
      driveScopesResponseType,
      authorizedDomains,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to inspect Firebase OAuth config.' });
  }
});

// Send Real 6-Digit Email Verification Code (Strict 2-minute TTL, 30s Cooldown, Rate Limited, Never Returns Code)
app.post('/api/auth/email/send-code', async (req, res) => {
  try {
    const rawEmail = String(req.body?.email || '').trim().toLowerCase();
    const userName = String(req.body?.name || 'FlashTalk User').trim();

    if (!isValidEmailAddress(rawEmail)) {
      res.status(400).json({ error: 'Please enter a valid Gmail or email address.' });
      return;
    }

    const now = Date.now();
    const existing = emailVerificationStore.get(rawEmail);

    // 1. Enforce 30-second Resend Cooldown
    if (existing && now - existing.lastSentAt < EMAIL_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((EMAIL_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      res.status(429).json({
        error: `Please wait ${retryAfterSeconds}s before requesting another verification code.`,
        retryAfterSeconds,
      });
      return;
    }

    // 2. Enforce 15-minute Rate Limit (Max 5 codes per 15 mins)
    const recentSends = (existing?.sendHistory || []).filter(
      (timestamp) => now - timestamp < EMAIL_RATE_LIMIT_WINDOW_MS
    );
    if (recentSends.length >= EMAIL_RATE_LIMIT_MAX_SENDS) {
      const oldest = recentSends[0];
      const retryAfterSeconds = Math.ceil((EMAIL_RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
      res.status(429).json({
        error: `Rate limit exceeded (max ${EMAIL_RATE_LIMIT_MAX_SENDS} codes per 15 minutes). Please try again in ${Math.ceil(
          retryAfterSeconds / 60
        )} minutes.`,
        retryAfterSeconds,
      });
      return;
    }

    // 3. Generate cryptographically secure 6-digit verification code
    const code = String(crypto.randomInt(100000, 1000000));
    const salt = crypto.randomBytes(16).toString('hex');
    const codeHash = hashVerificationCode(code, salt);
    const expiresAt = now + EMAIL_CODE_TTL_MS; // 2 minutes

    // 4. Send via real configured email delivery provider (NEVER return code in API response)
    const delivery = await sendRealEmail({
      to: rawEmail,
      subject: 'Your FlashTalk 6-Digit Email Verification Code',
      text: `Hello ${userName},\n\nYour FlashTalk 6-digit email verification code is: ${code}\n\nThis code will expire in 2 minutes.\nIf you did not request this code, please ignore this email.`,
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #0B101B; color: #F8FAFC; padding: 32px; border-radius: 20px; border: 1px solid #1E293B;">
          <h2 style="margin: 0 0 8px; color: #38BDF8; font-size: 20px;">FlashTalk Messenger</h2>
          <p style="margin: 0 0 20px; color: #94A3B8; font-size: 14px;">Hello ${userName}, use the 6-digit verification code below to verify your email address and activate your account:</p>
          <div style="background: #131C2E; border: 1px solid #0284C7; border-radius: 14px; padding: 18px; text-align: center; letter-spacing: 10px; font-size: 28px; font-weight: 800; color: #FFFFFF; font-family: monospace;">
            ${code}
          </div>
          <p style="margin: 20px 0 0; color: #94A3B8; font-size: 12px;">⏱ This code expires in strictly <strong>2 minutes</strong>. Never share this code with anyone.</p>
        </div>
      `,
    });

    // Save hashed code only after real email dispatch succeeds
    emailVerificationStore.set(rawEmail, {
      codeHash,
      salt,
      expiresAt,
      lastSentAt: now,
      attempts: 0,
      sendHistory: [...recentSends, now],
    });

    res.json({
      sent: true,
      email: rawEmail,
      provider: delivery.provider,
      expiresInSeconds: 120,
      cooldownSeconds: 30,
    });
  } catch (error: any) {
    const msg = error?.message || 'Failed to send verification email.';
    const isNotConfigured = msg.includes('EMAIL_PROVIDER_NOT_CONFIGURED');
    res.status(isNotConfigured ? 503 : 500).json({
      sent: false,
      providerConfigured: !isNotConfigured,
      error: isNotConfigured
        ? 'Backend SMTP/Email provider is not configured yet. Configure SMTP_USER & SMTP_PASS (Gmail App Password) or RESEND_API_KEY in AI Studio Secrets to send 6-digit codes, or use the Firebase Email Verification link sent to your inbox.'
        : msg,
    });
  }
});

// Verify 6-Digit Email Code (Checks 2-minute expiration, attempt limits, and timing-safe hash match)
app.post('/api/auth/email/verify-code', (req, res) => {
  const rawEmail = String(req.body?.email || '').trim().toLowerCase();
  const cleanCode = String(req.body?.code || '').trim();

  if (!isValidEmailAddress(rawEmail)) {
    res.status(400).json({ error: 'Valid email address is required.' });
    return;
  }

  if (!/^\d{6}$/.test(cleanCode)) {
    res.status(400).json({ error: 'Please enter a valid 6-digit numeric verification code.' });
    return;
  }

  const record = emailVerificationStore.get(rawEmail);
  if (!record) {
    res.status(400).json({
      error: 'No active verification code found for this email. Please click "Resend Code".',
      codeStatus: 'missing',
    });
    return;
  }

  if (Date.now() > record.expiresAt) {
    emailVerificationStore.delete(rawEmail);
    res.status(400).json({
      error: 'Your 6-digit verification code has expired (2-minute limit). Please click "Resend Code" to receive a new one.',
      codeStatus: 'expired',
    });
    return;
  }

  if (record.attempts >= EMAIL_MAX_VERIFY_ATTEMPTS) {
    emailVerificationStore.delete(rawEmail);
    res.status(429).json({
      error: 'Too many invalid verification attempts. Please request a new verification code.',
      codeStatus: 'locked',
    });
    return;
  }

  const candidateHash = hashVerificationCode(cleanCode, record.salt);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(record.codeHash, 'hex');
  const isMatch = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!isMatch) {
    record.attempts += 1;
    const remainingAttempts = Math.max(0, EMAIL_MAX_VERIFY_ATTEMPTS - record.attempts);
    if (remainingAttempts === 0) {
      emailVerificationStore.delete(rawEmail);
      res.status(429).json({
        error: 'Maximum verification attempts reached. Please click "Resend Code".',
        codeStatus: 'locked',
      });
      return;
    }
    res.status(400).json({
      error: `Invalid verification code. ${remainingAttempts} attempt(s) remaining before code is invalidated.`,
      codeStatus: 'invalid',
      remainingAttempts,
    });
    return;
  }

  // Code matched! Consume and delete the record immediately so it cannot be reused
  emailVerificationStore.delete(rawEmail);
  res.json({
    verified: true,
    email: rawEmail,
    verifiedAt: new Date().toISOString(),
  });
});


// 1. Multi-turn Gemini Chatbot Endpoint
// Supports gemini-4-argon (complex), gemini-3.8-flash (general), gemini-3.1-flash-lite (fast)
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const {
      messages = [],
      model = 'gemini-3.8-flash',
      systemInstruction = 'You are FlashTalk AI, a helpful, intelligent, and friendly assistant fluent in both Bengali and English.',
    } = req.body;

    const allowedModels = ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    const selectedModel = allowedModels.includes(model) ? model : 'gemini-3.8-flash';

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const ai = getGenAIClient();

    const history = messages.slice(0, -1).map((m: { role: string; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.text || '') }],
    }));

    const latestMessage = messages[messages.length - 1];

    const chat = ai.chats.create({
      model: selectedModel,
      history,
      config: {
        systemInstruction,
      },
    });

    const response = await chat.sendMessage({
      message: String(latestMessage.text || ''),
    });

    res.json({
      text: response.text || '',
      model: selectedModel,
    });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate chat response from Gemini.',
    });
  }
});

// 2. Image Understanding Endpoint using gemini-4-argon
app.post('/api/gemini/analyze-image', async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      prompt = 'Analyze this image in detail. Describe what you see, any text present, and key insights.',
    } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Image data is required.' });
      return;
    }

    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const ai = getGenAIClient();

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    res.json({
      text: response.text || 'No analysis returned.',
      model: 'gemini-4-argon',
    });
  } catch (error: any) {
    console.error('Gemini Image Analysis Error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to analyze image with gemini-4-argon.',
    });
  }
});

// 3. Text-to-Speech Endpoint using gemini-3.8-flash-tts
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      style = 'Natural, warm, expressive conversational tone',
    } = req.body;

    if (!text || !String(text).trim()) {
      res.status(400).json({ error: 'Text is required for speech generation.' });
      return;
    }

    const ai = getGenAIClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: String(text).trim(),
              speechMetadata: {
                style,
              },
            } as any,
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(500).json({ error: 'No audio data returned by gemini-3.8-flash-tts.' });
      return;
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      model: 'gemini-3.8-flash-tts',
    });
  } catch (error: any) {
    console.error('Gemini TTS Error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to convert text to speech.',
    });
  }
});

// ============================================================================
// CONVERSATION-AUTHORIZED MEDIA STORAGE, STREAMING & DOWNLOAD ROUTES
// ============================================================================

// 1. Upload Photo, Video, Audio, or Document with strict validation & conversation ACL
app.post('/api/media/upload', async (req, res) => {
  try {
    const rawFileName = decodeURIComponent(String(req.headers['x-file-name'] || 'attachment'));
    const mimeType = String(req.headers['x-mime-type'] || req.headers['content-type'] || 'application/octet-stream')
      .split(';')[0]
      .trim();
    const senderId = String(req.headers['x-sender-id'] || '').trim();
    const recipientId = String(req.headers['x-recipient-id'] || '').trim();
    const chatId = String(req.headers['x-chat-id'] || '').trim();
    const requestedStoragePath = decodeURIComponent(String(req.headers['x-storage-path'] || '')).trim();

    if (!senderId || !chatId) {
      res.status(401).json({ error: 'Authentication required: senderId and chatId must be provided.' });
      return;
    }

    if (!isUserAuthorizedForConversation(senderId, chatId)) {
      res.status(403).json({
        error: 'Forbidden: Sender is not an authorized participant of this conversation.',
      });
      return;
    }

    if (!isAllowedMediaMime(mimeType)) {
      res.status(415).json({
        error: `Unsupported media format (${mimeType}). Supported formats: JPG, JPEG, PNG, WebP, MP4, WebM, MOV, OGG, Audio, and PDF.`,
      });
      return;
    }

    const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    const fileSize = bodyBuffer.byteLength;

    if (fileSize === 0) {
      res.status(400).json({ error: 'Uploaded file is empty (0 bytes).' });
      return;
    }

    const isVideo = mimeType.startsWith('video/');
    const isImage = mimeType.startsWith('image/');
    const maxBytes = isVideo ? 50 * 1024 * 1024 : isImage ? 20 * 1024 * 1024 : 25 * 1024 * 1024;

    if (fileSize > maxBytes) {
      const limitMb = Math.round(maxBytes / (1024 * 1024));
      res.status(413).json({
        error: `File size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds the ${limitMb} MB limit for ${
          isVideo ? 'videos' : isImage ? 'photos' : 'files'
        }.`,
      });
      return;
    }

    const timestamp = Date.now();
    const mediaId = `med_${timestamp}_${crypto.randomBytes(6).toString('hex')}`;
    const safeFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_') || `media_${timestamp}`;
    const safeDiskName = `${mediaId}_${safeFileName}`;
    const storagePath = requestedStoragePath || `chats/${chatId}/${senderId}/${timestamp}_${safeFileName}`;

    await fsp.writeFile(path.join(MEDIA_STORAGE_DIR, safeDiskName), bodyBuffer);

    const downloadUrl = `/api/media/file/${mediaId}?chatId=${encodeURIComponent(chatId)}`;

    const record: StoredMediaMetadata = {
      mediaId,
      fileName: rawFileName,
      safeDiskName,
      mimeType,
      fileSize,
      storagePath,
      downloadUrl,
      senderId,
      recipientId,
      chatId,
      timestamp,
    };

    mediaMetadataStore.set(mediaId, record);
    saveMediaIndexToDisk();

    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Media upload failed on server.' });
  }
});

// 2. Stream or Download Conversation-Authorized Media File (Supports HTTP Range 206 for Mobile/Desktop Video Playback)
app.get('/api/media/file/:mediaId', async (req, res) => {
  try {
    const mediaId = String(req.params.mediaId || '').trim();
    const userId = String(req.query.userId || req.headers['x-user-id'] || '').trim();
    const chatId = String(req.query.chatId || '').trim();
    const wantDownload = req.query.download === '1' || req.query.download === 'true';

    const record = mediaMetadataStore.get(mediaId);
    if (!record) {
      res.status(404).json({ error: 'Media file not found.' });
      return;
    }

    // Strict Conversation Authorization Check
    if (
      !userId ||
      (chatId && chatId !== record.chatId) ||
      !isUserAuthorizedForConversation(userId, record.chatId, record.senderId, record.recipientId)
    ) {
      res.status(403).json({
        error: 'Forbidden: You are not authorized to access or download media from this conversation.',
      });
      return;
    }

    const filePath = path.join(MEDIA_STORAGE_DIR, record.safeDiskName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Original media binary no longer exists on storage.' });
      return;
    }

    const stat = fs.statSync(filePath);
    const totalSize = stat.size;
    const cleanFileName = record.fileName.replace(/["\r\n]/g, '_');

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (wantDownload) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${cleanFileName}"; filename*=UTF-8''${encodeURIComponent(cleanFileName)}`
      );
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${cleanFileName}"`);
    }

    const range = req.headers.range;
    if (range && !wantDownload) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (isNaN(start) || isNaN(end) || start >= totalSize || end >= totalSize) {
        res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
        return;
      }

      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', chunkSize);
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.status(200);
    res.setHeader('Content-Length', totalSize);
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to stream media file.' });
  }
});

// 3. Universal Authenticated Media Download Endpoint (Handles Firebase Storage URLs & Local Media URLs without CORS failures)
app.get('/api/media/download', async (req, res) => {
  try {
    const targetUrl = String(req.query.url || '').trim();
    const rawFileName = String(req.query.fileName || 'flashtalk-media').trim();
    const userId = String(req.query.userId || '').trim();
    const chatId = String(req.query.chatId || '').trim();

    if (!targetUrl) {
      res.status(400).json({ error: 'Missing media URL to download.' });
      return;
    }

    if (!userId || !chatId || !isUserAuthorizedForConversation(userId, chatId)) {
      res.status(403).json({
        error: 'Forbidden: You are not authorized to download media from this conversation.',
      });
      return;
    }

    // Case A: Local conversation-authorized media URL (/api/media/file/:mediaId)
    const localMatch = targetUrl.match(/\/api\/media\/file\/(med_[a-zA-Z0-9_]+)/);
    if (localMatch) {
      const mediaId = localMatch[1];
      const record = mediaMetadataStore.get(mediaId);
      if (!record) {
        res.status(404).json({ error: 'Media attachment not found.' });
        return;
      }
      if (!isUserAuthorizedForConversation(userId, record.chatId, record.senderId, record.recipientId)) {
        res.status(403).json({ error: 'Forbidden: Not authorized for this conversation.' });
        return;
      }
      const filePath = path.join(MEDIA_STORAGE_DIR, record.safeDiskName);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Media file missing from disk.' });
        return;
      }
      const cleanName = (rawFileName || record.fileName).replace(/["\r\n]/g, '_');
      const stat = fs.statSync(filePath);
      res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${cleanName}"; filename*=UTF-8''${encodeURIComponent(cleanName)}`
      );
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // Case B: Data URL (data:image/...;base64,...)
    if (targetUrl.startsWith('data:')) {
      const commaIdx = targetUrl.indexOf(',');
      if (commaIdx === -1) {
        res.status(400).json({ error: 'Malformed data URL.' });
        return;
      }
      const header = targetUrl.slice(5, commaIdx);
      const mimeType = header.split(';')[0] || 'application/octet-stream';
      const base64Data = targetUrl.slice(commaIdx + 1);
      const buf = Buffer.from(base64Data, 'base64');
      const cleanName = rawFileName.replace(/["\r\n]/g, '_');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buf.byteLength);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${cleanName}"; filename*=UTF-8''${encodeURIComponent(cleanName)}`
      );
      res.end(buf);
      return;
    }

    // Case C: Firebase Cloud Storage URL (https://firebasestorage.googleapis.com/...)
    if (targetUrl.startsWith('https://firebasestorage.googleapis.com/') || targetUrl.startsWith('https://storage.googleapis.com/')) {
      const upstream = await fetch(targetUrl);
      if (!upstream.ok) {
        res.status(upstream.status).json({
          error: `Firebase Storage download failed with HTTP ${upstream.status}.`,
        });
        return;
      }
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const arrayBuf = await upstream.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      const cleanName = rawFileName.replace(/["\r\n]/g, '_');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', buf.byteLength);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${cleanName}"; filename*=UTF-8''${encodeURIComponent(cleanName)}`
      );
      res.end(buf);
      return;
    }

    res.status(400).json({ error: 'Unsupported media URL scheme for download.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to download media file.' });
  }
});

// 4. Conversation-Authorized Message Synchronization API (Supports Multi-Account & Cross-Device Delivery)
app.get('/api/chat/messages', (req, res) => {
  const chatId = String(req.query.chatId || '').trim();
  const userId = String(req.query.userId || '').trim();
  if (!chatId || !userId) {
    res.status(400).json({ error: 'chatId and userId are required.' });
    return;
  }
  if (!isUserAuthorizedForConversation(userId, chatId)) {
    res.status(403).json({ error: 'Forbidden: You are not authorized to view messages in this conversation.' });
    return;
  }
  const messages = chatMessagesStore.get(chatId) || [];
  res.json({ chatId, messages });
});

app.post('/api/chat/messages', (req, res) => {
  const { chatId, userId, message } = req.body || {};
  if (!chatId || !userId || !message || !message.id) {
    res.status(400).json({ error: 'chatId, userId, and message object are required.' });
    return;
  }
  if (!isUserAuthorizedForConversation(userId, String(chatId), message.sender, message.recipientId)) {
    res.status(403).json({ error: 'Forbidden: You are not authorized to post to this conversation.' });
    return;
  }
  const list = chatMessagesStore.get(String(chatId)) || [];
  if (!list.some((m) => m.id === message.id)) {
    list.push(message);
    chatMessagesStore.set(String(chatId), list);
    saveChatMessagesToDisk();
  }
  res.json({ saved: true, chatId, messageId: message.id });
});

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  name: string;
  username: string;
  connectedAt: string;
}

const clients = new Map<WebSocket, ConnectedClient>();

function broadcastPresence() {
  const onlineUsers = Array.from(clients.values()).map((c) => ({
    userId: c.userId,
    name: c.name,
    username: c.username,
    connectedAt: c.connectedAt,
  }));
  const payload = JSON.stringify({
    type: 'presence:list',
    onlineUsers,
    timestamp: new Date().toISOString(),
  });
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function broadcastEvent(data: Record<string, any>, excludeWs?: WebSocket) {
  const payload = JSON.stringify({
    ...data,
    serverTimestamp: new Date().toISOString(),
  });
  for (const [ws, client] of clients.entries()) {
    if (ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

async function startServer() {
  const server = http.createServer(app);

  // Attach real-time WebSocket server at /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.set(ws, {
      ws,
      userId: 'anonymous',
      name: 'Guest',
      username: 'guest',
      connectedAt: new Date().toISOString(),
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (!msg || typeof msg.type !== 'string') return;

        switch (msg.type) {
          case 'presence:join': {
            const existing = clients.get(ws);
            if (existing) {
              existing.userId = String(msg.userId || existing.userId);
              existing.name = String(msg.name || existing.name);
              existing.username = String(msg.username || existing.username);
            }
            broadcastPresence();
            break;
          }
          case 'chat:message': {
            if (msg.chatId && msg.message && msg.message.id) {
              const cid = String(msg.chatId);
              const list = chatMessagesStore.get(cid) || [];
              if (!list.some((m) => m.id === msg.message.id)) {
                list.push(msg.message);
                chatMessagesStore.set(cid, list);
                saveChatMessagesToDisk();
              }
            }
            broadcastEvent(msg);
            break;
          }
          case 'chat:edit':
          case 'chat:delete':
          case 'chat:reaction':
          case 'chat:seen':
          case 'chat:typing':
          case 'story:post':
          case 'story:delete':
          case 'friend:request':
          case 'friend:accept':
          case 'call:offer':
          case 'call:answer':
          case 'call:ice':
          case 'call:reject':
          case 'call:end':
          case 'call:hold': {
            // Broadcast server-authoritative real-time event to all connected clients
            broadcastEvent(msg);
            break;
          }
          default:
            broadcastEvent(msg, ws);
            break;
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcastPresence();
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`FlashTalk Server & WebSocket (/ws) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
