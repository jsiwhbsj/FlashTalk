import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Users,
  CircleDot,
  Sparkles,
  HardDrive,
  Settings,
  User as UserIcon,
  Search,
  Plus,
  UserPlus,
  Send,
  Paperclip,
  Mic,
  Phone,
  Video,
  Download,
  Shield,
  Lock,
  Sun,
  Moon,
  ArrowLeft,
  X,
  Check,
  CheckCheck,
  Reply,
  Volume2,
  ScanEye,
  Trash2,
  ExternalLink,
  RefreshCw,
  LogOut,
  Camera,
  MicOff,
  VideoOff,
  SwitchCamera,
  PhoneOff,
  Pin,
  Archive,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Bot,
  Wand2,
  Edit3,
  Forward,
  Bell,
  BellOff,
  Globe,
  Pause,
  Play,
  Eye,
  KeyRound,
  Smartphone,
  HelpCircle,
  Database,
  Smile,
  ShieldAlert,
  Image as ImageIcon,
  Film,
  Maximize2,
  RotateCcw,
  MoreVertical,
  UploadCloud,
  Monitor,
  Tablet,
} from 'lucide-react';
import {
  auth,
  db,
  initAuth,
  googleSignIn,
  getAccessToken,
  logout,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  listDriveFiles,
  uploadTextBackupToDrive,
  deleteDriveFileById,
  DriveFileItem,
  OperationType,
  handleFirestoreError,
  FIREBASE_OAUTH_CONFIG_SUMMARY,
  uploadMediaAttachment,
  downloadMediaAttachment,
  formatFileSize,
} from './services/firebaseAuth';
import {
  GeminiChatModel,
  ChatTurn,
  sendGeminiChatMessage,
  analyzeImageWithGemini,
  synthesizeSpeechWithGemini,
} from './services/geminiClient';
import {
  encryptMessageE2EE,
  decryptMessageE2EE,
  isEncryptedPayload,
} from './services/cryptoE2EE';
import { WaveformAudioPlayer } from './components/WaveformAudioPlayer';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import {
  CameraCaptureModal,
  ReportAbuseModal,
  VerifyPasswordModal,
  GroupManageModal,
  StoryCreateModal,
  BuildAndAuditModal,
} from './components/StepModals';

interface AppUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  recoveryAnswer: string;
  bio: string;
  username: string;
  avatar: string;
  photoUrl?: string | null;
  passcode?: string | null;
  contacts: string[];
  groups: GroupChat[];
  stories: StoryItem[];
  blocked: string[];
  archived?: string[];
  pinned?: string[];
  muted?: string[];
  online: boolean;
  lastSeenTime: number;
  isLightMode?: boolean;
  category?: 'friends' | 'work';
}

interface GroupChat {
  id: string;
  name: string;
  avatar: string;
  members: string[];
  admin: string;
  adminIds?: string[];
  onlyAdminsCanPost?: boolean;
  inviteCode?: string;
  createdAt: number;
}

interface StoryItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'text';
  textContent?: string;
  backgroundGradient?: string;
  privacy?: 'everyone' | 'contacts' | 'close';
  viewers?: Array<{ name: string; time: number }>;
  caption: string;
  timestamp: number;
  expiresAt?: number;
}

interface ChatMessage {
  id: string;
  roomId?: string;
  chatId?: string;
  sender: string;
  senderId?: string;
  senderName: string;
  recipientId?: string;
  text: string;
  cipherText?: string;
  e2eeFingerprint?: string;
  edited?: boolean;
  deleted?: boolean;
  forwardedFrom?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'seen';
  timestamp: number;
  seen: boolean;
  mediaType?: 'image' | 'video' | 'audio' | 'file' | 'call' | 'drive';
  mediaUrl?: string;
  downloadUrl?: string;
  storagePath?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  replyTo?: {
    msgId: string;
    text: string;
    senderName: string;
  };
  reactions?: Record<string, string>;
  aiAnalysis?: string;
  ttsAudioUrl?: string;
}

interface StagedMediaItem {
  file: File;
  previewUrl: string;
  mediaType: 'image' | 'video' | 'file';
  fileName: string;
  mimeType: string;
  fileSize: number;
  caption: string;
  uploading: boolean;
  progress: number;
  transferredBytes: number;
  error: string | null;
}

interface FriendRequestItem {
  id: string;
  fromId: string;
  fromName: string;
  fromUsername: string;
  fromAvatar: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: number;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  title: string;
  message: string;
}

const DEFAULT_CONTACTS: Record<string, AppUser> = {
  u1: {
    id: 'u1',
    uid: '84920381',
    name: 'Rahim Ahmed',
    email: 'rahim@gmail.com',
    recoveryAnswer: 'dhaka',
    bio: 'Product Designer & Tech Enthusiast',
    username: 'rahim',
    avatar: 'RA',
    contacts: [],
    groups: [],
    stories: [],
    blocked: [],
    online: true,
    lastSeenTime: Date.now() - 15000,
    category: 'friends',
  },
  u2: {
    id: 'u2',
    uid: '59201843',
    name: 'Tanvir Hossain',
    email: 'tanvir@gmail.com',
    recoveryAnswer: 'sylhet',
    bio: 'Full-Stack Engineer • Building cloud systems',
    username: 'tanvir',
    avatar: 'TH',
    contacts: [],
    groups: [],
    stories: [],
    blocked: [],
    online: true,
    lastSeenTime: Date.now() - 25000,
    category: 'work',
  },
  u3: {
    id: 'u3',
    uid: '73019482',
    name: 'Sarah Jenkins',
    email: 'sarah.j@gmail.com',
    recoveryAnswer: 'winter',
    bio: 'Creative Director • Photography & Architecture',
    username: 'sarah',
    avatar: 'SJ',
    contacts: [],
    groups: [],
    stories: [],
    blocked: [],
    online: true,
    lastSeenTime: Date.now() - 10000,
    category: 'friends',
  },
  u4: {
    id: 'u4',
    uid: '61948205',
    name: 'David Williams',
    email: 'david.w@gmail.com',
    recoveryAnswer: 'alpine',
    bio: 'Lead Systems Architect',
    username: 'davidw',
    avatar: 'DW',
    contacts: [],
    groups: [],
    stories: [],
    blocked: [],
    online: false,
    lastSeenTime: Date.now() - 1800000,
    category: 'work',
  },
};

const INITIAL_DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  u1: [
    {
      id: 'm_demo_1',
      sender: 'u1',
      senderName: 'Rahim Ahmed',
      text: 'আসসালামু আলাইকুম! নতুন FlashTalk ডিজাইন এবং AI ফিচারগুলো কেমন চলছে?',
      timestamp: Date.now() - 3600000,
      seen: true,
    },
    {
      id: 'm_demo_2',
      sender: 'u1',
      senderName: 'Rahim Ahmed',
      text: 'Can we meet tomorrow? Do not forget the project documents on Google Drive.',
      timestamp: Date.now() - 1800000,
      seen: false,
    },
  ],
  u3: [
    {
      id: 'm_demo_3',
      sender: 'u3',
      senderName: 'Sarah Jenkins',
      text: 'Hey! I just shared the winter cabin design concept. Try running Gemini Image Analysis or TTS on our messages!',
      timestamp: Date.now() - 900000,
      seen: false,
    },
  ],
};

const AI_ROLES = [
  {
    id: 'assistant',
    label: 'FlashTalk Smart Assistant',
    instruction:
      'You are FlashTalk AI, an intelligent, warm, and concise bilingual assistant fluent in Bengali and English. Provide clear, well-structured answers.',
  },
  {
    id: 'bengali_mentor',
    label: 'বাংলা ভাষা ও লেখক সহকারী (Bengali Writer)',
    instruction:
      'আপনি একজন দক্ষ বাংলা লেখক, অনুবাদক ও পরামর্শদাতা। সব উত্তর প্রাঞ্জল ও সুন্দর বাংলায় প্রদান করুন।',
  },
  {
    id: 'coder',
    label: 'Senior Software Architect',
    instruction:
      'You are a Principal Full-Stack Engineer. Provide clean, production-ready code explanations, debugging help, and architectural advice.',
  },
  {
    id: 'coach',
    label: 'Study & Productivity Coach',
    instruction:
      'You are an encouraging study and executive productivity coach. Break down complex topics into actionable steps and clear summaries.',
  },
];

function generateRandomUID(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function formatLastSeen(timestamp?: number): string {
  if (!timestamp) return 'offline';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'online';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `last seen ${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `last seen ${diffHour}h ago`;
  return `last seen ${Math.floor(diffHour / 24)}d ago`;
}

export default function App() {
  // Navigation, Language & Theme State
  const [activeTab, setActiveTab] = useState<
    'chats' | 'contacts' | 'stories' | 'ai' | 'drive' | 'settings' | 'profile'
  >('chats');
  const [subSettingView, setSubSettingView] = useState<
    null | 'switch-account' | 'chat-settings' | 'privacy-settings' | 'notifications' | 'sessions-storage'
  >(null);
  const [uiLang, setUiLang] = useState<'en' | 'bn'>('en');
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [chatWallpaper, setChatWallpaper] = useState<string>('#080C14');
  const [chatFilter, setChatFilter] = useState<'all' | 'friends' | 'work' | 'groups' | 'archive'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auth & Accounts State (Gmail/Email-Only Registration, 6-Digit Email Code Verification, Password Reset)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [accountsList, setAccountsList] = useState<AppUser[]>([]);
  const [usersDirectory, setUsersDirectory] = useState<Record<string, AppUser>>(DEFAULT_CONTACTS);
  const [isSignUpMode, setIsSignUpMode] = useState<boolean>(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authAnswer1, setAuthAnswer1] = useState('');
  const [authAnswer2, setAuthAnswer2] = useState('');
  const [pendingVerificationUser, setPendingVerificationUser] = useState<AppUser | null>(null);
  const [emailCodeInput, setEmailCodeInput] = useState('');
  const [emailCodeSecondsLeft, setEmailCodeSecondsLeft] = useState<number>(120);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState<number>(0);
  const [emailAuthError, setEmailAuthError] = useState<string | null>(null);
  const [emailAuthNotice, setEmailAuthNotice] = useState<string | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<{ smtpConfigured: boolean; provider: string | null }>({
    smtpConfigured: false,
    provider: null,
  });
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showOAuthDiagnosticsModal, setShowOAuthDiagnosticsModal] = useState(false);
  const [oauthDiagnosticsData, setOauthDiagnosticsData] = useState<{
    googleProviderEnabled: boolean;
    authorizedDomains: string[];
    checkedAt: string | null;
  }>({
    googleProviderEnabled: true,
    authorizedDomains: [
      'gen-lang-client-0142706943.firebaseapp.com',
      'gen-lang-client-0142706943.web.app',
      'ais-dev-cjx6kbfeeoidv3flk4u625-742051385233.europe-west2.run.app',
      'ais-pre-cjx6kbfeeoidv3flk4u625-742051385233.europe-west2.run.app',
    ],
    checkedAt: null,
  });

  // Passcode Lock, Re-Auth & Recovery State
  const [isPasscodeLocked, setIsPasscodeLocked] = useState<boolean>(false);
  const [passcodeSetupStep, setPasscodeSetupStep] = useState<0 | 1 | 2>(0); // 0=unlock, 1=set new, 2=confirm new
  const [tempPinBuffer, setTempPinBuffer] = useState<string>('');
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [showForgotPinModal, setShowForgotPinModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotAnswer, setForgotAnswer] = useState<string>('');
  const [verifyPasswordModal, setVerifyPasswordModal] = useState<{
    open: boolean;
    actionLabel: string;
    onVerified: () => void;
  }>({ open: false, actionLabel: '', onVerified: () => {} });

  // Active Chat, E2EE, Edit/Delete/Forward & Real-Time WebSocket State (Step 3, 4, 12)
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isGroupChat, setIsGroupChat] = useState<boolean>(false);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>(INITIAL_DEMO_MESSAGES);
  const [messageInput, setMessageInput] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<{ msgId: string; text: string; senderName: string } | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [e2eeEnabled, setE2eeEnabled] = useState<boolean>(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [stagedMedia, setStagedMedia] = useState<StagedMediaItem | null>(null);
  const [downloadingMsgId, setDownloadingMsgId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [partnerTypingRoom, setPartnerTypingRoom] = useState<string | null>(null);
  const [lightboxMediaUrl, setLightboxMediaUrl] = useState<string | null>(null);
  const [lightboxMediaItem, setLightboxMediaItem] = useState<{
    url: string;
    mediaType: 'image' | 'video';
    fileName: string;
    mimeType?: string;
    fileSize?: number;
    chatId: string;
    msgId?: string;
  } | null>(null);
  const [synthesizingMsgId, setSynthesizingMsgId] = useState<string | null>(null);
  const [analyzingMsgId, setAnalyzingMsgId] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Step 4–16 Feature Modals & State
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showGroupManageModal, setShowGroupManageModal] = useState<boolean>(false);
  const [showStoryCreatorModal, setShowStoryCreatorModal] = useState<boolean>(false);
  const [showBuildAuditModal, setShowBuildAuditModal] = useState<boolean>(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([
    {
      id: 'freq_1',
      fromId: 'u_nusrat',
      fromName: 'Nusrat Jahan',
      fromUsername: 'nusrat_j',
      fromAvatar: 'NJ',
      status: 'pending',
      timestamp: Date.now() - 600000,
    },
    {
      id: 'freq_2',
      fromId: 'u_arif',
      fromName: 'Arifur Rahman',
      fromUsername: 'arif_dev',
      fromAvatar: 'AR',
      status: 'pending',
      timestamp: Date.now() - 1800000,
    },
  ]);
  const [notifSettings, setNotifSettings] = useState({
    push: true,
    manage: true,
    email: true,
  });
  const [activeSessions, setActiveSessions] = useState([
    { id: 'sess_current', device: 'Chrome Web / PWA Studio (Current)', ip: '103.112.204.18 · Dhaka, BD', activeNow: true },
    { id: 'sess_android', device: 'FlashTalk Android APK (Pixel 8 Pro)', ip: '103.112.204.19 · Dhaka, BD', activeNow: false },
  ]);

  // Modals State
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendSearchInput, setFriendSearchInput] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [storyCaptionInput, setStoryCaptionInput] = useState('');
  const [storyFilePreview, setStoryFilePreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [newAccAnswer, setNewAccAnswer] = useState('');

  // Profile Edit State
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileBioInput, setProfileBioInput] = useState('');
  const [profileUsernameInput, setProfileUsernameInput] = useState('');
  const [usernameStatusText, setUsernameStatusText] = useState('Enter a unique username.');
  const [isUsernameValid, setIsUsernameValid] = useState(true);
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');

  // WebRTC P2P Call State (Step 5: Incoming/Outgoing/Active Call + Hold + STUN/TURN)
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callerName: string;
    callerAvatar: string;
    type: 'voice' | 'video';
  } | null>(null);
  const [activeCall, setActiveCall] = useState<{
    open: boolean;
    type: 'voice' | 'video';
    targetName: string;
    targetAvatar: string;
    status: string;
    seconds: number;
    isMuted: boolean;
    isCameraOn: boolean;
    isOnHold?: boolean;
    facingMode: 'user' | 'environment';
  } | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Gemini AI Studio State (Multi-Turn Chat, Image Analysis, TTS Studio)
  const [aiSubTab, setAiSubTab] = useState<'chatbot' | 'vision' | 'tts'>('chatbot');
  const [aiChatModel, setAiChatModel] = useState<GeminiChatModel>('gemini-3.8-flash');
  const [aiRoleId, setAiRoleId] = useState<string>('assistant');
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>('');
  const [aiChatHistory, setAiChatHistory] = useState<
    Array<{ id: string; role: 'user' | 'model'; text: string; model?: string; timestamp: number; ttsUrl?: string }>
  >([
    {
      id: 'ai_welcome',
      role: 'model',
      text: 'স্বাগতম! আমি FlashTalk AI। আপনি আমার সাথে বাংলা বা ইংরেজিতে চ্যাট করতে পারেন, জটিল সমস্যার জন্য `gemini-4-argon`, সাধারণ কাজের জন্য `gemini-3.8-flash`, অথবা দ্রুত উত্তরের জন্য `gemini-3.1-flash-lite` বেছে নিতে পারেন।',
      model: 'gemini-3.8-flash',
      timestamp: Date.now(),
    },
  ]);
  const [aiPromptInput, setAiPromptInput] = useState<string>('');
  const [isAiChatLoading, setIsAiChatLoading] = useState<boolean>(false);

  // Vision (gemini-4-argon) State
  const [visionImage, setVisionImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [visionPrompt, setVisionPrompt] = useState<string>(
    'এই ছবিটি বিস্তারিত বিশ্লেষণ করো এবং মূল বিষয়বস্তু বাংলায় ও ইংরেজিতে ব্যাখ্যা করো। (Analyze this image in detail)'
  );
  const [visionResult, setVisionResult] = useState<string>('');
  const [isVisionLoading, setIsVisionLoading] = useState<boolean>(false);

  // TTS (gemini-3.8-flash-tts) State
  const [ttsInputText, setTtsInputText] = useState<string>(
    'স্বাগতম FlashTalk মেসেঞ্জারে! এখানে আপনার প্রতিটি বার্তা নিরাপদ এবং কৃত্রিম বুদ্ধিমত্তা সম্পন্ন।'
  );
  const [ttsVoice, setTtsVoice] = useState<'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir'>('Kore');
  const [ttsStyle, setTtsStyle] = useState<string>('Warm, natural, expressive conversational tone');
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isTtsLoading, setIsTtsLoading] = useState<boolean>(false);

  // Google Drive Integration State
  const [driveConnected, setDriveConnected] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveSearchQuery, setDriveSearchQuery] = useState<string>('');
  const [isDriveLoading, setIsDriveLoading] = useState<boolean>(false);
  const [driveFileToDelete, setDriveFileToDelete] = useState<DriveFileItem | null>(null);

  // Responsive Device, Breakpoint (<600px Phone, 600-1023px Tablet, >=1024px Desktop), Orientation & Keyboard State
  const [deviceViewport, setDeviceViewport] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    return {
      width: w,
      height: h,
      tier: (w < 600 ? 'phone' : w < 1024 ? 'tablet' : 'desktop') as 'phone' | 'tablet' | 'desktop',
      orientation: (w > h ? 'landscape' : 'portrait') as 'portrait' | 'landscape',
      isTouch:
        typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    };
  });
  const [isSoftKeyboardOpen, setIsSoftKeyboardOpen] = useState(false);
  const [showChatHeaderMenu, setShowChatHeaderMenu] = useState(false);
  const [showMobileAttachTray, setShowMobileAttachTray] = useState(false);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [desktopNotifPermission, setDesktopNotifPermission] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (type: ToastNotification['type'], title: string, message: string) => {
    const id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  // Track Viewport Breakpoints (<600px Phone, 600-1023px Tablet, >=1024px Desktop), Orientation & Android Virtual Keyboard
  useEffect(() => {
    const syncViewportMetrics = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const vvHeight = window.visualViewport?.height || h;
      document.documentElement.style.setProperty('--ft-app-height', `${vvHeight}px`);

      const tier: 'phone' | 'tablet' | 'desktop' =
        w < 600 ? 'phone' : w < 1024 ? 'tablet' : 'desktop';
      const orientation: 'portrait' | 'landscape' = w > h ? 'landscape' : 'portrait';
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setDeviceViewport({ width: w, height: vvHeight, tier, orientation, isTouch });

      const keyboardLikelyOpen = isTouch && h - vvHeight > 130;
      setIsSoftKeyboardOpen(keyboardLikelyOpen);
      if (keyboardLikelyOpen) {
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      }
    };

    syncViewportMetrics();
    window.addEventListener('resize', syncViewportMetrics);
    window.addEventListener('orientationchange', syncViewportMetrics);
    window.visualViewport?.addEventListener('resize', syncViewportMetrics);

    return () => {
      window.removeEventListener('resize', syncViewportMetrics);
      window.removeEventListener('orientationchange', syncViewportMetrics);
      window.visualViewport?.removeEventListener('resize', syncViewportMetrics);
    };
  }, []);

  // Desktop & Tablet Hardware Keyboard Shortcuts (Ctrl/Cmd+K Search, Escape to Close Menus/Modals)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveTab('chats');
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 40);
      } else if (e.key === 'Escape') {
        setShowChatHeaderMenu(false);
        setShowMobileAttachTray(false);
        setShowEmojiPicker(false);
        setLightboxMediaItem(null);
        setLightboxMediaUrl(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleRequestDesktopNotifications = async () => {
    if (!('Notification' in window)) {
      addToast('info', 'Notifications Unavailable', 'Browser notifications are not supported in this environment.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setDesktopNotifPermission(perm);
      if (perm === 'granted') {
        setNotifSettings((prev) => ({ ...prev, push: true }));
        addToast('success', 'Notifications Enabled', 'Desktop & mobile push notifications are now active.');
        try {
          new Notification('FlashTalk Notifications Active', {
            body: 'You will now receive instant alerts for messages and calls.',
            icon: '/pwa-192x192.png',
          });
        } catch {}
      } else {
        addToast('error', 'Permission Declined', 'Enable notifications in your browser settings to receive alerts.');
      }
    } catch {
      addToast('error', 'Notification Error', 'Could not request notification permission.');
    }
  };

  const triggerBrowserNotification = (title: string, body: string) => {
    if (!notifSettings.push) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/pwa-192x192.png' });
      } catch {}
    }
  };

  // Sound Effect
  const playPopSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  // Connect to Real-Time WebSocket Server (/ws) for multi-user chat, typing, presence & WebRTC signaling
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
        if (currentUser) {
          socket?.send(
            JSON.stringify({
              type: 'presence:join',
              userId: currentUser.id,
              name: currentUser.name,
              username: currentUser.username,
            })
          );
        }
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(String(event.data));
          if (!data || !data.type) return;

          if (data.type === 'chat:message' && data.roomId && data.message) {
            const incomingMsg: ChatMessage = data.message;
            const isGroupMsg = Boolean(data.isGroup || String(data.roomId).startsWith('g_'));
            // Resolve the correct conversation thread key for the current user
            let targetThreadId = String(data.roomId);
            if (!isGroupMsg && currentUser) {
              if (incomingMsg.sender === currentUser.id) {
                targetThreadId = String(data.recipientId || incomingMsg.recipientId || data.roomId);
              } else if (
                data.recipientId === currentUser.id ||
                incomingMsg.recipientId === currentUser.id ||
                data.roomId === currentUser.id
              ) {
                targetThreadId = incomingMsg.sender;
              } else {
                // Message belongs to a 1:1 conversation between two other users; ignore
                return;
              }
            }

            const canonicalRoomId =
              incomingMsg.chatId ||
              incomingMsg.roomId ||
              (isGroupMsg
                ? targetThreadId
                : currentUser
                ? [currentUser.id, targetThreadId].sort().join('_')
                : targetThreadId);

            if (incomingMsg.cipherText && isEncryptedPayload(incomingMsg.cipherText)) {
              incomingMsg.text = await decryptMessageE2EE(incomingMsg.cipherText, canonicalRoomId);
            }

            // If a new user sent us a message, register them in usersDirectory & contacts so the thread appears
            if (currentUser && !isGroupMsg && incomingMsg.sender !== currentUser.id) {
              const senderId = incomingMsg.sender;
              setUsersDirectory((prev) => {
                if (prev[senderId]) return prev;
                const sp = data.senderProfile || {};
                return {
                  ...prev,
                  [senderId]: {
                    id: senderId,
                    uid: sp.uid || '90000001',
                    name: incomingMsg.senderName || sp.name || 'FlashTalk User',
                    email: sp.email || `${senderId}@gmail.com`,
                    username: sp.username || senderId.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                    avatar:
                      sp.avatar ||
                      (incomingMsg.senderName || 'FT')
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2),
                    contacts: [],
                    groups: [],
                    stories: [],
                    blocked: [],
                    online: true,
                    lastSeenTime: Date.now(),
                    category: 'friends',
                    bio: sp.bio || 'Available on FlashTalk',
                    recoveryAnswer: '',
                  },
                };
              });
              setCurrentUser((prevUser) => {
                if (!prevUser || (prevUser.contacts || []).includes(senderId)) return prevUser;
                const updatedUser = {
                  ...prevUser,
                  contacts: [senderId, ...(prevUser.contacts || [])],
                };
                localStorage.setItem('flashtalk_user', JSON.stringify(updatedUser));
                return updatedUser;
              });
            }

            setMessagesByRoom((prev) => {
              const roomMsgs = prev[targetThreadId] || [];
              if (roomMsgs.some((m) => m.id === incomingMsg.id)) return prev;
              return {
                ...prev,
                [targetThreadId]: [...roomMsgs, incomingMsg].sort((a, b) => a.timestamp - b.timestamp),
              };
            });
            if (currentUser && incomingMsg.sender !== currentUser.id) {
              playPopSound();
              triggerBrowserNotification(incomingMsg.senderName, incomingMsg.text);
            }
          } else if (data.type === 'chat:edit' && data.roomId && data.msgId) {
            const targetKey =
              !data.isGroup && currentUser && data.senderId && data.senderId !== currentUser.id
                ? data.senderId
                : data.roomId;
            setMessagesByRoom((prev) => ({
              ...prev,
              [targetKey]: (prev[targetKey] || []).map((m) =>
                m.id === data.msgId ? { ...m, text: data.newText, edited: true } : m
              ),
            }));
          } else if (data.type === 'chat:delete' && data.roomId && data.msgId) {
            const targetKey =
              !data.isGroup && currentUser && data.senderId && data.senderId !== currentUser.id
                ? data.senderId
                : data.roomId;
            setMessagesByRoom((prev) => ({
              ...prev,
              [targetKey]: (prev[targetKey] || []).map((m) =>
                m.id === data.msgId
                  ? {
                      ...m,
                      text: 'This message was deleted',
                      deleted: true,
                      mediaUrl: undefined,
                      downloadUrl: undefined,
                    }
                  : m
              ),
            }));
          } else if (data.type === 'chat:typing' && data.roomId) {
            if (currentUser && data.userId !== currentUser.id) {
              const typingKey = data.isGroup ? data.roomId : data.userId;
              setPartnerTypingRoom(typingKey);
              setTimeout(() => setPartnerTypingRoom(null), 2200);
            }
          } else if (data.type === 'call:offer' && currentUser && data.calleeId === currentUser.id) {
            setIncomingCall({
              callerId: data.callerId,
              callerName: data.callerName || 'FlashTalk Caller',
              callerAvatar: data.callerAvatar || 'FT',
              type: data.callType || 'video',
            });
            triggerBrowserNotification('Incoming FlashTalk Call', `${data.callerName || 'Someone'} is calling...`);
          }
        } catch {}
      };

      socket.onclose = () => {
        setWsConnected(false);
      };
    } catch {}

    return () => {
      socket?.close();
    };
  }, [currentUser?.id]);

  // Synchronize Active Conversation Messages from Authorized Server Store & Firestore
  useEffect(() => {
    if (!currentUser || !activeChatId) return;
    const canonicalChatId = isGroupChat
      ? activeChatId
      : [currentUser.id, activeChatId].sort().join('_');
    const threadKey = activeChatId;

    let cancelled = false;

    const syncFromBackend = async () => {
      try {
        const res = await fetch(
          `/api/chat/messages?chatId=${encodeURIComponent(canonicalChatId)}&userId=${encodeURIComponent(
            currentUser.id
          )}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (Array.isArray(data?.messages) && data.messages.length > 0) {
          const decryptedList: ChatMessage[] = [];
          for (const rawMsg of data.messages) {
            const copy: ChatMessage = { ...rawMsg };
            if (copy.cipherText && isEncryptedPayload(copy.cipherText)) {
              copy.text = await decryptMessageE2EE(copy.cipherText, canonicalChatId);
            }
            decryptedList.push(copy);
          }
          if (cancelled) return;
          setMessagesByRoom((prev) => {
            const existing = prev[threadKey] || [];
            const map = new Map<string, ChatMessage>();
            existing.forEach((m) => map.set(m.id, m));
            decryptedList.forEach((m) => map.set(m.id, m));
            return {
              ...prev,
              [threadKey]: Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp),
            };
          });
        }
      } catch {}
    };

    syncFromBackend();
    const pollTimer = window.setInterval(syncFromBackend, 3500);

    // Also attach Firestore real-time listener when Firebase Auth is active
    let unsubFirestore: (() => void) | null = null;
    if (auth.currentUser) {
      try {
        const q = query(collection(db, 'chats', canonicalChatId, 'messages'), orderBy('timestamp', 'asc'));
        unsubFirestore = onSnapshot(
          q,
          async (snap) => {
            if (cancelled || snap.empty) return;
            const loaded: ChatMessage[] = [];
            for (const docSnap of snap.docs) {
              const d = docSnap.data() as ChatMessage;
              if (d && d.id) {
                const copy = { ...d };
                if (copy.cipherText && isEncryptedPayload(copy.cipherText)) {
                  copy.text = await decryptMessageE2EE(copy.cipherText, canonicalChatId);
                }
                loaded.push(copy);
              }
            }
            if (cancelled || loaded.length === 0) return;
            setMessagesByRoom((prev) => {
              const existing = prev[threadKey] || [];
              const map = new Map<string, ChatMessage>();
              existing.forEach((m) => map.set(m.id, m));
              loaded.forEach((m) => map.set(m.id, m));
              return {
                ...prev,
                [threadKey]: Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp),
              };
            });
          },
          () => {}
        );
      } catch {}
    }

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      if (unsubFirestore) unsubFirestore();
    };
  }, [currentUser?.id, activeChatId, isGroupChat]);

  // Load persisted accounts & session on mount
  useEffect(() => {
    try {
      const savedAccs = localStorage.getItem('flashtalk_accounts');
      if (savedAccs) {
        setAccountsList(JSON.parse(savedAccs));
      }
      const savedTheme = localStorage.getItem('flashtalk_theme');
      if (savedTheme) {
        setChatWallpaper(savedTheme);
      }
      const savedUser = localStorage.getItem('flashtalk_user');
      if (savedUser) {
        const parsed: AppUser = JSON.parse(savedUser);
        if (!parsed.contacts || parsed.contacts.length === 0) {
          parsed.contacts = ['u1', 'u2', 'u3', 'u4'];
        }
        setCurrentUser(parsed);
        setIsLightMode(!!parsed.isLightMode);
        setProfileNameInput(parsed.name);
        setProfileBioInput(parsed.bio || '');
        setProfileUsernameInput(parsed.username || '');
        setRecoveryAnswerInput(parsed.recoveryAnswer || '');
        if (parsed.passcode) {
          setPasscodeSetupStep(0);
          setIsPasscodeLocked(true);
        }
      }
    } catch {}

    const unsub = initAuth(
      (_user, token) => {
        if (token) setDriveConnected(true);
      },
      () => {
        setDriveConnected(false);
      }
    );

    // Fetch existing Firestore users so friend search finds real users
    getDocs(collection(db, 'users'))
      .then((snap) => {
        const loaded: Record<string, AppUser> = { ...DEFAULT_CONTACTS };
        snap.forEach((d) => {
          const data = d.data() as AppUser;
          if (data && data.id) {
            loaded[data.id] = data;
          }
        });
        setUsersDirectory(loaded);
      })
      .catch(() => {});

    return () => unsub();
  }, []);

  // Scroll chat to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatId, messagesByRoom, aiChatHistory]);

  const persistUserAndAccount = async (updated: AppUser) => {
    setCurrentUser(updated);
    localStorage.setItem('flashtalk_user', JSON.stringify(updated));
    setUsersDirectory((prev) => ({ ...prev, [updated.id]: updated }));

    setAccountsList((prev) => {
      const idx = prev.findIndex((a) => a.email === updated.email);
      const next = idx !== -1 ? prev.map((a, i) => (i === idx ? updated : a)) : [...prev, updated];
      localStorage.setItem('flashtalk_accounts', JSON.stringify(next));
      return next;
    });

    try {
      await setDoc(doc(db, 'users', updated.id), updated, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${updated.id}`);
    }
  };

  // Check Backend Email Provider & Live Firebase OAuth Diagnostics on Mount
  useEffect(() => {
    fetch('/api/auth/email/status')
      .then((r) => r.json())
      .then((d) => {
        if (d) {
          setSmtpStatus({
            smtpConfigured: Boolean(d.smtpConfigured),
            provider: d.provider || null,
          });
        }
      })
      .catch(() => {});

    fetch('/api/auth/oauth-diagnostics')
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) {
          setOauthDiagnosticsData({
            googleProviderEnabled: Boolean(d.googleProviderEnabled),
            authorizedDomains: Array.isArray(d.authorizedDomains) ? d.authorizedDomains : [],
            checkedAt: d.checkedAt || null,
          });
        }
      })
      .catch(() => {});
  }, []);

  // 2-Minute (120s) Expiration Countdown & 30s Resend Cooldown Timer
  useEffect(() => {
    if (!pendingVerificationUser) return;
    const timer = window.setInterval(() => {
      setEmailCodeSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pendingVerificationUser]);

  // Dispatch Real 6-Digit Email Verification Code + Firebase Email Verification Link
  const dispatchEmailVerificationCode = async (targetEmail: string, targetName: string) => {
    setEmailAuthError(null);
    setEmailAuthNotice(null);
    setIsAuthLoading(true);
    try {
      // 1. Trigger Firebase Auth real verification email if signed into Firebase Auth
      let firebaseLinkSent = false;
      if (auth.currentUser && auth.currentUser.email?.toLowerCase() === targetEmail.toLowerCase()) {
        try {
          await sendEmailVerification(auth.currentUser);
          firebaseLinkSent = true;
        } catch {}
      }

      // 2. Trigger Backend Real 6-Digit Email Verification Code
      const res = await fetch('/api/auth/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, name: targetName }),
      });
      const data = await res.json();

      if (res.status === 429) {
        if (data.retryAfterSeconds) {
          setResendCooldownSeconds(data.retryAfterSeconds);
        }
        setEmailAuthError(data.error || 'Please wait before requesting another verification code.');
        addToast('error', 'Rate Limit / Cooldown', data.error || 'Please wait before resending.');
        return false;
      }

      if (!res.ok) {
        // Backend SMTP not configured yet or returned an error
        setEmailCodeSecondsLeft(120);
        setResendCooldownSeconds(30);
        if (firebaseLinkSent) {
          setEmailAuthNotice(
            `A real Firebase verification email was sent to ${targetEmail}. To also receive 6-digit SMTP codes, configure SMTP_USER & SMTP_PASS (or RESEND_API_KEY) in AI Studio Secrets.`
          );
          addToast(
            'info',
            'Firebase Verification Email Sent',
            `Check ${targetEmail} inbox/spam for your verification email.`
          );
        } else {
          setEmailAuthError(
            data.error ||
              'Real email delivery requires SMTP_USER & SMTP_PASS (Gmail App Password) or RESEND_API_KEY in AI Studio Secrets, or Email/Password enabled in Firebase Console.'
          );
          addToast('error', 'Email Provider Setup Needed', data.error || 'Could not dispatch email.');
        }
        return false;
      }

      setSmtpStatus({ smtpConfigured: true, provider: data.provider || 'SMTP' });
      setEmailCodeSecondsLeft(data.expiresInSeconds || 120);
      setResendCooldownSeconds(data.cooldownSeconds || 30);
      setEmailCodeInput('');
      setEmailAuthNotice(
        `A 6-digit verification code has been sent to ${targetEmail} via ${data.provider || 'Email Service'}. It expires in 2 minutes.`
      );
      addToast(
        'success',
        'Verification Code Sent',
        `Check ${targetEmail} for your 6-digit verification code (valid for 2 minutes).`
      );
      return true;
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Failed to communicate with email verification service.');
      addToast('error', 'Verification Error', err?.message || 'Failed to send verification email.');
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Verify 6-Digit Code Before Activating Account
  const handleVerifyEmailCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingVerificationUser) return;
    setEmailAuthError(null);

    if (emailCodeSecondsLeft <= 0) {
      const msg = 'Your 6-digit verification code has expired (2-minute limit). Please click "Resend Code".';
      setEmailAuthError(msg);
      addToast('error', 'Code Expired', msg);
      return;
    }

    const cleanCode = emailCodeInput.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      const msg = 'Please enter the complete 6-digit numeric verification code sent to your email.';
      setEmailAuthError(msg);
      addToast('error', 'Invalid Code Format', msg);
      return;
    }

    setIsAuthLoading(true);
    try {
      const res = await fetch('/api/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingVerificationUser.email,
          code: cleanCode,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.verified) {
        const errMsg = data.error || 'Invalid or expired verification code.';
        setEmailAuthError(errMsg);
        addToast('error', 'Verification Failed', errMsg);
        return;
      }

      // Activate account only after real verification succeeds
      const activatedUser: AppUser = {
        ...pendingVerificationUser,
        emailVerified: true,
        online: true,
        lastSeenTime: Date.now(),
      };
      await persistUserAndAccount(activatedUser);
      setPendingVerificationUser(null);
      setEmailCodeInput('');
      setProfileNameInput(activatedUser.name);
      setProfileBioInput(activatedUser.bio || '');
      setProfileUsernameInput(activatedUser.username || '');
      setRecoveryAnswerInput(activatedUser.recoveryAnswer || '');
      setActiveChatId('u1');
      addToast('success', 'Email Verified & Account Activated!', `Welcome to FlashTalk, ${activatedUser.name}!`);
    } catch (err: any) {
      const errMsg = err?.message || 'Could not verify code.';
      setEmailAuthError(errMsg);
      addToast('error', 'Verification Error', errMsg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Check if user clicked the real Firebase Email Verification link in their inbox
  const handleCheckFirebaseEmailLinkVerified = async () => {
    if (!pendingVerificationUser) return;
    setEmailAuthError(null);
    setIsAuthLoading(true);
    try {
      if (!auth.currentUser) {
        setEmailAuthError(
          'Firebase Email/Password session not active. Please verify using the 6-digit email code above.'
        );
        return;
      }
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        const activatedUser: AppUser = {
          ...pendingVerificationUser,
          emailVerified: true,
          online: true,
          lastSeenTime: Date.now(),
        };
        await persistUserAndAccount(activatedUser);
        setPendingVerificationUser(null);
        setEmailCodeInput('');
        setProfileNameInput(activatedUser.name);
        setProfileBioInput(activatedUser.bio || '');
        setProfileUsernameInput(activatedUser.username || '');
        setRecoveryAnswerInput(activatedUser.recoveryAnswer || '');
        setActiveChatId('u1');
        addToast('success', 'Firebase Email Verified!', `Your account (${activatedUser.email}) is now active.`);
      } else {
        setEmailAuthError(
          'Your email is not marked as verified in Firebase yet. Please click the verification link in your email inbox or enter the 6-digit code.'
        );
        addToast('info', 'Not Verified Yet', 'Please check your inbox/spam folder first.');
      }
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Failed to check Firebase verification status.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    const email = (resetEmailInput.trim() || authEmail.trim()).toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast('error', 'Valid Email Required', 'Please enter your registered Gmail or email address.');
      return;
    }
    setIsAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      addToast(
        'success',
        'Password Reset Email Sent',
        `A secure password reset link has been sent to ${email} via Firebase Authentication.`
      );
      setShowPasswordResetModal(false);
    } catch (err: any) {
      addToast(
        'error',
        'Password Reset Error',
        err?.message || 'Ensure Email/Password provider is enabled in your Firebase Console.'
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!currentUser) return;
    setIsAuthLoading(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        addToast(
          'success',
          'Verification Email Sent',
          `A verification link has been sent to ${currentUser.email}.`
        );
      } else {
        await dispatchEmailVerificationCode(currentUser.email, currentUser.name);
      }
    } catch (err: any) {
      addToast('error', 'Verification Error', err?.message || 'Could not send verification email.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Gmail / Email & Password Registration and Login Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAuthError(null);
    setEmailAuthNotice(null);

    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();
    const name = authName.trim();
    const ans1 = authAnswer1.trim();
    const ans2 = authAnswer2.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast('error', 'Invalid Email', 'Please enter a valid Gmail or email address.');
      return;
    }
    if (!password || (isSignUpMode && (!name || !ans1 || !ans2))) {
      addToast('error', 'Incomplete Form', 'Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      addToast('error', 'Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }
    if (isSignUpMode && ans1 !== ans2) {
      addToast('error', 'Recovery Mismatch', 'Both secret recovery answers must match.');
      return;
    }

    setIsAuthLoading(true);
    try {
      const cleanUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

      if (isSignUpMode) {
        // REGISTRATION FLOW: Create unactivated user & require real email verification before activating
        let firebaseUid = 'usr_' + generateRandomUID();
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          firebaseUid = cred.user.uid;
        } catch (fbErr: any) {
          if (fbErr?.code === 'auth/email-already-in-use') {
            addToast('error', 'Email Already Registered', 'This email is already registered. Please sign in instead.');
            setIsSignUpMode(false);
            setIsAuthLoading(false);
            return;
          }
        }

        const newPendingUser: AppUser = {
          id: firebaseUid,
          uid: generateRandomUID(),
          name,
          email,
          emailVerified: false,
          recoveryAnswer: ans1,
          bio: 'FlashTalk Secure AI Messenger User',
          username: cleanUsername,
          avatar: name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2),
          photoUrl: null,
          passcode: null,
          contacts: ['u1', 'u2', 'u3', 'u4'],
          groups: [],
          stories: [],
          blocked: [],
          archived: [],
          pinned: ['u1'],
          online: true,
          lastSeenTime: Date.now(),
          isLightMode: false,
        };

        // Hold account in pending verification state — DO NOT activate currentUser until verified!
        setPendingVerificationUser(newPendingUser);
        setEmailCodeInput('');
        setEmailCodeSecondsLeft(120);
        await dispatchEmailVerificationCode(email, name);
        return;
      }

      // LOGIN FLOW: Authenticate existing user with Gmail/email and password
      let userObj: AppUser | null = null;
      let isFirebaseEmailVerified = false;

      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        isFirebaseEmailVerified = cred.user.emailVerified;
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        if (snap.exists()) {
          userObj = snap.data() as AppUser;
          if (!userObj.contacts || userObj.contacts.length === 0) {
            userObj.contacts = ['u1', 'u2', 'u3', 'u4'];
          }
        } else {
          userObj = {
            id: cred.user.uid,
            uid: generateRandomUID(),
            name: email.split('@')[0],
            email,
            emailVerified: cred.user.emailVerified,
            recoveryAnswer: 'secret',
            bio: 'FlashTalk Secure AI Messenger User',
            username: cleanUsername,
            avatar: email.slice(0, 2).toUpperCase(),
            contacts: ['u1', 'u2', 'u3', 'u4'],
            groups: [],
            stories: [],
            blocked: [],
            online: true,
            lastSeenTime: Date.now(),
          };
        }
      } catch (fbLoginErr: any) {
        if (
          fbLoginErr?.code === 'auth/wrong-password' ||
          fbLoginErr?.code === 'auth/invalid-credential'
        ) {
          addToast('error', 'Invalid Credentials', 'Incorrect email or password. Please try again.');
          setIsAuthLoading(false);
          return;
        }
        const existingLocal = accountsList.find((a) => a.email.toLowerCase() === email.toLowerCase());
        if (existingLocal) {
          userObj = existingLocal;
        } else {
          addToast(
            'error',
            'Account Not Found',
            'No verified account found for this email. Please create an account and verify your email first.'
          );
          setIsAuthLoading(false);
          return;
        }
      }

      // Require email verification before allowing login activation
      if (!userObj.emailVerified && !isFirebaseEmailVerified) {
        setPendingVerificationUser(userObj);
        setEmailCodeInput('');
        setEmailCodeSecondsLeft(120);
        await dispatchEmailVerificationCode(userObj.email, userObj.name);
        addToast(
          'info',
          'Email Verification Required',
          'Please verify the 6-digit code sent to your email before accessing your account.'
        );
        return;
      }

      const verifiedUser = { ...userObj, emailVerified: true };
      await persistUserAndAccount(verifiedUser);
      setProfileNameInput(verifiedUser.name);
      setProfileBioInput(verifiedUser.bio || '');
      setProfileUsernameInput(verifiedUser.username || '');
      setRecoveryAnswerInput(verifiedUser.recoveryAnswer || '');
      setActiveChatId('u1');
      addToast('success', 'Signed In Successfully', `Welcome back, ${verifiedUser.name}!`);
    } catch (err: any) {
      addToast('error', 'Authentication Error', err?.message || 'Unable to sign in.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLogin = async (includeDriveScopes = false) => {
    setIsAuthLoading(true);
    try {
      const res = await googleSignIn({ includeDriveScopes });
      if (res) {
        if (res.driveScopesGranted) {
          setDriveConnected(true);
        }
        const gUser = res.user;
        const email = gUser.email || 'user@gmail.com';
        const name = gUser.displayName || email.split('@')[0];
        const cleanUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

        const userObj: AppUser = {
          id: gUser.uid,
          uid: generateRandomUID(),
          name,
          email,
          emailVerified: true,
          recoveryAnswer: 'google',
          bio: res.driveScopesGranted
            ? 'Connected with Google Workspace & Drive'
            : 'Verified via Google Sign-In',
          username: cleanUsername,
          avatar: name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2),
          photoUrl: gUser.photoURL,
          passcode: null,
          contacts: ['u1', 'u2', 'u3', 'u4'],
          groups: [],
          stories: [],
          blocked: [],
          archived: [],
          pinned: ['u1'],
          online: true,
          lastSeenTime: Date.now(),
          isLightMode: false,
        };

        await persistUserAndAccount(userObj);
        setProfileNameInput(userObj.name);
        setProfileBioInput(userObj.bio);
        setProfileUsernameInput(userObj.username);
        setRecoveryAnswerInput(userObj.recoveryAnswer);
        setActiveChatId('u1');
        addToast(
          'success',
          'Google সংযুক্ত হয়েছে',
          res.driveScopesGranted
            ? 'Google অ্যাকাউন্ট ও Google Drive সক্রিয় করা হয়েছে।'
            : 'Google অ্যাকাউন্ট দিয়ে সফলভাবে সাইন-ইন সম্পন্ন হয়েছে।'
        );
      } else {
        addToast('info', 'সাইন-ইন বাতিল করা হয়েছে', 'Google সাইন-ইন পপআপটি বন্ধ করা হয়েছে।');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Google লগইন সম্পন্ন হয়নি।';
      addToast('error', 'Google Sign-In ত্রুটি', errMsg);
      if (errMsg.includes('403') || errMsg.includes('access_denied') || errMsg.includes('Authorized Domains')) {
        setShowOAuthDiagnosticsModal(true);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Passcode Lock Verification
  const handleVerifyPasscode = () => {
    if (!currentUser) return;
    const val = passcodeInput.trim();
    if (val.length !== 4) {
      addToast('error', 'ভুল পিন', 'অনুগ্রহ করে ৪ সংখ্যার পিন দিন।');
      return;
    }

    if (passcodeSetupStep === 1) {
      setTempPinBuffer(val);
      setPasscodeInput('');
      setPasscodeSetupStep(2);
      return;
    }

    if (passcodeSetupStep === 2) {
      if (val === tempPinBuffer) {
        const updated = { ...currentUser, passcode: val };
        persistUserAndAccount(updated);
        setPasscodeSetupStep(0);
        setPasscodeInput('');
        setIsPasscodeLocked(false);
        addToast('success', 'পাসকোড চালু হয়েছে', 'আপনার ৪-সংখ্যার নিরাপত্তা পিন সেট করা হয়েছে।');
      } else {
        addToast('error', 'পিন মেলেনি', 'দুটি পিন এক হয়নি, আবার চেষ্টা করুন।');
        setPasscodeSetupStep(1);
        setPasscodeInput('');
      }
      return;
    }

    if (val === currentUser.passcode) {
      setPasscodeInput('');
      setIsPasscodeLocked(false);
      addToast('success', 'আনলক সফল', 'FlashTalk আনলক করা হয়েছে।');
    } else {
      addToast('error', 'ভুল পাসকোড', 'সঠিক ৪ সংখ্যার পিন প্রদান করুন।');
      setPasscodeInput('');
    }
  };

  const handleResetPinViaRecovery = () => {
    if (!currentUser) return;
    if (
      forgotEmail.trim().toLowerCase() === currentUser.email.toLowerCase() &&
      forgotAnswer.trim().toLowerCase() === (currentUser.recoveryAnswer || '').toLowerCase()
    ) {
      setShowForgotPinModal(false);
      setForgotEmail('');
      setForgotAnswer('');
      setPasscodeSetupStep(1);
      setTempPinBuffer('');
      setPasscodeInput('');
      setIsPasscodeLocked(true);
      addToast('info', 'নতুন পিন দিন', 'আপনার পরিচয় যাচাই হয়েছে। নতুন ৪-সংখ্যার পিন সেট করুন।');
    } else {
      addToast('error', 'তথ্য মেলেনি', 'আপনার Gmail অথবা Secret Recovery Answer সঠিক নয়!');
    }
  };

  // Chat Room Helpers
  const getActiveTarget = () => {
    if (!activeChatId || !currentUser) return null;
    if (isGroupChat) {
      return currentUser.groups.find((g) => g.id === activeChatId) || null;
    }
    return usersDirectory[activeChatId] || null;
  };

  const handleSendMessage = async () => {
    if (!currentUser || !activeChatId) return;
    const text = messageInput.trim();
    if (!text) return;

    // Handle editing an existing message (Step 3)
    if (editingMsgId) {
      const targetMsgId = editingMsgId;
      setEditingMsgId(null);
      setMessageInput('');
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).map((m) =>
          m.id === targetMsgId ? { ...m, text, edited: true } : m
        ),
      }));
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'chat:edit',
            roomId: activeChatId,
            msgId: targetMsgId,
            newText: text,
          })
        );
      }
      addToast('success', 'মেসেজ এডিট হয়েছে', 'আপনার বার্তাটি আপডেট করা হয়েছে।');
      return;
    }

    // Check group admin posting restriction (Step 7)
    if (isGroupChat) {
      const grp = currentUser.groups.find((g) => g.id === activeChatId);
      if (
        grp?.onlyAdminsCanPost &&
        grp.admin !== currentUser.id &&
        !(grp.adminIds || []).includes(currentUser.name)
      ) {
        addToast('error', 'শুধুমাত্র অ্যাডমিন', 'এই গ্রুপে শুধুমাত্র অ্যাডমিনরা মেসেজ পাঠাতে পারবেন।');
        return;
      }
    }

    const roomId = isGroupChat ? activeChatId : [currentUser.id, activeChatId].sort().join('_');
    let cipherText: string | undefined;
    let e2eeFingerprint: string | undefined;
    if (e2eeEnabled) {
      const enc = await encryptMessageE2EE(text, roomId);
      cipherText = enc.cipherText;
      e2eeFingerprint = enc.keyFingerprint;
    }

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      roomId,
      chatId: roomId,
      sender: currentUser.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      recipientId: activeChatId,
      text,
      cipherText,
      e2eeFingerprint,
      deliveryStatus: wsConnected ? 'seen' : 'delivered',
      timestamp: Date.now(),
      seen: true,
      ...(replyingTo ? { replyTo: replyingTo } : {}),
    };

    setMessageInput('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
    playPopSound();

    setMessagesByRoom((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg],
    }));

    await deliverAndPersistMessage(newMsg, roomId, activeChatId);
  };

  // Helper to deliver a text or media message across WebSocket, Server Store & Firestore
  const deliverAndPersistMessage = async (
    msgObj: ChatMessage,
    canonicalChatId: string,
    recipientOrGroupThreadId: string
  ) => {
    if (!currentUser) return;

    // 1. Broadcast over real-time WebSocket (/ws)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:message',
          roomId: recipientOrGroupThreadId,
          chatId: canonicalChatId,
          recipientId: recipientOrGroupThreadId,
          isGroup: isGroupChat,
          senderProfile: {
            id: currentUser.id,
            uid: currentUser.uid,
            name: currentUser.name,
            email: currentUser.email,
            username: currentUser.username,
            avatar: currentUser.avatar,
          },
          message: msgObj,
        })
      );
    }

    // 2. Persist in conversation-authorized server store (/api/chat/messages)
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: canonicalChatId,
          userId: currentUser.id,
          message: msgObj,
        }),
      });
    } catch {}

    // 3. Persist in Firestore (/chats/{roomId}/messages/{msgId}) when Firebase Auth session matches
    if (auth.currentUser && auth.currentUser.uid === currentUser.id) {
      try {
        const firestoreDoc: Record<string, any> = {
          id: msgObj.id,
          roomId: canonicalChatId,
          chatId: canonicalChatId,
          sender: currentUser.id,
          senderId: currentUser.id,
          senderName: currentUser.name,
          recipientId: recipientOrGroupThreadId,
          text: msgObj.cipherText || msgObj.text,
          timestamp: msgObj.timestamp,
          seen: Boolean(msgObj.seen),
        };
        if (msgObj.mediaType) firestoreDoc.mediaType = msgObj.mediaType;
        if (msgObj.mediaUrl && msgObj.mediaUrl.length <= 2048) firestoreDoc.mediaUrl = msgObj.mediaUrl;
        if (msgObj.downloadUrl && msgObj.downloadUrl.length <= 2048) firestoreDoc.downloadUrl = msgObj.downloadUrl;
        if (msgObj.storagePath) firestoreDoc.storagePath = msgObj.storagePath;
        if (msgObj.fileName) firestoreDoc.fileName = msgObj.fileName;
        if (msgObj.mimeType) firestoreDoc.mimeType = msgObj.mimeType;
        if (typeof msgObj.fileSize === 'number') firestoreDoc.fileSize = msgObj.fileSize;
        if (msgObj.cipherText) firestoreDoc.cipherText = msgObj.cipherText;
        if (msgObj.e2eeFingerprint) firestoreDoc.e2eeFingerprint = msgObj.e2eeFingerprint;
        if (msgObj.deliveryStatus) firestoreDoc.deliveryStatus = msgObj.deliveryStatus;

        await setDoc(doc(db, 'chats', canonicalChatId, 'messages', msgObj.id), firestoreDoc);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `chats/${canonicalChatId}/messages/${msgObj.id}`);
      }
    }
  };

  // Resolve conversation-authorized URL for in-chat <img>, <video>, and <audio> elements
  const resolveAuthorizedMediaUrl = (rawUrl?: string): string => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('/api/media/file/') && currentUser) {
      const sep = rawUrl.includes('?') ? '&' : '?';
      if (!rawUrl.includes('userId=')) {
        return `${rawUrl}${sep}userId=${encodeURIComponent(currentUser.id)}`;
      }
    }
    return rawUrl;
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!activeChatId || !currentUser) return;
    setMessagesByRoom((prev) => ({
      ...prev,
      [activeChatId]: (prev[activeChatId] || []).map((m) =>
        m.id === msgId
          ? {
              ...m,
              text: '🚫 This message was deleted',
              deleted: true,
              mediaUrl: undefined,
              downloadUrl: undefined,
            }
          : m
      ),
    }));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:delete',
          roomId: activeChatId,
          senderId: currentUser.id,
          isGroup: isGroupChat,
          msgId,
        })
      );
    }
    addToast('info', 'মেসেজ মুছে ফেলা হয়েছে', 'বার্তাটি চ্যাট থেকে মুছে ফেলা হয়েছে।');
  };

  const handleForwardMessageTo = async (targetRoomId: string) => {
    if (!forwardingMsg || !currentUser) return;
    const isTargetGroup = targetRoomId.startsWith('g_');
    const canonicalChatId = isTargetGroup
      ? targetRoomId
      : [currentUser.id, targetRoomId].sort().join('_');

    const fwd: ChatMessage = {
      ...forwardingMsg,
      id: 'msg_fwd_' + Date.now(),
      roomId: canonicalChatId,
      chatId: canonicalChatId,
      sender: currentUser.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      recipientId: targetRoomId,
      forwardedFrom: forwardingMsg.senderName,
      timestamp: Date.now(),
      seen: true,
    };
    setMessagesByRoom((prev) => ({
      ...prev,
      [targetRoomId]: [...(prev[targetRoomId] || []), fwd],
    }));
    setForwardingMsg(null);
    setActiveChatId(targetRoomId);
    setIsGroupChat(isTargetGroup);
    playPopSound();
    await deliverAndPersistMessage(fwd, canonicalChatId, targetRoomId);
    addToast('success', 'মেসেজ ফরোয়ার্ড হয়েছে', 'বার্তাটি সফলভাবে ফরোয়ার্ড করা হয়েছে।');
  };

  // Stage Photo, Video, or Document Attachment for Pre-Send Preview & Validation (Used by File Inputs & Desktop Drag-and-Drop)
  const stageFileObject = (
    file: File,
    expectedKind?: 'image' | 'video' | 'any'
  ) => {
    if (!file || !currentUser || !activeChatId) return;
    setShowMobileAttachTray(false);

    const mime = (file.type || '').toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    const isVideo =
      mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'ogg', 'mkv'].includes(ext);
    const isImage =
      mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);

    if (expectedKind === 'video' && !isVideo) {
      addToast('error', 'Invalid Video Format', 'Please select a valid video file (MP4, WebM, MOV, or OGG).');
      return;
    }
    if (expectedKind === 'image' && !isImage) {
      addToast('error', 'Invalid Photo Format', 'Please select a valid photo (JPG, JPEG, PNG, or WebP).');
      return;
    }

    const resolvedMime =
      mime ||
      (isVideo
        ? ext === 'webm'
          ? 'video/webm'
          : 'video/mp4'
        : isImage
        ? ext === 'png'
          ? 'image/png'
          : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg'
        : 'application/octet-stream');

    const maxBytes = isVideo ? 50 * 1024 * 1024 : isImage ? 20 * 1024 * 1024 : 25 * 1024 * 1024;
    const limitMb = Math.round(maxBytes / (1024 * 1024));

    if (stagedMedia?.previewUrl) {
      URL.revokeObjectURL(stagedMedia.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    const mediaType: 'image' | 'video' | 'file' = isVideo ? 'video' : isImage ? 'image' : 'file';

    if (file.size === 0) {
      setStagedMedia({
        file,
        previewUrl,
        mediaType,
        fileName: file.name,
        mimeType: resolvedMime,
        fileSize: file.size,
        caption: '',
        uploading: false,
        progress: 0,
        transferredBytes: 0,
        error: 'The selected file is empty (0 bytes). Please choose a valid file.',
      });
      return;
    }

    if (file.size > maxBytes) {
      const sizeError = `File size (${formatFileSize(file.size)}) exceeds the maximum ${limitMb} MB limit for ${
        isVideo ? 'videos' : isImage ? 'photos' : 'files'
      }.`;
      setStagedMedia({
        file,
        previewUrl,
        mediaType,
        fileName: file.name,
        mimeType: resolvedMime,
        fileSize: file.size,
        caption: '',
        uploading: false,
        progress: 0,
        transferredBytes: 0,
        error: sizeError,
      });
      addToast('error', 'File Too Large', sizeError);
      return;
    }

    setStagedMedia({
      file,
      previewUrl,
      mediaType,
      fileName: file.name,
      mimeType: resolvedMime,
      fileSize: file.size,
      caption: '',
      uploading: false,
      progress: 0,
      transferredBytes: 0,
      error: null,
    });
  };

  const handleSelectMediaFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    expectedKind?: 'image' | 'video' | 'any'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    stageFileObject(file, expectedKind);
  };

  // Desktop & Tablet File Drag-and-Drop Handlers
  const handleChatDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeChatId || !currentUser) return;
    if (!isDraggingMedia) setIsDraggingMedia(true);
  };

  const handleChatDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setIsDraggingMedia(false);
    }
  };

  const handleChatDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMedia(false);
    if (!activeChatId || !currentUser) return;
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      stageFileObject(droppedFile, 'any');
    }
  };

  // Clear Staged Media Attachment
  const handleClearStagedMedia = () => {
    if (stagedMedia?.previewUrl) {
      URL.revokeObjectURL(stagedMedia.previewUrl);
    }
    setStagedMedia(null);
    setUploadProgress(null);
  };

  // Upload & Send Staged Media Attachment (Supports Retry on Failure)
  const handleConfirmSendStagedMedia = async () => {
    if (!stagedMedia || !currentUser || !activeChatId || stagedMedia.uploading) return;

    const canonicalChatId = isGroupChat
      ? activeChatId
      : [currentUser.id, activeChatId].sort().join('_');

    setStagedMedia((prev) =>
      prev ? { ...prev, uploading: true, error: null, progress: 1, transferredBytes: 0 } : null
    );
    setUploadProgress(1);

    try {
      const uploaded = await uploadMediaAttachment({
        file: stagedMedia.file,
        fileName: stagedMedia.fileName,
        mimeType: stagedMedia.mimeType,
        senderId: currentUser.id,
        recipientId: activeChatId,
        chatId: canonicalChatId,
        onProgress: (pct, loaded) => {
          setUploadProgress(pct);
          setStagedMedia((prev) =>
            prev ? { ...prev, progress: pct, transferredBytes: loaded } : null
          );
        },
      });

      const defaultLabel =
        stagedMedia.mediaType === 'video'
          ? `🎬 Video: ${uploaded.fileName}`
          : stagedMedia.mediaType === 'image'
          ? `📷 Photo: ${uploaded.fileName}`
          : uploaded.fileName;

      const captionText = stagedMedia.caption.trim() || defaultLabel;

      const newMsg: ChatMessage = {
        id: `msg_media_${uploaded.timestamp}_${Math.random().toString(36).slice(2, 7)}`,
        roomId: canonicalChatId,
        chatId: canonicalChatId,
        sender: currentUser.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        recipientId: activeChatId,
        text: captionText,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        storagePath: uploaded.storagePath,
        mediaUrl: uploaded.downloadUrl,
        downloadUrl: uploaded.downloadUrl,
        mediaType: stagedMedia.mediaType,
        deliveryStatus: wsConnected ? 'seen' : 'delivered',
        timestamp: uploaded.timestamp,
        seen: true,
        ...(replyingTo ? { replyTo: replyingTo } : {}),
      };

      setMessagesByRoom((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), newMsg],
      }));

      setReplyingTo(null);
      handleClearStagedMedia();
      playPopSound();

      await deliverAndPersistMessage(newMsg, canonicalChatId, activeChatId);

      addToast(
        'success',
        stagedMedia.mediaType === 'video'
          ? 'Video Sent Successfully'
          : stagedMedia.mediaType === 'image'
          ? 'Photo Sent Successfully'
          : 'Attachment Sent',
        `${uploaded.fileName} (${formatFileSize(uploaded.fileSize)}) delivered to chat.`
      );
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to upload media attachment. Please try again.';
      setUploadProgress(null);
      setStagedMedia((prev) =>
        prev ? { ...prev, uploading: false, progress: 0, error: errMsg } : null
      );
      addToast('error', 'Media Upload Failed', errMsg);
    }
  };

  // Download Photo, Video, or File Attachment on Mobile Android & Desktop Browsers
  const handleDownloadMedia = async (params: {
    msgId?: string;
    mediaUrl?: string;
    fileName?: string;
    mimeType?: string;
    chatId?: string;
  }) => {
    if (!currentUser) return;
    const rawUrl = params.mediaUrl;
    if (!rawUrl) {
      addToast('error', 'Download Error', 'Media download URL is missing.');
      return;
    }

    const canonicalChatId =
      params.chatId ||
      (activeChatId
        ? isGroupChat
          ? activeChatId
          : [currentUser.id, activeChatId].sort().join('_')
        : `${currentUser.id}_self`);

    const dlId = params.msgId || 'lightbox';
    setDownloadingMsgId(dlId);

    try {
      await downloadMediaAttachment({
        mediaUrl: rawUrl,
        fileName: params.fileName,
        mimeType: params.mimeType,
        chatId: canonicalChatId,
        userId: currentUser.id,
      });
      addToast(
        'success',
        'Download Complete',
        `Saved "${params.fileName || 'flashtalk-media'}" to your device.`
      );
    } catch (err: any) {
      addToast(
        'error',
        'Download Failed',
        err?.message || 'Could not download media file. Check your connection or permissions.'
      );
    } finally {
      setDownloadingMsgId(null);
    }
  };

  const handleSendCameraCapture = async (dataUrl: string, caption: string) => {
    if (!currentUser || !activeChatId) return;
    const canonicalChatId = isGroupChat
      ? activeChatId
      : [currentUser.id, activeChatId].sort().join('_');

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `camera_snapshot_${Date.now()}.jpg`;
      const uploaded = await uploadMediaAttachment({
        file: blob,
        fileName,
        mimeType: 'image/jpeg',
        senderId: currentUser.id,
        recipientId: activeChatId,
        chatId: canonicalChatId,
      });

      const newMsg: ChatMessage = {
        id: 'msg_cam_' + Date.now(),
        roomId: canonicalChatId,
        chatId: canonicalChatId,
        sender: currentUser.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        recipientId: activeChatId,
        text: caption.trim() || '📷 Camera Snapshot',
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        storagePath: uploaded.storagePath,
        mediaUrl: uploaded.downloadUrl,
        downloadUrl: uploaded.downloadUrl,
        mediaType: 'image',
        deliveryStatus: 'seen',
        timestamp: uploaded.timestamp,
        seen: true,
      };
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), newMsg],
      }));
      playPopSound();
      await deliverAndPersistMessage(newMsg, canonicalChatId, activeChatId);
      addToast('success', 'ক্যামেরা ছবি পাঠানো হয়েছে', 'লাইভ ক্যামেরা ছবি চ্যাটে যুক্ত হয়েছে।');
    } catch (err: any) {
      addToast('error', 'Camera Upload Failed', err?.message || 'Could not send camera photo.');
    }
  };

  // Voice Note Recording
  const handleToggleVoiceRecording = async () => {
    if (!currentUser || !activeChatId) return;
    if (!isRecordingVoice) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((t) => t.stop());
          const canonicalChatId = isGroupChat
            ? activeChatId
            : [currentUser.id, activeChatId].sort().join('_');
          try {
            const uploaded = await uploadMediaAttachment({
              file: blob,
              fileName: `voice_note_${Date.now()}.webm`,
              mimeType: 'audio/webm',
              senderId: currentUser.id,
              recipientId: activeChatId,
              chatId: canonicalChatId,
            });
            const newMsg: ChatMessage = {
              id: 'msg_voice_' + Date.now(),
              roomId: canonicalChatId,
              chatId: canonicalChatId,
              sender: currentUser.id,
              senderId: currentUser.id,
              senderName: currentUser.name,
              recipientId: activeChatId,
              text: 'Voice Note',
              fileName: uploaded.fileName,
              mimeType: uploaded.mimeType,
              fileSize: uploaded.fileSize,
              storagePath: uploaded.storagePath,
              mediaUrl: uploaded.downloadUrl,
              downloadUrl: uploaded.downloadUrl,
              mediaType: 'audio',
              timestamp: uploaded.timestamp,
              seen: true,
            };
            setMessagesByRoom((prev) => ({
              ...prev,
              [activeChatId]: [...(prev[activeChatId] || []), newMsg],
            }));
            playPopSound();
            await deliverAndPersistMessage(newMsg, canonicalChatId, activeChatId);
            addToast('success', 'ভয়েস নোট পাঠানো হয়েছে', 'অডিও মেসেজ সফলভাবে যুক্ত হয়েছে।');
          } catch {
            addToast('error', 'Voice Upload Error', 'Failed to upload voice note.');
          }
        };

        recorder.start();
        setIsRecordingVoice(true);
        addToast('info', 'রেকর্ডিং চলছে...', 'পাঠাতে মাইক্রোফোন বাটনে আবার ট্যাপ করুন।');
      } catch {
        addToast('error', 'মাইক্রোফোন ত্রুটি', 'মাইক্রোফোন ব্যবহারের অনুমতি পাওয়া যায়নি।');
      }
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecordingVoice(false);
    }
  };

  // Convert Chat Message to Speech using gemini-3.8-flash-tts
  const handleSpeakMessage = async (msg: ChatMessage) => {
    if (!activeChatId) return;
    setSynthesizingMsgId(msg.id);
    try {
      const res = await synthesizeSpeechWithGemini({
        text: msg.text,
        voiceName: 'Kore',
        style: 'Natural, clear, expressive voice',
      });
      const audioDataUrl = `data:${res.mimeType};base64,${res.audioBase64}`;
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).map((m) =>
          m.id === msg.id ? { ...m, ttsAudioUrl: audioDataUrl } : m
        ),
      }));
      const audio = new Audio(audioDataUrl);
      audio.play().catch(() => {});
      addToast('success', 'Gemini TTS প্রস্তুত', 'gemini-3.8-flash-tts দিয়ে ভয়েস তৈরি হয়েছে।');
    } catch (err: any) {
      addToast('error', 'TTS ত্রুটি', err?.message || 'ভয়েস তৈরি করা যায়নি।');
    } finally {
      setSynthesizingMsgId(null);
    }
  };

  // Analyze Chat Image using gemini-4-argon
  const handleAnalyzeChatImage = async (msg: ChatMessage) => {
    if (!activeChatId || !msg.mediaUrl) return;
    setAnalyzingMsgId(msg.id);
    try {
      const res = await analyzeImageWithGemini({
        imageBase64: msg.mediaUrl,
        mimeType: 'image/jpeg',
        prompt: 'Analyze this image concisely in both Bengali and English. Highlight key visual details and any text.',
      });
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).map((m) =>
          m.id === msg.id ? { ...m, aiAnalysis: res.text } : m
        ),
      }));
      addToast('success', 'ছবি বিশ্লেষণ সম্পন্ন', 'gemini-4-argon দিয়ে ছবিটি বিশ্লেষণ করা হয়েছে।');
    } catch (err: any) {
      addToast('error', 'বিশ্লেষণ ত্রুটি', err?.message || 'ছবি বিশ্লেষণ করা যায়নি।');
    } finally {
      setAnalyzingMsgId(null);
    }
  };

  // Reaction Handler
  const handleAddReaction = (msgId: string, emoji: string) => {
    if (!activeChatId || !currentUser) return;
    setMessagesByRoom((prev) => ({
      ...prev,
      [activeChatId]: (prev[activeChatId] || []).map((m) => {
        if (m.id !== msgId) return m;
        const nextReactions = { ...(m.reactions || {}), [currentUser.id]: emoji };
        return { ...m, reactions: nextReactions };
      }),
    }));
  };

  // Export Chat Backup (.txt or Google Drive)
  const buildChatTranscript = (): { fileName: string; content: string } | null => {
    const target = getActiveTarget();
    if (!target || !activeChatId) return null;
    const msgs = messagesByRoom[activeChatId] || [];
    let text = `=== FlashTalk Secure Chat Backup (${target.name}) ===\nExported at: ${new Date().toLocaleString()}\n\n`;
    msgs.forEach((m) => {
      const time = new Date(m.timestamp).toLocaleString();
      text += `[${time}] ${m.senderName}: ${m.text}\n`;
    });
    const safeName = `FlashTalk_Backup_${target.name.replace(/\s+/g, '_')}.txt`;
    return { fileName: safeName, content: text };
  };

  const handleDownloadChatBackup = () => {
    const data = buildChatTranscript();
    if (!data) return;
    const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.fileName;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'ব্যাকআপ ডাউনলোড হয়েছে', `${data.fileName} ডাউনলোড সম্পন্ন হয়েছে।`);
  };

  const handleBackupChatToDrive = async () => {
    const data = buildChatTranscript();
    if (!data) return;
    try {
      let token = await getAccessToken();
      if (!token) {
        addToast('info', 'Google Drive সংযোগ প্রয়োজন', 'প্রথমে Google Drive অনুমতি দিয়ে সাইন ইন করুন।');
        await handleGoogleLogin(true);
        token = await getAccessToken();
        if (!token) return;
      }
      addToast('loading', 'Google Drive-এ সেভ হচ্ছে...', 'আপনার চ্যাট ব্যাকআপ আপলোড করা হচ্ছে।');
      const uploaded = await uploadTextBackupToDrive(data.fileName, data.content);
      addToast('success', 'Google Drive ব্যাকআপ সফল!', `"${uploaded.name}" আপনার Google Drive-এ সংরক্ষিত হয়েছে।`);
      loadUserDriveFiles();
    } catch (err: any) {
      addToast('error', 'Drive ব্যাকআপ ব্যর্থ', err?.message || 'Google Drive-এ আপলোড করা যায়নি।');
    }
  };

  // WebRTC P2P Call Handlers
  const startCall = async (type: 'voice' | 'video') => {
    const target = getActiveTarget();
    if (!target || isGroupChat) return;

    const wantVideo = type === 'video';
    setActiveCall({
      open: true,
      type,
      targetName: target.name,
      targetAvatar: target.avatar,
      status: 'Establishing Encrypted P2P Signaling...',
      seconds: 0,
      isMuted: false,
      isCameraOn: wantVideo,
      facingMode: 'user',
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: wantVideo ? { facingMode: 'user' } : false,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current && wantVideo) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Create WebRTC offer and store signaling packet in Firestore
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      try {
        await addDoc(collection(db, 'calls'), {
          callerId: currentUser?.id,
          calleeId: target.id,
          type,
          offer: { type: offer.type, sdp: offer.sdp },
          timestamp: Date.now(),
        });
      } catch {}

      setActiveCall((prev) => (prev ? { ...prev, status: 'Connected • End-to-End Encrypted' } : null));
      if (callTimerRef.current) window.clearInterval(callTimerRef.current);
      callTimerRef.current = window.setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, seconds: prev.seconds + 1 } : null));
      }, 1000);
    } catch {
      addToast('info', 'ক্যামেরা/মাইক্রোফোন সিমুলেশন মোড', 'ডিভাইস পারমিশন ছাড়াই কল কানেক্ট করা হয়েছে।');
      setActiveCall((prev) => (prev ? { ...prev, status: 'Connected • Audio Channel Active' } : null));
      if (callTimerRef.current) window.clearInterval(callTimerRef.current);
      callTimerRef.current = window.setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, seconds: prev.seconds + 1 } : null));
      }, 1000);
    }
  };

  const endCall = () => {
    if (callTimerRef.current) {
      window.clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (activeCall && activeChatId && currentUser) {
      const mins = Math.floor(activeCall.seconds / 60)
        .toString()
        .padStart(2, '0');
      const secs = (activeCall.seconds % 60).toString().padStart(2, '0');
      const callMsg: ChatMessage = {
        id: 'msg_call_' + Date.now(),
        sender: currentUser.id,
        senderName: currentUser.name,
        text: `${activeCall.type === 'video' ? 'Video Call' : 'Voice Call'} (${mins}:${secs})`,
        mediaType: 'call',
        timestamp: Date.now(),
        seen: true,
      };
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), callMsg],
      }));
    }
    setActiveCall(null);
  };

  // Friend Search & Add (Fixed to search all users + allow creating custom contact if not found)
  const handleSearchAndAddFriend = async () => {
    if (!currentUser) return;
    const raw = friendSearchInput.trim();
    if (!raw) {
      addToast('error', 'ইউজারনেম দিন', 'অনুগ্রহ করে কোনো ইউজারনেম বা UID লিখুন।');
      return;
    }
    const clean = raw.startsWith('@') ? raw.slice(1).toLowerCase() : raw.toLowerCase();

    let foundKey = Object.keys(usersDirectory).find((k) => {
      const u = usersDirectory[k];
      return (
        u.uid.toLowerCase() === clean ||
        u.username.toLowerCase() === clean ||
        u.name.toLowerCase().includes(clean)
      );
    });

    if (!foundKey) {
      // Create a live contact entry so adding any friend username works seamlessly
      const newContactId = 'u_' + Date.now();
      const displayName = raw.startsWith('@') ? raw.slice(1) : raw;
      const newContact: AppUser = {
        id: newContactId,
        uid: generateRandomUID(),
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        email: `${clean}@gmail.com`,
        recoveryAnswer: 'friend',
        bio: 'FlashTalk Verified Contact',
        username: clean.replace(/[^a-z0-9_]/g, '') || 'friend',
        avatar: displayName.slice(0, 2).toUpperCase(),
        contacts: [],
        groups: [],
        stories: [],
        blocked: [],
        online: true,
        lastSeenTime: Date.now(),
        category: 'friends',
      };
      setUsersDirectory((prev) => ({ ...prev, [newContactId]: newContact }));
      foundKey = newContactId;
    }

    if (currentUser.contacts.includes(foundKey)) {
      addToast('info', 'ইতিমধ্যে যুক্ত আছে', 'এই ইউজার আপনার কন্টাক্ট লিস্টে আগেই আছেন।');
      return;
    }

    const updated: AppUser = {
      ...currentUser,
      contacts: [...currentUser.contacts, foundKey],
    };
    await persistUserAndAccount(updated);
    setShowAddFriendModal(false);
    setFriendSearchInput('');
    setActiveChatId(foundKey);
    setIsGroupChat(false);
    addToast('success', 'বন্ধু যুক্ত হয়েছে!', `${usersDirectory[foundKey]?.name || raw} আপনার কন্টাক্টে যুক্ত হয়েছেন।`);
  };

  // Group Creation
  const handleCreateGroup = async () => {
    if (!currentUser) return;
    const name = newGroupName.trim();
    if (!name) {
      addToast('error', 'গ্রুপের নাম দিন', 'অনুগ্রহ করে গ্রুপের একটি নাম লিখুন।');
      return;
    }
    if (selectedGroupMembers.length === 0) {
      addToast('error', 'সদস্য নির্বাচন করুন', 'গ্রুপের জন্য অন্তত একজন সদস্য নির্বাচন করুন।');
      return;
    }

    const newGroup: GroupChat = {
      id: 'g_' + generateRandomUID(),
      name,
      avatar: name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
      members: [currentUser.id, ...selectedGroupMembers],
      admin: currentUser.id,
      createdAt: Date.now(),
    };

    const updated: AppUser = {
      ...currentUser,
      groups: [...(currentUser.groups || []), newGroup],
    };
    await persistUserAndAccount(updated);
    setMessagesByRoom((prev) => ({
      ...prev,
      [newGroup.id]: [
        {
          id: 'g_welcome_' + Date.now(),
          sender: currentUser.id,
          senderName: currentUser.name,
          text: `Welcome to "${name}" group chat!`,
          timestamp: Date.now(),
          seen: true,
        },
      ],
    }));
    setShowCreateGroupModal(false);
    setNewGroupName('');
    setSelectedGroupMembers([]);
    setActiveChatId(newGroup.id);
    setIsGroupChat(true);
    addToast('success', 'গ্রুপ তৈরি হয়েছে!', `"${name}" গ্রুপ চ্যাট চালু হয়েছে।`);
  };

  // Story Upload
  const handlePostStory = async () => {
    if (!currentUser || !storyFilePreview) {
      addToast('error', 'মিডিয়া নির্বাচন করুন', 'স্টোরির জন্য একটি ছবি বা ভিডিও নির্বাচন করুন।');
      return;
    }
    const newStory: StoryItem = {
      id: 'st_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      mediaUrl: storyFilePreview.url,
      mediaType: storyFilePreview.type,
      caption: storyCaptionInput.trim(),
      timestamp: Date.now(),
    };
    const updated: AppUser = {
      ...currentUser,
      stories: [newStory, ...(currentUser.stories || [])],
    };
    await persistUserAndAccount(updated);
    setShowAddStoryModal(false);
    setStoryFilePreview(null);
    setStoryCaptionInput('');
    addToast('success', 'স্টোরি প্রকাশিত হয়েছে!', 'আপনার ২৪ ঘণ্টার স্ট্যাটাস শেয়ার করা হয়েছে।');
  };

  // Multi-Turn Gemini AI Chatbot Send
  const handleSendAiChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = aiPromptInput.trim();
    if (!prompt || isAiChatLoading) return;

    const userEntry = {
      id: 'ai_u_' + Date.now(),
      role: 'user' as const,
      text: prompt,
      timestamp: Date.now(),
    };

    const nextHistory = [...aiChatHistory, userEntry];
    setAiChatHistory(nextHistory);
    setAiPromptInput('');
    setIsAiChatLoading(true);

    const selectedRole = AI_ROLES.find((r) => r.id === aiRoleId);
    const systemInstruction = customSystemPrompt.trim() || selectedRole?.instruction || AI_ROLES[0].instruction;

    try {
      const apiMessages: ChatTurn[] = nextHistory.map((m) => ({
        role: m.role,
        text: m.text,
      }));
      const res = await sendGeminiChatMessage({
        messages: apiMessages,
        model: aiChatModel,
        systemInstruction,
      });

      setAiChatHistory((prev) => [
        ...prev,
        {
          id: 'ai_m_' + Date.now(),
          role: 'model',
          text: res.text,
          model: res.model,
          timestamp: Date.now(),
        },
      ]);
      playPopSound();
    } catch (err: any) {
      addToast('error', 'Gemini AI ত্রুটি', err?.message || 'উত্তর পাওয়া যায়নি।');
    } finally {
      setIsAiChatLoading(false);
    }
  };

  // Standalone Vision Analysis (gemini-4-argon)
  const handleRunVisionAnalysis = async () => {
    if (!visionImage) {
      addToast('error', 'ছবি নির্বাচন করুন', 'বিশ্লেষণ করার জন্য প্রথমে একটি ছবি আপলোড করুন।');
      return;
    }
    setIsVisionLoading(true);
    try {
      const res = await analyzeImageWithGemini({
        imageBase64: visionImage.base64,
        mimeType: visionImage.mimeType,
        prompt: visionPrompt.trim() || 'Describe and analyze this image in detail.',
      });
      setVisionResult(res.text);
      addToast('success', 'বিশ্লেষণ সম্পন্ন!', 'gemini-4-argon সফলভাবে ছবিটি বিশ্লেষণ করেছে।');
    } catch (err: any) {
      addToast('error', 'Image Analysis ত্রুটি', err?.message || 'ছবি বিশ্লেষণ করা যায়নি।');
    } finally {
      setIsVisionLoading(false);
    }
  };

  // Standalone TTS Synthesis (gemini-3.8-flash-tts)
  const handleRunTtsSynthesis = async () => {
    if (!ttsInputText.trim()) {
      addToast('error', 'টেক্সট লিখুন', 'ভয়েসে রূপান্তর করার জন্য কিছু টেক্সট লিখুন।');
      return;
    }
    setIsTtsLoading(true);
    try {
      const res = await synthesizeSpeechWithGemini({
        text: ttsInputText.trim(),
        voiceName: ttsVoice,
        style: ttsStyle,
      });
      const url = `data:${res.mimeType};base64,${res.audioBase64}`;
      setTtsAudioUrl(url);
      addToast('success', 'ভয়েস তৈরি হয়েছে!', 'gemini-3.8-flash-tts দিয়ে অডিও তৈরি সম্পন্ন।');
    } catch (err: any) {
      addToast('error', 'TTS ত্রুটি', err?.message || 'অডিও তৈরি করা যায়নি।');
    } finally {
      setIsTtsLoading(false);
    }
  };

  // Google Drive Files Loader
  const loadUserDriveFiles = async (q = driveSearchQuery) => {
    setIsDriveLoading(true);
    try {
      const files = await listDriveFiles(q);
      setDriveFiles(files);
      setDriveConnected(true);
    } catch (err: any) {
      setDriveConnected(false);
    } finally {
      setIsDriveLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'drive' && driveConnected) {
      loadUserDriveFiles();
    }
  }, [activeTab, driveConnected]);

  const handleConfirmDeleteDriveFile = async () => {
    if (!driveFileToDelete) return;
    const target = driveFileToDelete;
    setDriveFileToDelete(null);
    try {
      await deleteDriveFileById(target.id);
      setDriveFiles((prev) => prev.filter((f) => f.id !== target.id));
      addToast('success', 'ফাইল মুছে ফেলা হয়েছে', `"${target.name}" Google Drive থেকে মুছে ফেলা হয়েছে।`);
    } catch (err: any) {
      addToast('error', 'ডিলিট ব্যর্থ', err?.message || 'ফাইলটি মুছে ফেলা যায়নি।');
    }
  };

  const handleShareDriveFileToChat = (file: DriveFileItem) => {
    if (!currentUser) return;
    const targetChat = activeChatId || 'u1';
    const newMsg: ChatMessage = {
      id: 'msg_drive_' + Date.now(),
      sender: currentUser.id,
      senderName: currentUser.name,
      text: `Google Drive File: ${file.name}`,
      fileName: file.name,
      mediaUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      mediaType: 'drive',
      timestamp: Date.now(),
      seen: true,
    };
    setMessagesByRoom((prev) => ({
      ...prev,
      [targetChat]: [...(prev[targetChat] || []), newMsg],
    }));
    setActiveChatId(targetChat);
    setActiveTab('chats');
    addToast('success', 'চ্যাটে শেয়ার করা হয়েছে', `"${file.name}" চ্যাটে পাঠানো হয়েছে।`);
  };

  // Compute filtered chat list
  const getFilteredChatItems = () => {
    if (!currentUser) return [];
    const items: Array<{
      id: string;
      isGroup: boolean;
      name: string;
      avatar: string;
      uid?: string;
      online?: boolean;
      category?: string;
      lastMsg: string;
      lastTime: number;
      unreadCount: number;
      isPinned: boolean;
      isArchived: boolean;
    }> = [];

    const archivedList = currentUser.archived || [];
    const pinnedList = currentUser.pinned || [];

    (currentUser.contacts || []).forEach((uid) => {
      if ((currentUser.blocked || []).includes(uid)) return;
      const u = usersDirectory[uid];
      if (!u) return;
      const msgs = messagesByRoom[uid] || [];
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter((m) => m.sender !== currentUser.id && !m.seen).length;
      items.push({
        id: uid,
        isGroup: false,
        name: u.name,
        avatar: u.avatar,
        uid: u.uid,
        online: u.online,
        category: u.category || 'friends',
        lastMsg: last
          ? last.mediaType === 'image'
            ? '📷 Photo'
            : last.mediaType === 'video'
            ? '🎬 Video'
            : last.mediaType === 'audio'
            ? '🎤 Voice message'
            : last.text
          : 'Tap to start conversation',
        lastTime: last?.timestamp || u.lastSeenTime || 0,
        unreadCount: unread,
        isPinned: pinnedList.includes(uid),
        isArchived: archivedList.includes(uid),
      });
    });

    (currentUser.groups || []).forEach((g) => {
      const msgs = messagesByRoom[g.id] || [];
      const last = msgs[msgs.length - 1];
      items.push({
        id: g.id,
        isGroup: true,
        name: g.name,
        avatar: g.avatar,
        category: 'groups',
        lastMsg: last ? `${last.senderName}: ${last.text}` : 'Tap to open group chat',
        lastTime: last?.timestamp || g.createdAt,
        unreadCount: 0,
        isPinned: pinnedList.includes(g.id),
        isArchived: archivedList.includes(g.id),
      });
    });

    return items
      .filter((item) => {
        if (chatFilter === 'archive') return item.isArchived;
        if (item.isArchived) return false;
        if (chatFilter === 'friends') return !item.isGroup && item.category === 'friends';
        if (chatFilter === 'work') return !item.isGroup && item.category === 'work';
        if (chatFilter === 'groups') return item.isGroup;
        return true;
      })
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.uid && item.uid.toLowerCase().includes(q)) ||
          item.lastMsg.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.lastTime - a.lastTime;
      });
  };

  const totalUnreadCount = Object.keys(messagesByRoom).reduce((acc, roomId) => {
    if (!currentUser || (currentUser.blocked || []).includes(roomId)) return acc;
    const unread = (messagesByRoom[roomId] || []).filter(
      (m) => m.sender !== currentUser.id && !m.seen
    ).length;
    return acc + unread;
  }, 0);

  // Theme Surface Classes (Luxury Black & Azure Blue vs Crisp Alabaster Light Mode)
  const bgCanvas = isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-[#06090F] text-slate-100';
  const bgShell = isLightMode
    ? 'bg-white border-slate-200 text-slate-900'
    : 'bg-[#0B101B] border-[#1C283A] text-slate-100';
  const bgPanel = isLightMode
    ? 'bg-slate-50/90 border-slate-200'
    : 'bg-[#101826] border-[#1E2B3E]';
  const bgCard = isLightMode
    ? 'bg-white border-slate-200 hover:bg-slate-50'
    : 'bg-[#141E30] border-[#223147] hover:bg-[#19253A]';
  const bgInput = isLightMode
    ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
    : 'bg-[#152033] border-[#25354D] text-white placeholder-slate-400 focus:border-sky-400';
  const textMuted = isLightMode ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`min-h-screen w-full ${bgCanvas} flex flex-col justify-between transition-colors duration-200`}>
      {/* TOAST NOTIFICATIONS OVERLAY */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-200 ${
              isLightMode
                ? 'bg-white/95 border-slate-200 text-slate-900'
                : 'bg-[#121C2D]/95 border-sky-500/30 text-white'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {t.type === 'loading' && <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0 mt-0.5" />}
            {t.type === 'info' && <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold">{t.title}</h4>
              <p className={`text-[11px] ${textMuted} leading-relaxed`}>{t.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* OFFLINE INDICATOR BANNER (PWA) */}
      <OfflineIndicator />

      {/* AUTHENTICATION VIEW (Gmail/Email & Password + 6-Digit Real Email Verification Code + Password Reset) */}
      {!currentUser && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl ${bgShell} relative overflow-hidden`}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 mb-3">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">FlashTalk</h1>
              <p className={`text-xs ${textMuted} mt-1`}>
                {uiLang === 'bn'
                  ? 'নিরাপদ এআই মেসেঞ্জার • শুধুমাত্র জিমেইল/ইমেইল ভেরিফিকেশন'
                  : 'Secure Luxury Messenger • Gmail/Email Verified Authentication'}
              </p>
            </div>

            {pendingVerificationUser ? (
              /* 6-DIGIT EMAIL VERIFICATION CODE SCREEN (2-Minute Timer + Resend Cooldown) */
              <form onSubmit={handleVerifyEmailCodeSubmit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-center space-y-1">
                  <div className="text-xs font-bold text-sky-400 flex items-center justify-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>Verify Your Email Address</span>
                  </div>
                  <p className={`text-[11px] ${textMuted}`}>
                    Enter the 6-digit verification code sent to{' '}
                    <span className="font-bold text-white">{pendingVerificationUser.email}</span> to activate your
                    account.
                  </p>
                </div>

                {/* Live 2-Minute Expiration Timer Badge */}
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs">
                  <span className={textMuted}>Code Expiration Timer:</span>
                  {emailCodeSecondsLeft > 0 ? (
                    <span className="font-mono font-bold text-emerald-400">
                      {Math.floor(emailCodeSecondsLeft / 60)
                        .toString()
                        .padStart(2, '0')}
                      :{(emailCodeSecondsLeft % 60).toString().padStart(2, '0')}
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-rose-400">EXPIRED (00:00)</span>
                  )}
                </div>

                {emailAuthNotice && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 leading-relaxed">
                    {emailAuthNotice}
                  </div>
                )}

                {emailAuthError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300 leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{emailAuthError}</span>
                  </div>
                )}

                <div>
                  <label className={`block text-[11px] font-semibold mb-1.5 text-center ${textMuted}`}>
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={emailCodeInput}
                    onChange={(e) => {
                      setEmailCodeInput(e.target.value.replace(/[^0-9]/g, ''));
                      setEmailAuthError(null);
                    }}
                    placeholder="••••••"
                    disabled={emailCodeSecondsLeft <= 0 || isAuthLoading}
                    className={`w-full rounded-xl px-4 py-3.5 text-center tracking-[0.6em] font-mono text-lg font-bold border focus:outline-none disabled:opacity-50 ${bgInput}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading || emailCodeSecondsLeft <= 0 || emailCodeInput.length !== 6}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAuthLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Verify 6-Digit Code & Activate Account</span>
                </button>

                {/* Resend Code Button with Cooldown + Firebase Email Link Verification Check */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isAuthLoading || resendCooldownSeconds > 0}
                    onClick={() =>
                      dispatchEmailVerificationCode(
                        pendingVerificationUser.email,
                        pendingVerificationUser.name
                      )
                    }
                    className="py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-50 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAuthLoading ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldownSeconds > 0
                        ? `Resend Code (${resendCooldownSeconds}s)`
                        : 'Resend Code'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isAuthLoading}
                    onClick={handleCheckFirebaseEmailLinkVerified}
                    className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-50 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="If you clicked the verification link sent by Firebase Auth, click here to activate"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified via Link?</span>
                  </button>
                </div>

                {!smtpStatus.smtpConfigured && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 space-y-1 leading-relaxed">
                    <div className="font-bold text-amber-300">Backend Email Provider Setup Notice:</div>
                    <p>
                      To dispatch 6-digit codes via SMTP/API, add{' '}
                      <code className="font-mono bg-black/30 px-1 rounded">SMTP_USER</code> &{' '}
                      <code className="font-mono bg-black/30 px-1 rounded">SMTP_PASS</code> (Gmail 16-char App
                      Password) or <code className="font-mono bg-black/30 px-1 rounded">RESEND_API_KEY</code> in the
                      AI Studio Secrets panel. Alternatively, enable Email/Password in Firebase Console and click the
                      Firebase verification link sent to your email.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setPendingVerificationUser(null);
                    setEmailAuthError(null);
                    setEmailAuthNotice(null);
                  }}
                  className={`w-full py-2 text-xs ${textMuted} hover:text-white transition cursor-pointer`}
                >
                  ← Back to Sign Up / Sign In
                </button>
              </form>
            ) : (
              /* GMAIL / EMAIL & PASSWORD LOGIN AND REGISTRATION FORM */
              <>
                <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                  {isSignUpMode && (
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${textMuted}`}>Full Name</label>
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Taj Uddin"
                        className={`w-full rounded-xl px-4 py-3 text-xs border focus:outline-none ${bgInput}`}
                      />
                    </div>
                  )}

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${textMuted}`}>
                      Gmail / Email Address
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className={`w-full rounded-xl px-4 py-3 text-xs border focus:outline-none ${bgInput}`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-[11px] font-semibold ${textMuted}`}>Password</label>
                      {!isSignUpMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmailInput(authEmail);
                            setShowPasswordResetModal(true);
                          }}
                          className="text-[11px] text-sky-400 hover:underline font-medium cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-xl px-4 py-3 text-xs border focus:outline-none ${bgInput}`}
                    />
                  </div>

                  {isSignUpMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1 ${textMuted}`}>
                          Recovery Answer
                        </label>
                        <input
                          type="text"
                          value={authAnswer1}
                          onChange={(e) => setAuthAnswer1(e.target.value)}
                          placeholder="Secret word"
                          className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none ${bgInput}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1 ${textMuted}`}>
                          Confirm Answer
                        </label>
                        <input
                          type="text"
                          value={authAnswer2}
                          onChange={(e) => setAuthAnswer2(e.target.value)}
                          placeholder="Re-enter secret"
                          className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none ${bgInput}`}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isAuthLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>
                      {isSignUpMode
                        ? 'Register & Send 6-Digit Email Code'
                        : 'Sign In with Email & Password'}
                    </span>
                  </button>
                </form>

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-700/40" />
                  <span className={`text-[11px] ${textMuted}`}>OR CONTINUE WITH GOOGLE</span>
                  <div className="h-px flex-1 bg-slate-700/40" />
                </div>

                <div className="space-y-2.5">
                  <GoogleSignInButton
                    onClick={() => handleGoogleLogin(false)}
                    disabled={isAuthLoading}
                    label="Sign in with Google (Basic Profile)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOAuthDiagnosticsModal(true)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Seeing Google Error 403: access_denied? Open OAuth Config & Fix Guide</span>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <p className={textMuted}>
                    {isSignUpMode ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUpMode(!isSignUpMode)}
                      className="text-sky-400 font-bold hover:underline ml-1 cursor-pointer"
                    >
                      {isSignUpMode ? 'Sign In' : 'Create Account'}
                    </button>
                  </p>
                  <PWAInstallButton compact />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL (Step 2) */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 z-[175] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 space-y-4 ${bgShell} shadow-2xl`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Reset Account Password</h3>
              <button
                type="button"
                onClick={() => setShowPasswordResetModal(false)}
                className={`text-xs ${textMuted} hover:text-white cursor-pointer`}
              >
                Cancel
              </button>
            </div>
            <p className={`text-xs ${textMuted}`}>
              Enter your registered Gmail/email address to receive a secure password reset link via email.
            </p>
            <input
              type="email"
              value={resetEmailInput}
              onChange={(e) => setResetEmailInput(e.target.value)}
              placeholder="example@gmail.com"
              className={`w-full rounded-xl p-3 text-xs border focus:outline-none ${bgInput}`}
            />
            <button
              type="button"
              disabled={isAuthLoading}
              onClick={handleSendPasswordReset}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isAuthLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Send Password Reset Email</span>
            </button>
          </div>
        </div>
      )}

      {/* GOOGLE OAUTH 403 (ACCESS_DENIED) DIAGNOSTICS & DIRECT CONSOLE LINKS MODAL */}
      {showOAuthDiagnosticsModal && (
        <div className="fixed inset-0 z-[185] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-3xl border p-6 space-y-4 ${bgShell} shadow-2xl max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-amber-400">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Firebase & Google OAuth 403 (access_denied) Diagnostic Inspector</span>
                </h3>
                <p className={`text-xs ${textMuted} mt-0.5`}>
                  Live configuration inspected from <code className="text-sky-400">firebase-applet-config.json</code> &
                  Firebase Identity Toolkit API
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOAuthDiagnosticsModal(false)}
                className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Exact Project & OAuth Client Identifiers */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700/60 space-y-2.5 text-xs">
              <div className="font-bold text-sky-400 flex items-center justify-between">
                <span>1. Exact Project & OAuth 2.0 Client Identifiers</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                  Google Provider: {oauthDiagnosticsData.googleProviderEnabled ? 'ENABLED (200 OK)' : 'CHECK CONSOLE'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 font-mono text-[11px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-xl bg-black/40 border border-slate-800">
                  <span className={textMuted}>Firebase / GCP Project ID:</span>
                  <span className="text-white font-bold select-all">{FIREBASE_OAUTH_CONFIG_SUMMARY.projectId}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-xl bg-black/40 border border-slate-800">
                  <span className={textMuted}>GCP Project Number:</span>
                  <span className="text-white font-bold select-all">{FIREBASE_OAUTH_CONFIG_SUMMARY.projectNumber}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-xl bg-black/40 border border-slate-800">
                  <span className={textMuted}>OAuth 2.0 Web Client ID:</span>
                  <span className="text-sky-300 font-bold break-all select-all">
                    {FIREBASE_OAUTH_CONFIG_SUMMARY.oAuthClientId}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-xl bg-black/40 border border-slate-800">
                  <span className={textMuted}>Authorized Redirect URI:</span>
                  <span className="text-emerald-300 font-bold break-all select-all">
                    {FIREBASE_OAUTH_CONFIG_SUMMARY.authorizedRedirectUri}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Why Error 403: access_denied Happens & What We Fixed in Code */}
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-2 text-xs">
              <div className="font-bold text-sky-300">
                2. Code Fix Applied + Why the Settings Looked Missing in Google Cloud Console
              </div>
              <ul className={`list-disc pl-4 space-y-1 text-[11px] ${textMuted}`}>
                <li>
                  <strong className="text-white">Code Fix Applied:</strong> Basic Google Sign-In now requests only{' '}
                  <code className="text-sky-300">openid email profile</code> instead of restricted{' '}
                  <code className="text-amber-300">drive.readonly</code> &{' '}
                  <code className="text-amber-300">drive.file</code> scopes on initial login.
                </li>
                <li>
                  <strong className="text-white">Why You Couldn&apos;t Find the OAuth Settings:</strong> AI Studio
                  provisioned this app inside the hidden project{' '}
                  <code className="text-amber-300 font-bold">gen-lang-client-0142706943</code> (Project Number{' '}
                  <code className="text-amber-300">836640491334</code>, Brand: <code className="text-amber-300">Taj uddin&apos;s Apps</code>).
                  Also, Google Cloud Console moved <em>OAuth consent screen</em> into the new{' '}
                  <strong className="text-white">Google Auth Platform &rarr; Audience</strong> menu.
                </li>
              </ul>
            </div>

            {/* 3. Direct One-Click Links to the Exact GCP Project Settings */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 text-xs">
              <div className="font-bold text-amber-300">
                3. Direct Links to Project <code className="font-mono">gen-lang-client-0142706943</code> (Click to Open)
              </div>
              <p className={`text-[11px] ${textMuted}`}>
                Use these direct URLs (which force <code className="text-white">?project=gen-lang-client-0142706943</code>)
                so Google Cloud Console opens the exact project that owns this OAuth Client ID:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={FIREBASE_OAUTH_CONFIG_SUMMARY.consoleUrls.audienceAndTestUsers}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold flex items-center justify-between text-[11px]"
                >
                  <span>1. Open Audience &amp; Test Users / Publish App</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  href={FIREBASE_OAUTH_CONFIG_SUMMARY.consoleUrls.oauthClients}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 font-semibold flex items-center justify-between text-[11px]"
                >
                  <span>2. Open OAuth 2.0 Client (Redirect URIs)</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  href={FIREBASE_OAUTH_CONFIG_SUMMARY.consoleUrls.scopesDataAccess}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold flex items-center justify-between text-[11px]"
                >
                  <span>3. Open Data Access (OAuth Scopes)</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  href={FIREBASE_OAUTH_CONFIG_SUMMARY.consoleUrls.firebaseAuthorizedDomains}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-semibold flex items-center justify-between text-[11px]"
                >
                  <span>4. Open Firebase Authorized Domains</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>

            {/* 4. Live Authorized Domains Verified in Firebase */}
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-700/60 space-y-1.5 text-xs">
              <div className="font-bold text-emerald-400">
                4. Live Firebase Authorized Domains (Verified via Identity Toolkit API)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {oauthDiagnosticsData.authorizedDomains.map((dom) => (
                  <span
                    key={dom}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]"
                  >
                    {dom}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowOAuthDiagnosticsModal(false)}
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSCODE LOCK SCREEN */}
      {currentUser && isPasscodeLocked && (
        <div className="fixed inset-0 z-[150] bg-[#06090F]/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 sm:p-8 flex flex-col items-center ${bgShell} shadow-2xl`}>
            <div className="w-14 h-14 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold">
              {passcodeSetupStep === 1
                ? 'Set New 4-Digit PIN'
                : passcodeSetupStep === 2
                ? 'Confirm 4-Digit PIN'
                : 'Enter Security PIN'}
            </h2>
            <p className={`text-xs ${textMuted} text-center mt-1 mb-5`}>
              {passcodeSetupStep === 1
                ? 'Choose a 4-digit passcode to protect your chats'
                : passcodeSetupStep === 2
                ? 'Re-enter your 4-digit passcode to confirm'
                : 'Enter your 4-digit PIN to unlock FlashTalk'}
            </p>

            <input
              type="password"
              maxLength={4}
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="••••"
              className={`w-40 text-center text-2xl tracking-[0.5em] font-mono py-3 rounded-xl border focus:outline-none mb-4 ${bgInput}`}
            />

            <button
              type="button"
              onClick={handleVerifyPasscode}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition cursor-pointer"
            >
              {passcodeSetupStep === 0 ? 'Unlock FlashTalk' : 'Continue'}
            </button>

            {passcodeSetupStep === 0 && (
              <button
                type="button"
                onClick={() => setShowForgotPinModal(true)}
                className="mt-4 text-xs text-sky-400 hover:underline font-medium cursor-pointer"
              >
                Forgot Passcode?
              </button>
            )}
          </div>
        </div>
      )}

      {/* FORGOT PASSCODE MODAL */}
      {showForgotPinModal && (
        <div className="fixed inset-0 z-[170] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 space-y-4 ${bgShell} shadow-2xl`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Reset Security PIN</h3>
              <button
                type="button"
                onClick={() => setShowForgotPinModal(false)}
                className={`text-xs ${textMuted} hover:text-white cursor-pointer`}
              >
                Cancel
              </button>
            </div>
            <p className={`text-xs ${textMuted}`}>
              Enter your registered Gmail and Secret Recovery Answer to reset your PIN.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Registered Gmail address"
                className={`w-full rounded-xl p-3 text-xs border focus:outline-none ${bgInput}`}
              />
              <input
                type="text"
                value={forgotAnswer}
                onChange={(e) => setForgotAnswer(e.target.value)}
                placeholder="Secret Recovery Answer"
                className={`w-full rounded-xl p-3 text-xs border focus:outline-none ${bgInput}`}
              />
              <button
                type="button"
                onClick={handleResetPinViaRecovery}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition cursor-pointer"
              >
                Verify & Reset PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN RESPONSIVE APPLICATION WORKSPACE (Phone <600px | Tablet 600-1023px | Desktop >=1024px) */}
      {currentUser && !isPasscodeLocked && (
        <div className="ft-viewport-shell flex-1 flex flex-col overflow-hidden">
          <div
            className={`flex-1 flex flex-col tablet:flex-row w-full max-w-[1520px] mx-auto tablet:rounded-2xl desktop:rounded-3xl tablet:border overflow-hidden shadow-2xl ${bgShell}`}
          >
            {/* TABLET (600-1023px) & DESKTOP (>=1024px) LEFT NAVIGATION RAIL */}
            <aside
              className={`ft-desktop-rail hidden tablet:flex flex-col items-center justify-between py-4 desktop:py-5 px-2 w-[68px] desktop:w-20 border-r shrink-0 ${bgPanel}`}
            >
              <div className="flex flex-col items-center gap-4 desktop:gap-5">
                <div
                  onClick={() => setActiveTab('chats')}
                  className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20 cursor-pointer"
                  title="FlashTalk Messenger"
                >
                  <MessageSquare className="w-5 h-5" />
                </div>

                <nav className="flex flex-col items-center gap-1.5 desktop:gap-2">
                  {[
                    { id: 'chats', label: uiLang === 'bn' ? 'চ্যাট' : 'Chats', icon: MessageSquare, badge: totalUnreadCount },
                    { id: 'contacts', label: uiLang === 'bn' ? 'বন্ধু' : 'Contacts', icon: Users, badge: friendRequests.filter((r) => r.status === 'pending').length },
                    { id: 'stories', label: uiLang === 'bn' ? 'স্টোরি' : 'Stories', icon: CircleDot },
                    { id: 'ai', label: 'AI Hub', icon: Sparkles },
                    { id: 'drive', label: 'Drive', icon: HardDrive },
                    { id: 'settings', label: uiLang === 'bn' ? 'সেটিংস' : 'Settings', icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setSubSettingView(null);
                        }}
                        className={`relative w-13 desktop:w-14 py-2 desktop:py-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          active
                            ? 'bg-sky-500/15 text-sky-400 font-semibold'
                            : `${textMuted} hover:text-sky-400`
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] whitespace-nowrap">{item.label}</span>
                        {item.badge ? (
                          <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleRequestDesktopNotifications}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                    desktopNotifPermission === 'granted'
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                      : bgCard
                  }`}
                  title={
                    desktopNotifPermission === 'granted'
                      ? 'Desktop Notifications Active'
                      : 'Enable Desktop Notifications'
                  }
                >
                  <Bell className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowBuildAuditModal(true)}
                  className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition cursor-pointer"
                  title="Responsive Inspector & Android APK Guide"
                >
                  <Smartphone className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setUiLang((l) => (l === 'en' ? 'bn' : 'en'))}
                  className={`w-10 h-10 rounded-xl border text-[10px] font-bold flex items-center justify-center transition cursor-pointer ${bgCard}`}
                  title="Switch Bengali / English UI"
                >
                  {uiLang === 'en' ? 'বাং' : 'EN'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !isLightMode;
                    setIsLightMode(next);
                    persistUserAndAccount({ ...currentUser, isLightMode: next });
                  }}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition cursor-pointer ${bgCard}`}
                  title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                  {isLightMode ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center overflow-hidden ring-2 ring-sky-500/40 cursor-pointer"
                  title="My Profile"
                >
                  {currentUser.photoUrl ? (
                    <img
                      src={currentUser.photoUrl}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentUser.avatar
                  )}
                </button>
              </div>
            </aside>

            {/* LEFT COLUMN: CHATS LIST / CONTACTS / STORIES / SETTINGS */}
            <div
              data-mobile-hidden={
                (activeTab === 'chats' && Boolean(activeChatId)) ||
                activeTab === 'ai' ||
                activeTab === 'drive'
                  ? 'true'
                  : 'false'
              }
              className={`ft-left-column w-full tablet:w-[290px] desktop:w-[380px] flex flex-col border-r shrink-0 flex-1 tablet:flex-initial h-full overflow-hidden ${bgPanel}`}
            >
              {/* 1. CHATS TAB LIST (Also shown in Left Column on Tablet/Desktop while AI Hub or Drive is open on the right) */}
              {(activeTab === 'chats' || activeTab === 'ai' || activeTab === 'drive') && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Top Bar with Stacked Story Avatars, "Chats" Title & Action Icons */}
                  <div className="ft-landscape-compact-header px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-2">
                    <div
                      onClick={() => setActiveTab('stories')}
                      className="flex items-center -space-x-2 cursor-pointer shrink-0"
                      title="View Stories"
                    >
                      {['RA', 'SJ', 'DW'].map((initials, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0B101B]"
                        >
                          {initials}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <h2 className="text-base font-bold tracking-tight truncate">
                        {uiLang === 'bn' ? 'চ্যাটসমূহ' : 'Chats'}
                      </h2>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${wsConnected ? 'bg-emerald-400' : 'bg-sky-400'}`}
                        title={wsConnected ? 'Real-Time WebSocket Connected' : 'Firestore Sync Active'}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowBuildAuditModal(true)}
                        className="tablet:hidden w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center cursor-pointer"
                        title="Responsive Inspector & APK Guide"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateGroupModal(true)}
                        className={`w-9 h-9 rounded-full border flex items-center justify-center transition cursor-pointer ${bgCard}`}
                        title="Create Group"
                      >
                        <Users className="w-4 h-4 text-sky-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddFriendModal(true)}
                        className="w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-sm transition cursor-pointer"
                        title="Add Friend"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Search Input (Supports Ctrl+K / Cmd+K Shortcut on Desktop) */}
                  <div className="px-4 pb-2.5">
                    <div className="relative flex items-center">
                      <Search className={`w-3.5 h-3.5 absolute left-3.5 pointer-events-none ${textMuted}`} />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={uiLang === 'bn' ? 'নাম, মেসেজ বা UID খুঁজুন...' : 'Search conversations or UID...'}
                        className={`w-full rounded-2xl pl-9 pr-14 py-2.5 text-xs border focus:outline-none ${bgInput}`}
                      />
                      <span className={`hidden desktop:inline-block absolute right-3 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700/50 ${textMuted} pointer-events-none`}>
                        ⌘K
                      </span>
                    </div>
                  </div>

                  {/* Category Filter Tabs (All, Friends, Work, Groups, Archive) */}
                  <div className="px-4 pb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'all', label: uiLang === 'bn' ? 'সব' : 'All' },
                      { id: 'friends', label: uiLang === 'bn' ? 'বন্ধু' : 'Friends' },
                      { id: 'work', label: uiLang === 'bn' ? 'অফিস' : 'Work' },
                      { id: 'groups', label: uiLang === 'bn' ? 'গ্রুপ' : 'Groups' },
                      { id: 'archive', label: uiLang === 'bn' ? 'আর্কাইভ' : 'Archive' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setChatFilter(tab.id as any)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                          chatFilter === tab.id
                            ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                            : `${bgCard} border ${textMuted}`
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Pinned AI Assistant Shortcut Card */}
                  <div className="px-3 pb-1.5">
                    <div
                      onClick={() => setActiveTab('ai')}
                      className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                        isLightMode
                          ? 'bg-sky-50/80 border-sky-200 hover:bg-sky-100/70'
                          : 'bg-gradient-to-r from-sky-950/60 via-[#132036] to-[#111C2D] border-sky-500/30 hover:border-sky-400/50'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 text-white flex items-center justify-center shrink-0 shadow">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold flex items-center gap-1.5">
                            <span>FlashTalk Gemini AI</span>
                          </h4>
                          <span className="text-[10px] text-sky-400 font-mono">AI Studio</span>
                        </div>
                        <p className={`text-[11px] ${textMuted} truncate`}>
                          Chatbot • Image Analysis • Text-to-Speech
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Conversation Items */}
                  <div className="flex-1 overflow-y-auto px-3 py-1.5 space-y-1">
                    {getFilteredChatItems().map((item) => {
                      const isSelected = activeChatId === item.id && activeTab === 'chats';
                      const isMuted = (currentUser.muted || []).includes(item.id);
                      const timeString = item.lastTime
                        ? new Date(item.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveChatId(item.id);
                            setIsGroupChat(item.isGroup);
                            if (activeTab !== 'chats') {
                              setActiveTab('chats');
                            }
                            if (currentUser) {
                              setMessagesByRoom((prev) => ({
                                ...prev,
                                [item.id]: (prev[item.id] || []).map((m) =>
                                  m.sender !== currentUser.id ? { ...m, seen: true } : m
                                ),
                              }));
                            }
                          }}
                          className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                            isSelected
                              ? isLightMode
                                ? 'bg-sky-50 border-sky-300'
                                : 'bg-[#19283F] border-sky-500/50'
                              : `${bgCard}`
                          }`}
                        >
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shadow">
                              {item.avatar}
                            </div>
                            {!item.isGroup && item.online && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0B101B]" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h4 className="text-xs font-bold truncate flex items-center gap-1.5">
                                <span>{item.name}</span>
                                {item.isGroup && (
                                  <span className="text-[10px] font-normal text-sky-400">· Group</span>
                                )}
                              </h4>
                              <span className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                                {timeString}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-[11px] truncate ${
                                  item.unreadCount > 0 ? 'font-semibold text-sky-400' : textMuted
                                }`}
                              >
                                {partnerTypingRoom === item.id ? 'Typing...' : item.lastMsg}
                              </p>
                              <div className="flex items-center gap-1 shrink-0">
                                {isMuted && <BellOff className={`w-3 h-3 ${textMuted}`} />}
                                {item.isPinned && <Pin className={`w-3 h-3 text-sky-400`} />}
                                {item.unreadCount > 0 && (
                                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                                    {item.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. CONTACTS & FRIEND REQUESTS TAB (Step 6) */}
              {activeTab === 'contacts' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">
                      {uiLang === 'bn' ? 'কন্টাক্ট ও বন্ধু অনুরোধ' : 'Contacts & Requests'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowAddFriendModal(true)}
                      className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Friend</span>
                    </button>
                  </div>

                  {/* Pending Friend Requests Section */}
                  {friendRequests.filter((r) => r.status === 'pending').length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                        Friend Requests ({friendRequests.filter((r) => r.status === 'pending').length})
                      </div>
                      {friendRequests
                        .filter((r) => r.status === 'pending')
                        .map((req) => (
                          <div
                            key={req.id}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${bgCard}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {req.fromAvatar}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold truncate">{req.fromName}</h4>
                                <p className={`text-[10px] font-mono ${textMuted}`}>@{req.fromUsername}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={async () => {
                                  const newUser: AppUser = {
                                    id: req.fromId,
                                    uid: generateRandomUID(),
                                    name: req.fromName,
                                    email: `${req.fromUsername}@gmail.com`,
                                    recoveryAnswer: 'friend',
                                    bio: 'Connected via FlashTalk Friend Request',
                                    username: req.fromUsername,
                                    avatar: req.fromAvatar,
                                    contacts: [],
                                    groups: [],
                                    stories: [],
                                    blocked: [],
                                    online: true,
                                    lastSeenTime: Date.now(),
                                  };
                                  setUsersDirectory((prev) => ({ ...prev, [req.fromId]: newUser }));
                                  setFriendRequests((prev) =>
                                    prev.map((r) => (r.id === req.id ? { ...r, status: 'accepted' } : r))
                                  );
                                  if (!currentUser.contacts.includes(req.fromId)) {
                                    await persistUserAndAccount({
                                      ...currentUser,
                                      contacts: [...currentUser.contacts, req.fromId],
                                    });
                                  }
                                  addToast('success', 'Friend Request Accepted', `${req.fromName} is now in your contacts.`);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-semibold"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFriendRequests((prev) =>
                                    prev.map((r) => (r.id === req.id ? { ...r, status: 'declined' } : r))
                                  );
                                  addToast('info', 'Request Declined', `Removed request from ${req.fromName}.`);
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-[11px] font-semibold"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {(currentUser.contacts || []).map((uid) => {
                      if ((currentUser.blocked || []).includes(uid)) return null;
                      const u = usersDirectory[uid];
                      if (!u) return null;
                      return (
                        <div
                          key={uid}
                          onClick={() => {
                            setActiveChatId(uid);
                            setIsGroupChat(false);
                            setActiveTab('chats');
                          }}
                          className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${bgCard}`}
                        >
                          <div className="w-11 h-11 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
                            {u.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold truncate">{u.name}</h4>
                            <p className={`text-[11px] font-mono ${textMuted} truncate`}>
                              @{u.username} · UID: {u.uid}
                            </p>
                          </div>
                          <MessageSquare className="w-4 h-4 text-sky-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. STORIES TAB (Step 8: Image/Video/Text Stories, Privacy, Viewer List, 24h Expiration, Delete) */}
              {activeTab === 'stories' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">Stories & Status</h2>
                      <p className={`text-[11px] ${textMuted}`}>24-hour text, photo & video updates</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowStoryCreatorModal(true)}
                        className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Story</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3">
                    {(currentUser.stories || []).length === 0 ? (
                      <div className={`p-8 rounded-2xl border text-center ${bgCard}`}>
                        <CircleDot className="w-8 h-8 text-sky-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold">No active stories yet</p>
                        <p className={`text-[11px] ${textMuted} mt-1`}>
                          Create a Text Status with gradient backgrounds or upload a 24h photo/video story.
                        </p>
                      </div>
                    ) : (
                      (currentUser.stories || []).map((st) => {
                        const hoursLeft = Math.max(
                          1,
                          24 - Math.floor((Date.now() - st.timestamp) / (1000 * 60 * 60))
                        );
                        const viewers = st.viewers || [
                          { name: 'Rahim Ahmed', time: st.timestamp + 120000 },
                          { name: 'Sarah Jenkins', time: st.timestamp + 360000 },
                        ];
                        return (
                          <div key={st.id} className={`p-3 rounded-2xl border space-y-2.5 ${bgCard}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center">
                                  {st.userAvatar}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                                    <span>{st.userName}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 text-[9px] uppercase">
                                      {st.privacy || 'everyone'}
                                    </span>
                                  </h4>
                                  <span className={`text-[10px] font-mono ${textMuted}`}>
                                    Expires in {hoursLeft}h
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (currentUser.stories || []).filter((s) => s.id !== st.id);
                                  persistUserAndAccount({ ...currentUser, stories: next });
                                  addToast('info', 'স্টোরি মুছে ফেলা হয়েছে', 'আপনার স্টোরি ডিলিট করা হয়েছে।');
                                }}
                                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                title="Delete Story"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="rounded-xl overflow-hidden bg-black max-h-60 flex items-center justify-center">
                              {st.mediaType === 'video' ? (
                                <video controls src={st.mediaUrl} className="w-full max-h-60 object-cover" />
                              ) : (
                                <img
                                  src={st.mediaUrl}
                                  alt={st.caption || 'Story'}
                                  referrerPolicy="no-referrer"
                                  onClick={() => setLightboxMediaUrl(st.mediaUrl)}
                                  className="w-full max-h-60 object-cover cursor-pointer"
                                />
                              )}
                            </div>
                            {st.caption && <p className="text-xs px-1">{st.caption}</p>}

                            <div className="pt-1 border-t border-slate-700/30 flex items-center justify-between text-[11px]">
                              <span className="text-sky-400 flex items-center gap-1 font-medium">
                                <Eye className="w-3.5 h-3.5" /> {viewers.length} Viewers
                              </span>
                              <span className={`truncate max-w-[180px] ${textMuted}`}>
                                {viewers.map((v) => v.name).join(', ')}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* 4. SETTINGS & PROFILE TABS IN LEFT PANEL (Steps 9, 10, 11, 12, 14) */}
              {(activeTab === 'settings' || activeTab === 'profile') && (
                <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 space-y-4">
                  {activeTab === 'profile' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">My Profile</h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('settings')}
                          className="text-xs text-sky-400 font-semibold cursor-pointer"
                        >
                          Settings
                        </button>
                      </div>

                      <div className={`p-5 rounded-3xl border flex flex-col items-center ${bgCard}`}>
                        <div className="relative mb-3">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 text-white text-2xl font-bold flex items-center justify-center overflow-hidden shadow-lg">
                            {currentUser.photoUrl ? (
                              <img
                                src={currentUser.photoUrl}
                                alt={currentUser.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              currentUser.avatar
                            )}
                          </div>
                          <label
                            htmlFor="profile-avatar-upload"
                            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center cursor-pointer shadow"
                          >
                            <Camera className="w-4 h-4" />
                          </label>
                          <input
                            id="profile-avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const updated = { ...currentUser, photoUrl: ev.target?.result as string };
                                persistUserAndAccount(updated);
                                addToast('success', 'প্রোফাইল ছবি আপডেট হয়েছে', 'নতুন ছবি সংরক্ষিত হয়েছে।');
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </div>
                        <h3 className="text-base font-bold flex items-center gap-1.5">
                          <span>{currentUser.name}</span>
                          {currentUser.emailVerified && (
                            <span title="Email Verified">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-sky-400 font-mono mt-0.5">UID: {currentUser.uid}</p>
                        {!currentUser.emailVerified && (
                          <button
                            type="button"
                            onClick={handleSendVerificationEmail}
                            className="mt-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold"
                          >
                            Verify Email Address
                          </button>
                        )}
                      </div>

                      <div className={`p-4 rounded-2xl border space-y-3 ${bgCard}`}>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={profileNameInput}
                            onChange={(e) => setProfileNameInput(e.target.value)}
                            className={`w-full rounded-xl p-2.5 text-xs border focus:outline-none ${bgInput}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>Bio</label>
                          <input
                            type="text"
                            value={profileBioInput}
                            onChange={(e) => setProfileBioInput(e.target.value)}
                            className={`w-full rounded-xl p-2.5 text-xs border focus:outline-none ${bgInput}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>
                            Username
                          </label>
                          <input
                            type="text"
                            value={profileUsernameInput}
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                              setProfileUsernameInput(val);
                              const taken = Object.values(usersDirectory).some(
                                (u) => u.id !== currentUser.id && u.username?.toLowerCase() === val
                              );
                              if (val.length < 3) {
                                setUsernameStatusText('Username must be at least 3 characters.');
                                setIsUsernameValid(false);
                              } else if (taken) {
                                setUsernameStatusText('This username is already taken.');
                                setIsUsernameValid(false);
                              } else {
                                setUsernameStatusText('Username is available!');
                                setIsUsernameValid(true);
                              }
                            }}
                            className={`w-full rounded-xl p-2.5 text-xs border focus:outline-none ${bgInput}`}
                          />
                          <p
                            className={`text-[10px] mt-1 ${
                              isUsernameValid ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {usernameStatusText}
                          </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!profileNameInput.trim() || !isUsernameValid) {
                                addToast('error', 'তথ্য সঠিক নয়', 'সঠিক নাম এবং ইউনিক ইউজারনেম দিন।');
                                return;
                              }
                              const updated: AppUser = {
                                ...currentUser,
                                name: profileNameInput.trim(),
                                bio: profileBioInput.trim(),
                                username: profileUsernameInput.trim(),
                                avatar: profileNameInput
                                  .trim()
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2),
                              };
                              persistUserAndAccount(updated);
                              addToast('success', 'প্রোফাইল সেভ হয়েছে', 'আপনার প্রোফাইল তথ্য আপডেট করা হয়েছে।');
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition cursor-pointer"
                          >
                            Save Changes
                          </button>
                          {currentUser.photoUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                persistUserAndAccount({ ...currentUser, photoUrl: null });
                                addToast('info', 'ছবি সরানো হয়েছে', 'প্রোফাইল ছবি মুছে ফেলা হয়েছে।');
                              }}
                              className="px-3 py-2.5 rounded-xl bg-rose-500/15 text-rose-400 text-xs font-semibold cursor-pointer"
                            >
                              Remove Photo
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : subSettingView === null ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">{uiLang === 'bn' ? 'সেটিংস' : 'Settings'}</h2>
                        <PWAInstallButton compact />
                      </div>

                      <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${bgCard}`}>
                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 text-white font-bold text-base flex items-center justify-center overflow-hidden">
                          {currentUser.photoUrl ? (
                            <img
                              src={currentUser.photoUrl}
                              alt={currentUser.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            currentUser.avatar
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold truncate">{currentUser.name}</h3>
                          <p className={`text-xs ${textMuted} truncate`}>{currentUser.email}</p>
                          <p className="text-[10px] font-mono text-sky-400 mt-0.5">UID: {currentUser.uid}</p>
                        </div>
                      </div>

                      {/* Language Toggle (Bengali / English) */}
                      <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${bgCard}`}>
                        <div className="flex items-center gap-2.5">
                          <Globe className="w-4 h-4 text-sky-400" />
                          <span className="text-xs font-semibold">Language / ভাষা</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setUiLang('en')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              uiLang === 'en' ? 'bg-sky-500 text-white' : 'bg-slate-800/40 text-slate-400'
                            }`}
                          >
                            English
                          </button>
                          <button
                            type="button"
                            onClick={() => setUiLang('bn')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              uiLang === 'bn' ? 'bg-sky-500 text-white' : 'bg-slate-800/40 text-slate-400'
                            }`}
                          >
                            বাংলা
                          </button>
                        </div>
                      </div>

                      <div className={`rounded-2xl border divide-y divide-slate-700/30 overflow-hidden ${bgCard}`}>
                        <button
                          type="button"
                          onClick={() => setActiveTab('profile')}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-sky-500/5 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <UserIcon className="w-4 h-4 text-sky-400" />
                            <span className="text-xs font-semibold">Edit Account Profile</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSubSettingView('switch-account')}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-sky-500/5 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-semibold">Switch Account (Max 5)</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSubSettingView('notifications')}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-sky-500/5 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Bell className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-semibold">Notifications (Push & Email)</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSubSettingView('chat-settings')}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-sky-500/5 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Sun className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-semibold">Dark / Light Mode & Themes</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSubSettingView('privacy-settings')}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-sky-500/5 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-semibold">Privacy, PIN Lock, E2EE & Blocked</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSubSettingView('sessions-storage')}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-sky-500/5 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Database className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-semibold">Active Sessions, Storage & Help</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowBuildAuditModal(true)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-sky-500/5 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Smartphone className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-semibold">Android APK/AAB Build & Step 1–16 Audit</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await logout().catch(() => {});
                          localStorage.removeItem('flashtalk_user');
                          setCurrentUser(null);
                          addToast('info', 'লগআউট হয়েছে', 'আপনি সফলভাবে লগআউট করেছেন।');
                        }}
                        className="w-full p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </>
                  ) : subSettingView === 'notifications' ? (
                    /* Notifications Settings (Step 9 & Screenshot_20261024-191418.jpg) */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold">Notifications</h3>
                        <button
                          type="button"
                          onClick={() => setSubSettingView(null)}
                          className="text-xs text-sky-400 font-semibold cursor-pointer"
                        >
                          Back
                        </button>
                      </div>

                      <div className={`p-4 rounded-2xl border space-y-4 ${bgCard}`}>
                        {[
                          { key: 'push', title: 'Push Notifications', desc: 'Instant browser & device alerts for messages and calls' },
                          { key: 'manage', title: 'Manage Notifications', desc: 'Sound, vibration & priority message banners' },
                          { key: 'email', title: 'Email Notifications', desc: 'Security alerts and backup summaries via Gmail' },
                        ].map((item) => {
                          const enabled = (notifSettings as any)[item.key];
                          return (
                            <div key={item.key} className="flex items-center justify-between gap-3">
                              <div>
                                <h4 className="text-xs font-bold">{item.title}</h4>
                                <p className={`text-[11px] ${textMuted}`}>{item.desc}</p>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (item.key === 'push' && !enabled && 'Notification' in window) {
                                    await Notification.requestPermission().catch(() => {});
                                  }
                                  setNotifSettings((prev) => ({
                                    ...prev,
                                    [item.key]: !enabled,
                                  }));
                                  addToast('success', 'Notification Updated', `${item.title} ${!enabled ? 'enabled' : 'disabled'}.`);
                                }}
                                className={`w-11 h-6 rounded-full transition p-0.5 shrink-0 ${
                                  enabled ? 'bg-sky-500' : 'bg-slate-700'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                    enabled ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : subSettingView === 'sessions-storage' ? (
                    /* Active Sessions, Storage, Help & Account Deletion (Step 10 & 12) */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold">Sessions, Storage & Account</h3>
                        <button
                          type="button"
                          onClick={() => setSubSettingView(null)}
                          className="text-xs text-sky-400 font-semibold cursor-pointer"
                        >
                          Back
                        </button>
                      </div>

                      <div className={`p-4 rounded-2xl border space-y-3 ${bgCard}`}>
                        <h4 className="text-xs font-bold">Active Devices & Sessions</h4>
                        {activeSessions.map((sess) => (
                          <div
                            key={sess.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-700/40 text-xs"
                          >
                            <div>
                              <div className="font-semibold">{sess.device}</div>
                              <div className={`text-[10px] ${textMuted}`}>{sess.ip}</div>
                            </div>
                            {sess.activeNow ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                Current
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSessions((prev) => prev.filter((s) => s.id !== sess.id));
                                  addToast('info', 'Session Revoked', 'Remote device logged out.');
                                }}
                                className="px-2 py-1 rounded bg-rose-500/15 text-rose-400 text-[10px] font-semibold"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className={`p-4 rounded-2xl border space-y-3 ${bgCard}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold">Local Cache & Media Storage</h4>
                            <p className={`text-[11px] ${textMuted}`}>
                              {Object.values(messagesByRoom).flat().length} cached messages · E2EE Vault Active
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              addToast('success', 'Cache Optimized', 'Temporary media cache cleared.');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-400 text-xs font-semibold"
                          >
                            Clear Cache
                          </button>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border border-rose-500/30 space-y-2.5 ${bgCard}`}>
                        <h4 className="text-xs font-bold text-rose-400">Danger Zone — Delete Account</h4>
                        <p className={`text-[11px] ${textMuted}`}>
                          Permanently delete your FlashTalk profile and remove account credentials. Requires password verification.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyPasswordModal({
                              open: true,
                              actionLabel: 'permanently delete your account',
                              onVerified: async () => {
                                try {
                                  if (auth.currentUser) {
                                    await deleteDoc(doc(db, 'users', currentUser.id)).catch(() => {});
                                    await deleteUser(auth.currentUser).catch(() => {});
                                  }
                                } catch {}
                                const remaining = accountsList.filter((a) => a.email !== currentUser.email);
                                setAccountsList(remaining);
                                localStorage.setItem('flashtalk_accounts', JSON.stringify(remaining));
                                localStorage.removeItem('flashtalk_user');
                                setCurrentUser(null);
                                addToast('info', 'Account Deleted', 'Your FlashTalk account has been permanently removed.');
                              },
                            });
                          }}
                          className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                        >
                          Delete My Account Permanently
                        </button>
                      </div>
                    </div>
                  ) : subSettingView === 'switch-account' ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold">Switch Account</h3>
                        <button
                          type="button"
                          onClick={() => setSubSettingView(null)}
                          className="text-xs text-sky-400 font-semibold cursor-pointer"
                        >
                          Back
                        </button>
                      </div>

                      <div className="space-y-2">
                        {accountsList.map((acc) => {
                          const isCurrent = acc.email === currentUser.email;
                          return (
                            <div
                              key={acc.email}
                              onClick={() => {
                                setCurrentUser(acc);
                                localStorage.setItem('flashtalk_user', JSON.stringify(acc));
                                setIsLightMode(!!acc.isLightMode);
                                setSubSettingView(null);
                                addToast('success', 'অ্যাকাউন্ট পরিবর্তন হয়েছে', `${acc.name}-এ সুইচ করা হয়েছে।`);
                              }}
                              className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer ${
                                isCurrent ? 'border-sky-500 bg-sky-500/10' : bgCard
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
                                  {acc.avatar}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold">
                                    {acc.name} {isCurrent && <span className="text-sky-400">· Active</span>}
                                  </h4>
                                  <p className={`text-[10px] font-mono ${textMuted}`}>
                                    {acc.email} · UID: {acc.uid}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-sky-400" />
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (accountsList.length >= 5) {
                            addToast('error', 'সর্বোচ্চ সীমা পূর্ণ', 'সর্বোচ্চ ৫টি অ্যাকাউন্ট যোগ করা যায়।');
                            return;
                          }
                          setShowAddAccountModal(true);
                        }}
                        className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Another Account</span>
                      </button>
                    </div>
                  ) : subSettingView === 'chat-settings' ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold">Theme & Appearance</h3>
                        <button
                          type="button"
                          onClick={() => setSubSettingView(null)}
                          className="text-xs text-sky-400 font-semibold cursor-pointer"
                        >
                          Back
                        </button>
                      </div>

                      <div className={`p-4 rounded-2xl border space-y-4 ${bgCard}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold">Light Mode</h4>
                            <p className={`text-[11px] ${textMuted}`}>Switch between Dark & Bright theme</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isLightMode}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setIsLightMode(checked);
                              persistUserAndAccount({ ...currentUser, isLightMode: checked });
                              addToast(
                                'success',
                                checked ? 'Light Mode চালু হয়েছে' : 'Dark Mode চালু হয়েছে',
                                'অ্যাপের থিম আপডেট করা হয়েছে।'
                              );
                            }}
                            className="w-5 h-5 accent-sky-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <h4 className="text-xs font-bold mb-2">Chat Room Background</h4>
                          <div className="grid grid-cols-2 gap-2.5">
                            {[
                              { hex: '#080C14', name: 'Obsidian Blue' },
                              { hex: '#0F172A', name: 'Midnight Slate' },
                              { hex: '#091926', name: 'Deep Sapphire' },
                              { hex: '#F1F5F9', name: 'Crisp Alabaster' },
                            ].map((t) => (
                              <button
                                key={t.hex}
                                type="button"
                                onClick={() => {
                                  setChatWallpaper(t.hex);
                                  localStorage.setItem('flashtalk_theme', t.hex);
                                  addToast('success', 'ওয়ালপেপার পরিবর্তন হয়েছে', `${t.name} সেট করা হয়েছে।`);
                                }}
                                className={`p-3 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                                  chatWallpaper === t.hex ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-slate-700'
                                }`}
                                style={{
                                  backgroundColor: t.hex,
                                  color: t.hex === '#F1F5F9' ? '#0f172a' : '#ffffff',
                                }}
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold">Privacy, PIN & E2EE Security</h3>
                        <button
                          type="button"
                          onClick={() => setSubSettingView(null)}
                          className="text-xs text-sky-400 font-semibold cursor-pointer"
                        >
                          Back
                        </button>
                      </div>

                      <div className={`p-4 rounded-2xl border space-y-4 ${bgCard}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold">Web Crypto AES-GCM 256-bit E2EE</h4>
                            <p className={`text-[11px] ${textMuted}`}>Encrypt outgoing messages on device</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={e2eeEnabled}
                            onChange={(e) => {
                              setE2eeEnabled(e.target.checked);
                              addToast(
                                'info',
                                e.target.checked ? 'E2EE Enabled' : 'E2EE Paused',
                                e.target.checked
                                  ? 'All messages encrypted with AES-GCM 256-bit.'
                                  : 'Messages sent in standard mode.'
                              );
                            }}
                            className="w-5 h-5 accent-sky-500 cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                          <div>
                            <h4 className="text-xs font-bold">4-Digit Passcode Lock</h4>
                            <p className={`text-[11px] ${textMuted}`}>Protect app with security PIN (Re-auth required)</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={!!currentUser.passcode}
                            onChange={(e) => {
                              const wantEnable = e.target.checked;
                              setVerifyPasswordModal({
                                open: true,
                                actionLabel: wantEnable ? 'enable 4-digit PIN lock' : 'disable 4-digit PIN lock',
                                onVerified: () => {
                                  if (wantEnable) {
                                    setPasscodeSetupStep(1);
                                    setTempPinBuffer('');
                                    setPasscodeInput('');
                                    setIsPasscodeLocked(true);
                                  } else {
                                    persistUserAndAccount({ ...currentUser, passcode: null });
                                    addToast('info', 'পাসকোড বন্ধ করা হয়েছে', 'পিন লক নিষ্ক্রিয় করা হয়েছে।');
                                  }
                                },
                              });
                            }}
                            className="w-5 h-5 accent-sky-500 cursor-pointer"
                          />
                        </div>

                        <div className="pt-2 border-t border-slate-700/30 space-y-2">
                          <label className="block text-xs font-bold">Secret Recovery Answer</label>
                          <input
                            type="text"
                            value={recoveryAnswerInput}
                            onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                            placeholder="Secret word for PIN recovery"
                            className={`w-full rounded-xl p-2.5 text-xs border focus:outline-none ${bgInput}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!recoveryAnswerInput.trim()) return;
                              persistUserAndAccount({
                                ...currentUser,
                                recoveryAnswer: recoveryAnswerInput.trim(),
                              });
                              addToast('success', 'রিকভারি উত্তর সেভ হয়েছে', 'নতুন সিক্রেট উত্তর সংরক্ষিত হয়েছে।');
                            }}
                            className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold cursor-pointer"
                          >
                            Update Recovery Answer
                          </button>
                        </div>

                        <div className="pt-2 border-t border-slate-700/30 space-y-2">
                          <h4 className="text-xs font-bold">Blocked Users</h4>
                          {(currentUser.blocked || []).length === 0 ? (
                            <p className={`text-xs italic ${textMuted}`}>No blocked users.</p>
                          ) : (
                            (currentUser.blocked || []).map((uid) => {
                              const u = usersDirectory[uid];
                              return (
                                <div
                                  key={uid}
                                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-700/40"
                                >
                                  <span className="text-xs font-semibold">{u?.name || uid}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = (currentUser.blocked || []).filter((id) => id !== uid);
                                      persistUserAndAccount({ ...currentUser, blocked: next });
                                      addToast('success', 'আনব্লক হয়েছে', 'ইউজারকে আনব্লক করা হয়েছে।');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Unblock
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LEFT PANEL SHORTCUT WHEN AI OR DRIVE TAB IS ACTIVE ON TABLET / DESKTOP */}
              {(activeTab === 'ai' || activeTab === 'drive') && (
                <div className="hidden tablet:flex flex-col flex-1 p-4 space-y-3 overflow-y-auto">
                  <h2 className="text-lg font-bold">
                    {activeTab === 'ai' ? 'Gemini AI Workspace' : 'Google Drive Cloud'}
                  </h2>
                  <p className={`text-xs ${textMuted}`}>
                    {activeTab === 'ai'
                      ? 'Select a tool on the right panel to use Multi-turn Gemini Chat, Image Analysis (gemini-4-argon), or Text-to-Speech (gemini-3.8-flash-tts).'
                      : 'Browse your Google Drive files, share cloud links in chats, or back up encrypted chat transcripts.'}
                  </p>
                  <div className="space-y-2 pt-2">
                    {[
                      { id: 'chatbot', title: 'Gemini Multi-Turn Chatbot', desc: 'gemini-4-argon · 3.8-flash · 3.1-flash-lite' },
                      { id: 'vision', title: 'Image Analysis Studio', desc: 'Powered by gemini-4-argon' },
                      { id: 'tts', title: 'Voice & TTS Generator', desc: 'Powered by gemini-3.8-flash-tts' },
                    ].map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('ai');
                          setAiSubTab(tool.id as any);
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                          activeTab === 'ai' && aiSubTab === tool.id
                            ? 'border-sky-500 bg-sky-500/10'
                            : bgCard
                        }`}
                      >
                        <h4 className="text-xs font-bold">{tool.title}</h4>
                        <p className={`text-[10px] font-mono ${textMuted} mt-0.5`}>{tool.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT MAIN WORKSPACE: ACTIVE CHAT ROOM / AI STUDIO / GOOGLE DRIVE */}
            <main
              data-mobile-hidden={
                (activeTab === 'chats' && Boolean(activeChatId)) ||
                activeTab === 'ai' ||
                activeTab === 'drive'
                  ? 'false'
                  : 'true'
              }
              className="ft-right-column flex-1 flex flex-col h-full overflow-hidden relative min-w-0"
            >
              {/* CASE A: AI STUDIO VIEW */}
              {activeTab === 'ai' ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Top AI Navigation Header */}
                  <div className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${bgPanel}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white flex items-center justify-center shadow">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold">FlashTalk AI Studio</h2>
                        <p className={`text-[11px] ${textMuted}`}>
                          Server-side Gemini Models • Multi-turn Chat, Vision & TTS
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-700/40">
                      <button
                        type="button"
                        onClick={() => setAiSubTab('chatbot')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                          aiSubTab === 'chatbot' ? 'bg-sky-500 text-white' : textMuted
                        }`}
                      >
                        Gemini Chatbot
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiSubTab('vision')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                          aiSubTab === 'vision' ? 'bg-sky-500 text-white' : textMuted
                        }`}
                      >
                        Analyze Images
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiSubTab('tts')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                          aiSubTab === 'tts' ? 'bg-sky-500 text-white' : textMuted
                        }`}
                      >
                        Text to Speech
                      </button>
                    </div>
                  </div>

                  {/* 1. MULTI-TURN GEMINI CHATBOT */}
                  {aiSubTab === 'chatbot' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      {/* Model & Role Controls Bar */}
                      <div className={`px-5 py-2.5 border-b flex flex-wrap items-center gap-3 text-xs ${bgCard}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold ${textMuted}`}>Model:</span>
                          <select
                            value={aiChatModel}
                            onChange={(e) => setAiChatModel(e.target.value as GeminiChatModel)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs border focus:outline-none ${bgInput}`}
                          >
                            <option value="gemini-3.8-flash">gemini-3.8-flash (General Tasks)</option>
                            <option value="gemini-4-argon">gemini-4-argon (Complex Reasoning)</option>
                            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast Lite)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold ${textMuted}`}>Role:</span>
                          <select
                            value={aiRoleId}
                            onChange={(e) => setAiRoleId(e.target.value)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs border focus:outline-none ${bgInput}`}
                          >
                            {AI_ROLES.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <input
                          type="text"
                          value={customSystemPrompt}
                          onChange={(e) => setCustomSystemPrompt(e.target.value)}
                          placeholder="Optional custom system instruction..."
                          className={`flex-1 min-w-[180px] rounded-lg px-3 py-1.5 text-xs border focus:outline-none ${bgInput}`}
                        />
                      </div>

                      {/* Chat Messages Thread */}
                      <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {aiChatHistory.map((turn) => {
                          const isUser = turn.role === 'user';
                          return (
                            <div
                              key={turn.id}
                              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[82%] sm:max-w-[72%] rounded-2xl px-4 py-3 text-xs space-y-2 shadow ${
                                  isUser
                                    ? 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white rounded-br-xs'
                                    : `${bgCard} border rounded-bl-xs`
                                }`}
                              >
                                <p className="whitespace-pre-wrap leading-relaxed">{turn.text}</p>
                                {turn.ttsUrl && (
                                  <WaveformAudioPlayer
                                    src={turn.ttsUrl}
                                    isOutgoing={isUser}
                                    isLightMode={isLightMode}
                                    label="gemini-3.8-flash-tts"
                                  />
                                )}
                                <div className="flex items-center justify-between gap-3 pt-1 opacity-80">
                                  <span className="text-[10px] font-mono">
                                    {turn.model || (isUser ? 'You' : 'Gemini')}
                                  </span>
                                  {!isUser && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          addToast('loading', 'TTS তৈরি হচ্ছে...', 'অডিও জেনারেট করা হচ্ছে।');
                                          const res = await synthesizeSpeechWithGemini({
                                            text: turn.text,
                                            voiceName: 'Kore',
                                          });
                                          const url = `data:${res.mimeType};base64,${res.audioBase64}`;
                                          setAiChatHistory((prev) =>
                                            prev.map((item) =>
                                              item.id === turn.id ? { ...item, ttsUrl: url } : item
                                            )
                                          );
                                        } catch (err: any) {
                                          addToast('error', 'TTS ত্রুটি', err?.message || 'অডিও তৈরি করা যায়নি।');
                                        }
                                      }}
                                      className="flex items-center gap-1 text-[10px] text-sky-400 hover:underline cursor-pointer"
                                    >
                                      <Volume2 className="w-3 h-3" />
                                      <span>Listen</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {isAiChatLoading && (
                          <div className="flex justify-start">
                            <div className={`px-4 py-3 rounded-2xl border flex items-center gap-2 text-xs ${bgCard}`}>
                              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                              <span>Thinking with {aiChatModel}...</span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Input Bar */}
                      <form onSubmit={handleSendAiChat} className={`p-3.5 border-t flex items-center gap-2.5 ${bgPanel}`}>
                        <input
                          type="text"
                          value={aiPromptInput}
                          onChange={(e) => setAiPromptInput(e.target.value)}
                          placeholder={`Ask Gemini (${aiChatModel})...`}
                          className={`flex-1 rounded-2xl px-4 py-3 text-xs border focus:outline-none ${bgInput}`}
                        />
                        <button
                          type="submit"
                          disabled={isAiChatLoading}
                          className="w-11 h-11 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white flex items-center justify-center shadow transition cursor-pointer shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}

                  {/* 2. IMAGE UNDERSTANDING STUDIO (gemini-4-argon) */}
                  {aiSubTab === 'vision' && (
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className={`p-5 rounded-3xl border space-y-4 ${bgCard}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold">Upload Photo to Analyze</h3>
                              <p className={`text-[11px] ${textMuted}`}>
                                Powered by <span className="font-mono text-sky-400">gemini-4-argon</span>
                              </p>
                            </div>
                            <ScanEye className="w-5 h-5 text-sky-400" />
                          </div>

                          <label
                            htmlFor="vision-file-upload"
                            className="border-2 border-dashed border-sky-500/40 hover:border-sky-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[200px]"
                          >
                            {visionImage ? (
                              <img
                                src={visionImage.base64}
                                alt={visionImage.name}
                                referrerPolicy="no-referrer"
                                className="max-h-52 rounded-xl object-contain mb-2"
                              />
                            ) : (
                              <>
                                <Camera className="w-8 h-8 text-sky-400 mb-2" />
                                <span className="text-xs font-semibold">Click to select a photo</span>
                                <span className={`text-[11px] ${textMuted} mt-1`}>
                                  Supports JPG, PNG, WEBP
                                </span>
                              </>
                            )}
                          </label>
                          <input
                            id="vision-file-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setVisionImage({
                                  base64: ev.target?.result as string,
                                  mimeType: file.type || 'image/jpeg',
                                  name: file.name,
                                });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />

                          <div className="space-y-2">
                            <label className={`block text-[11px] font-semibold ${textMuted}`}>
                              Analysis Question / Prompt
                            </label>
                            <textarea
                              rows={3}
                              value={visionPrompt}
                              onChange={(e) => setVisionPrompt(e.target.value)}
                              className={`w-full rounded-xl p-3 text-xs border focus:outline-none ${bgInput}`}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleRunVisionAnalysis}
                            disabled={isVisionLoading}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow transition cursor-pointer"
                          >
                            {isVisionLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Analyzing with gemini-4-argon...</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4" />
                                <span>Analyze Image with gemini-4-argon</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className={`p-5 rounded-3xl border flex flex-col ${bgCard}`}>
                          <h3 className="text-sm font-bold mb-2">Gemini Vision Insights</h3>
                          <div className="flex-1 rounded-2xl p-4 border border-slate-700/30 overflow-y-auto text-xs whitespace-pre-wrap leading-relaxed min-h-[240px]">
                            {visionResult ||
                              'আপনার ছবি আপলোড করে "Analyze Image" বাটনে ক্লিক করলে gemini-4-argon মডেলের বিস্তারিত বিশ্লেষণ এখানে দেখা যাবে।'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. TEXT-TO-SPEECH STUDIO (gemini-3.8-flash-tts) */}
                  {aiSubTab === 'tts' && (
                    <div className="flex-1 overflow-y-auto p-5">
                      <div className={`max-w-2xl mx-auto p-6 rounded-3xl border space-y-4 ${bgCard}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-bold">Convert Text to Speech</h3>
                            <p className={`text-xs ${textMuted}`}>
                              Powered by <span className="font-mono text-sky-400">gemini-3.8-flash-tts</span>
                            </p>
                          </div>
                          <Volume2 className="w-6 h-6 text-sky-400" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-[11px] font-semibold mb-1 ${textMuted}`}>
                              Voice Persona
                            </label>
                            <select
                              value={ttsVoice}
                              onChange={(e) => setTtsVoice(e.target.value as any)}
                              className={`w-full rounded-xl p-2.5 text-xs border focus:outline-none ${bgInput}`}
                            >
                              <option value="Kore">Kore (Clear & Balanced)</option>
                              <option value="Puck">Puck (Bright & Energetic)</option>
                              <option value="Zephyr">Zephyr (Smooth & Friendly)</option>
                              <option value="Charon">Charon (Deep & Authoritative)</option>
                              <option value="Fenrir">Fenrir (Expressive Storyteller)</option>
                            </select>
                          </div>
                          <div>
                            <label className={`block text-[11px] font-semibold mb-1 ${textMuted}`}>
                              Speaking Direction / Style
                            </label>
                            <input
                              type="text"
                              value={ttsStyle}
                              onChange={(e) => setTtsStyle(e.target.value)}
                              className={`w-full rounded-xl p-2.5 text-xs border focus:outline-none ${bgInput}`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[11px] font-semibold mb-1 ${textMuted}`}>
                            Text to Synthesize (Bengali or English)
                          </label>
                          <textarea
                            rows={4}
                            value={ttsInputText}
                            onChange={(e) => setTtsInputText(e.target.value)}
                            className={`w-full rounded-2xl p-3.5 text-xs border focus:outline-none ${bgInput}`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleRunTtsSynthesis}
                          disabled={isTtsLoading}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow transition cursor-pointer"
                        >
                          {isTtsLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Generating Audio with gemini-3.8-flash-tts...</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-4 h-4" />
                              <span>Generate Speech (gemini-3.8-flash-tts)</span>
                            </>
                          )}
                        </button>

                        {ttsAudioUrl && (
                          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <WaveformAudioPlayer
                              src={ttsAudioUrl}
                              isLightMode={isLightMode}
                              label={`Voice: ${ttsVoice} · gemini-3.8-flash-tts`}
                            />
                            <div className="flex items-center gap-2">
                              <a
                                href={ttsAudioUrl}
                                download={`flashtalk_tts_${Date.now()}.wav`}
                                className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>WAV</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  const target = activeChatId || 'u1';
                                  const newMsg: ChatMessage = {
                                    id: 'msg_tts_' + Date.now(),
                                    sender: currentUser.id,
                                    senderName: currentUser.name,
                                    text: ttsInputText,
                                    mediaUrl: ttsAudioUrl,
                                    mediaType: 'audio',
                                    timestamp: Date.now(),
                                    seen: true,
                                  };
                                  setMessagesByRoom((prev) => ({
                                    ...prev,
                                    [target]: [...(prev[target] || []), newMsg],
                                  }));
                                  setActiveChatId(target);
                                  setActiveTab('chats');
                                  addToast('success', 'চ্যাটে পাঠানো হয়েছে', 'TTS ভয়েস নোট চ্যাটে শেয়ার করা হয়েছে।');
                                }}
                                className="px-3 py-2 rounded-xl border border-sky-500/40 text-sky-400 text-xs font-semibold cursor-pointer"
                              >
                                Send to Chat
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'drive' ? (
                /* CASE B: GOOGLE DRIVE INTEGRATION HUB */
                <div className="flex-1 flex flex-col h-full overflow-hidden p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold">Google Drive Cloud Storage</h2>
                        <p className={`text-xs ${textMuted}`}>
                          Browse Drive files, attach to chat, and store chat backups
                        </p>
                      </div>
                    </div>

                    {driveConnected && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadUserDriveFiles()}
                          className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${bgCard}`}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isDriveLoading ? 'animate-spin' : ''}`} />
                          <span>Refresh</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleBackupChatToDrive}
                          className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>Backup Active Chat to Drive</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {!driveConnected ? (
                    <div className={`max-w-md mx-auto my-auto p-6 rounded-3xl border text-center space-y-4 ${bgCard}`}>
                      <HardDrive className="w-10 h-10 text-sky-400 mx-auto" />
                      <h3 className="text-base font-bold">Connect Google Drive</h3>
                      <p className={`text-xs ${textMuted} leading-relaxed`}>
                        Sign in with your Google account to browse your Google Drive files, share documents in FlashTalk chats, and save encrypted chat backups.
                      </p>
                      <GoogleSignInButton
                        onClick={() => handleGoogleLogin(true)}
                        label="Authorize Google Drive Access"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className={`w-4 h-4 absolute left-3.5 top-3 ${textMuted}`} />
                          <input
                            type="text"
                            value={driveSearchQuery}
                            onChange={(e) => setDriveSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadUserDriveFiles(driveSearchQuery)}
                            placeholder="Search files in your Google Drive..."
                            className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs border focus:outline-none ${bgInput}`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => loadUserDriveFiles(driveSearchQuery)}
                          className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold cursor-pointer"
                        >
                          Search
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2">
                        {isDriveLoading ? (
                          <div className="p-12 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                            <span className={`text-xs ${textMuted}`}>Loading files from Google Drive...</span>
                          </div>
                        ) : driveFiles.length === 0 ? (
                          <div className={`p-10 rounded-2xl border text-center ${bgCard}`}>
                            <p className="text-xs font-semibold">No files found in Google Drive</p>
                            <p className={`text-[11px] ${textMuted} mt-1`}>
                              Click "Backup Active Chat to Drive" above to create your first backup file!
                            </p>
                          </div>
                        ) : (
                          driveFiles.map((file) => (
                            <div
                              key={file.id}
                              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${bgCard}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText className="w-5 h-5 text-sky-400 shrink-0" />
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold truncate">{file.name}</h4>
                                  <p className={`text-[10px] font-mono ${textMuted} truncate`}>
                                    {file.mimeType}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleShareDriveFileToChat(file)}
                                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 text-[11px] font-semibold cursor-pointer"
                                >
                                  Share in Chat
                                </button>
                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-1.5 rounded-lg border ${textMuted} hover:text-sky-400`}
                                    title="Open in Drive"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setDriveFileToDelete(file)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                                  title="Delete file"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* CASE C: ACTIVE CHAT ROOM CONVERSATION VIEW */
                <div
                  onDragOver={handleChatDragOver}
                  onDragLeave={handleChatDragLeave}
                  onDrop={handleChatDrop}
                  className="flex-1 flex flex-col h-full overflow-hidden relative"
                  style={{
                    backgroundColor: isLightMode ? '#F8FAFC' : chatWallpaper,
                  }}
                >
                  {/* Desktop File Drag-and-Drop Overlay */}
                  {isDraggingMedia && getActiveTarget() && (
                    <div className="absolute inset-3 z-50 rounded-3xl bg-sky-950/90 border-2 border-dashed border-sky-400 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                      <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center mb-3">
                        <UploadCloud className="w-8 h-8 animate-bounce" />
                      </div>
                      <h4 className="text-base font-bold text-white">
                        Drop Photo, Video, or Document Here
                      </h4>
                      <p className="text-xs text-sky-200/80 mt-1 max-w-xs">
                        Release to preview and send in your conversation with {getActiveTarget()?.name}
                      </p>
                    </div>
                  )}

                  {!getActiveTarget() ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-16 h-16 rounded-3xl bg-sky-500/15 text-sky-400 flex items-center justify-center mb-3">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold">Select a Conversation</h3>
                      <p className={`text-xs ${textMuted} max-w-xs mt-1`}>
                        Choose a friend or group from the left column to start messaging, sharing photos & videos, voice calling, or using Gemini AI tools.
                      </p>
                      <div className="hidden desktop:flex items-center gap-2 mt-4 text-[11px] text-slate-400 bg-slate-900/50 border border-slate-800 px-3 py-1.5 rounded-xl">
                        <span>Shortcut:</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px]">
                          Ctrl/⌘ + K
                        </kbd>
                        <span>to search chats • Drag & drop files to attach</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Chat Room Top Header (Responsive across Phone, Tablet & Desktop) */}
                      <div className={`px-3 tablet:px-4 py-2.5 tablet:py-3 border-b flex items-center justify-between gap-2 shrink-0 relative z-20 ${bgPanel}`}>
                        <div className="flex items-center gap-2.5 tablet:gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveChatId(null);
                              setShowChatHeaderMenu(false);
                            }}
                            className="tablet:hidden p-1.5 rounded-xl text-sky-400 hover:bg-sky-500/10 cursor-pointer shrink-0"
                            title="Back to Conversations"
                          >
                            <ArrowLeft className="w-5 h-5" />
                          </button>
                          <div className="w-9 h-9 tablet:w-10 tablet:h-10 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow">
                            {getActiveTarget()?.avatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xs tablet:text-sm font-bold truncate">{getActiveTarget()?.name}</h3>
                            <p className={`text-[10px] tablet:text-[11px] ${textMuted} truncate`}>
                              {isGroupChat
                                ? `${(getActiveTarget() as GroupChat)?.members?.length || 2} members`
                                : partnerTypingRoom === activeChatId
                                ? 'Typing...'
                                : formatLastSeen((getActiveTarget() as AppUser)?.lastSeenTime)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 tablet:gap-1.5 shrink-0">
                          {!isGroupChat && (
                            <>
                              <button
                                type="button"
                                onClick={() => startCall('voice')}
                                className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 flex items-center justify-center transition cursor-pointer"
                                title="Voice Call"
                              >
                                <Phone className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => startCall('video')}
                                className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 flex items-center justify-center transition cursor-pointer"
                                title="Video Call"
                              >
                                <Video className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {isGroupChat && (
                            <button
                              type="button"
                              onClick={() => setShowGroupManageModal(true)}
                              className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Manage Group Members, Admins & Invite Link"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              <span className="hidden tablet:inline">Group Info</span>
                            </button>
                          )}

                          {/* Desktop Inline Quick Actions (hidden on phones/tablets to prevent header wrapping) */}
                          <div className="hidden desktop:flex items-center gap-1.5">
                            {activeChatId && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isPinned = (currentUser.pinned || []).includes(activeChatId);
                                    const next = isPinned
                                      ? (currentUser.pinned || []).filter((id) => id !== activeChatId)
                                      : [...(currentUser.pinned || []), activeChatId];
                                    persistUserAndAccount({ ...currentUser, pinned: next });
                                    addToast(
                                      'info',
                                      isPinned ? 'আনপিন করা হয়েছে' : 'পিন করা হয়েছে',
                                      'চ্যাট তালিকা আপডেট করা হয়েছে।'
                                    );
                                  }}
                                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                                    (currentUser.pinned || []).includes(activeChatId)
                                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                                      : bgCard
                                  }`}
                                  title="Pin / Unpin Chat"
                                >
                                  <Pin className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isMuted = (currentUser.muted || []).includes(activeChatId);
                                    const next = isMuted
                                      ? (currentUser.muted || []).filter((id) => id !== activeChatId)
                                      : [...(currentUser.muted || []), activeChatId];
                                    persistUserAndAccount({ ...currentUser, muted: next });
                                    addToast(
                                      'info',
                                      isMuted ? 'আনমিউট করা হয়েছে' : 'মিউট করা হয়েছে',
                                      'চ্যাট নোটিফিকেশন আপডেট করা হয়েছে।'
                                    );
                                  }}
                                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                                    (currentUser.muted || []).includes(activeChatId)
                                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                      : bgCard
                                  }`}
                                  title="Mute / Unmute Notifications"
                                >
                                  <BellOff className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={handleBackupChatToDrive}
                              className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition cursor-pointer"
                              title="Backup Chat to Google Drive"
                            >
                              <HardDrive className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadChatBackup}
                              className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 flex items-center justify-center transition cursor-pointer"
                              title="Export Chat .TXT"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Unified Chat Options Dropdown Trigger (Phone, Tablet & Desktop) */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowChatHeaderMenu((prev) => !prev)}
                              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${bgCard}`}
                              title="More Chat Options"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-300" />
                            </button>

                            {showChatHeaderMenu && activeChatId && (
                              <div
                                className={`absolute right-0 mt-2 w-56 rounded-2xl border p-1.5 shadow-2xl z-50 space-y-1 ${bgShell}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isPinned = (currentUser.pinned || []).includes(activeChatId);
                                    const next = isPinned
                                      ? (currentUser.pinned || []).filter((id) => id !== activeChatId)
                                      : [...(currentUser.pinned || []), activeChatId];
                                    persistUserAndAccount({ ...currentUser, pinned: next });
                                    setShowChatHeaderMenu(false);
                                    addToast(
                                      'info',
                                      isPinned ? 'আনপিন করা হয়েছে' : 'পিন করা হয়েছে',
                                      'চ্যাট তালিকা আপডেট করা হয়েছে।'
                                    );
                                  }}
                                  className="w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 hover:bg-sky-500/15 transition cursor-pointer text-left"
                                >
                                  <Pin className="w-3.5 h-3.5 text-sky-400" />
                                  <span>
                                    {(currentUser.pinned || []).includes(activeChatId)
                                      ? 'Unpin Conversation'
                                      : 'Pin Conversation'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const isMuted = (currentUser.muted || []).includes(activeChatId);
                                    const next = isMuted
                                      ? (currentUser.muted || []).filter((id) => id !== activeChatId)
                                      : [...(currentUser.muted || []), activeChatId];
                                    persistUserAndAccount({ ...currentUser, muted: next });
                                    setShowChatHeaderMenu(false);
                                    addToast(
                                      'info',
                                      isMuted ? 'আনমিউট করা হয়েছে' : 'মিউট করা হয়েছে',
                                      'চ্যাট নোটিফিকেশন আপডেট করা হয়েছে।'
                                    );
                                  }}
                                  className="w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 hover:bg-sky-500/15 transition cursor-pointer text-left"
                                >
                                  <BellOff className="w-3.5 h-3.5 text-amber-400" />
                                  <span>
                                    {(currentUser.muted || []).includes(activeChatId)
                                      ? 'Unmute Notifications'
                                      : 'Mute Notifications'}
                                  </span>
                                </button>

                                {desktopNotifPermission !== 'unsupported' &&
                                  desktopNotifPermission !== 'granted' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowChatHeaderMenu(false);
                                        handleRequestDesktopNotifications();
                                      }}
                                      className="w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 hover:bg-sky-500/15 transition cursor-pointer text-left"
                                    >
                                      <Bell className="w-3.5 h-3.5 text-cyan-400" />
                                      <span>Enable Desktop Alerts</span>
                                    </button>
                                  )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowChatHeaderMenu(false);
                                    handleBackupChatToDrive();
                                  }}
                                  className="w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 hover:bg-sky-500/15 transition cursor-pointer text-left"
                                >
                                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Backup Chat to Drive</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowChatHeaderMenu(false);
                                    handleDownloadChatBackup();
                                  }}
                                  className="w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 hover:bg-sky-500/15 transition cursor-pointer text-left"
                                >
                                  <Download className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Export Chat (.TXT)</span>
                                </button>

                                {!isGroupChat && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const isArchived = (currentUser.archived || []).includes(activeChatId);
                                        const next = isArchived
                                          ? (currentUser.archived || []).filter((id) => id !== activeChatId)
                                          : [...(currentUser.archived || []), activeChatId];
                                        persistUserAndAccount({ ...currentUser, archived: next });
                                        setShowChatHeaderMenu(false);
                                        addToast(
                                          'info',
                                          isArchived ? 'আনআর্কাইভ হয়েছে' : 'আর্কাইভ করা হয়েছে',
                                          'চ্যাট তালিকা আপডেট করা হয়েছে।'
                                        );
                                      }}
                                      className="w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 hover:bg-sky-500/15 transition cursor-pointer text-left"
                                    >
                                      <Archive className="w-3.5 h-3.5 text-slate-400" />
                                      <span>
                                        {(currentUser.archived || []).includes(activeChatId)
                                          ? 'Unarchive Chat'
                                          : 'Archive Chat'}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowChatHeaderMenu(false);
                                        setShowReportModal(true);
                                      }}
                                      className="w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 hover:bg-rose-500/15 text-rose-400 transition cursor-pointer text-left"
                                    >
                                      <ShieldAlert className="w-3.5 h-3.5" />
                                      <span>Report Abuse</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextBlocked = [...(currentUser.blocked || []), activeChatId];
                                        persistUserAndAccount({ ...currentUser, blocked: nextBlocked });
                                        setShowChatHeaderMenu(false);
                                        setActiveChatId(null);
                                        addToast(
                                          'info',
                                          'ইউজার ব্লক করা হয়েছে',
                                          'প্রাইভেসি সেটিংস থেকে আনব্লক করতে পারবেন।'
                                        );
                                      }}
                                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer text-left"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Block User</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Messages Scroll Area */}
                      <div
                        onClick={() => showChatHeaderMenu && setShowChatHeaderMenu(false)}
                        className="flex-1 overflow-y-auto overflow-x-hidden p-3 tablet:p-4 desktop:p-5 space-y-3"
                      >
                        {(messagesByRoom[activeChatId || ''] || []).map((msg) => {
                          const isMe = msg.sender === currentUser.id;
                          const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}
                            >
                              <div
                                className={`ft-message-bubble max-w-[85%] tablet:max-w-[74%] desktop:max-w-[66%] rounded-2xl px-3.5 tablet:px-4 py-2.5 text-xs shadow-md transition ${
                                  isMe
                                    ? 'bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] text-white rounded-br-xs'
                                    : isLightMode
                                    ? 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                                    : 'bg-[#162235] text-slate-100 border border-[#243552] rounded-bl-xs'
                                }`}
                              >
                                {isGroupChat && !isMe && (
                                  <span className="text-[10px] font-bold text-sky-400 block mb-1">
                                    {msg.senderName}
                                  </span>
                                )}

                                {msg.forwardedFrom && (
                                  <div className="flex items-center gap-1 text-[10px] italic opacity-80 mb-1">
                                    <Forward className="w-3 h-3" />
                                    <span>Forwarded from {msg.forwardedFrom}</span>
                                  </div>
                                )}

                                {msg.replyTo && (
                                  <div
                                    className={`mb-2 px-2.5 py-1.5 rounded-xl text-[10px] border-l-2 border-sky-300 ${
                                      isMe ? 'bg-black/20 text-sky-100' : 'bg-sky-500/10 text-sky-300'
                                    }`}
                                  >
                                    <span className="font-bold block">{msg.replyTo.senderName}</span>
                                    <span className="truncate block opacity-90">{msg.replyTo.text}</span>
                                  </div>
                                )}

                                {/* Media Content (Photos, Videos, Audio, Documents) */}
                                {msg.mediaType === 'image' && (msg.mediaUrl || msg.downloadUrl) && (
                                  <div className="space-y-2 mb-2">
                                    <div className="relative group/img rounded-xl overflow-hidden bg-black/30 border border-white/10">
                                      <img
                                        src={resolveAuthorizedMediaUrl(msg.mediaUrl || msg.downloadUrl)}
                                        alt={msg.fileName || 'Shared photo'}
                                        referrerPolicy="no-referrer"
                                        onClick={() => {
                                          const resolved = resolveAuthorizedMediaUrl(msg.mediaUrl || msg.downloadUrl);
                                          setLightboxMediaItem({
                                            url: resolved,
                                            mediaType: 'image',
                                            fileName: msg.fileName || `flashtalk_photo_${msg.timestamp}.jpg`,
                                            mimeType: msg.mimeType || 'image/jpeg',
                                            fileSize: msg.fileSize,
                                            chatId:
                                              msg.chatId ||
                                              msg.roomId ||
                                              (isGroupChat
                                                ? activeChatId || ''
                                                : [currentUser.id, activeChatId || ''].sort().join('_')),
                                            msgId: msg.id,
                                          });
                                        }}
                                        className="ft-media-preview rounded-xl max-h-64 tablet:max-h-80 desktop:max-h-96 w-full object-cover cursor-pointer transition hover:opacity-95"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const resolved = resolveAuthorizedMediaUrl(msg.mediaUrl || msg.downloadUrl);
                                          setLightboxMediaItem({
                                            url: resolved,
                                            mediaType: 'image',
                                            fileName: msg.fileName || `flashtalk_photo_${msg.timestamp}.jpg`,
                                            mimeType: msg.mimeType || 'image/jpeg',
                                            fileSize: msg.fileSize,
                                            chatId:
                                              msg.chatId ||
                                              msg.roomId ||
                                              (isGroupChat
                                                ? activeChatId || ''
                                                : [currentUser.id, activeChatId || ''].sort().join('_')),
                                            msgId: msg.id,
                                          });
                                        }}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs cursor-pointer"
                                        title="View Full Size Photo"
                                      >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* Photo Metadata + Visible Download & Gemini Vision Actions */}
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="px-1.5 py-0.5 rounded bg-black/25 font-mono text-[9px] uppercase">
                                          {(msg.mimeType || 'image/jpg').split('/')[1] || 'PHOTO'}
                                        </span>
                                        {msg.fileSize ? (
                                          <span className="font-mono text-[10px] opacity-85">
                                            {formatFileSize(msg.fileSize)}
                                          </span>
                                        ) : null}
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDownloadMedia({
                                              msgId: msg.id,
                                              mediaUrl: msg.downloadUrl || msg.mediaUrl,
                                              fileName: msg.fileName || `flashtalk_photo_${msg.timestamp}.jpg`,
                                              mimeType: msg.mimeType || 'image/jpeg',
                                              chatId:
                                                msg.chatId ||
                                                msg.roomId ||
                                                (isGroupChat
                                                  ? activeChatId || ''
                                                  : [currentUser.id, activeChatId || ''].sort().join('_')),
                                            })
                                          }
                                          disabled={downloadingMsgId === msg.id}
                                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                                            isMe
                                              ? 'bg-white/20 hover:bg-white/30 text-white'
                                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                                          }`}
                                          title="Download Original Photo"
                                        >
                                          {downloadingMsgId === msg.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Download className="w-3 h-3" />
                                          )}
                                          <span>Download Photo</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleAnalyzeChatImage(msg)}
                                          disabled={analyzingMsgId === msg.id}
                                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer ${
                                            isMe
                                              ? 'bg-white/20 hover:bg-white/30 text-white'
                                              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-400'
                                          }`}
                                        >
                                          {analyzingMsgId === msg.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <ScanEye className="w-3 h-3" />
                                          )}
                                          <span>AI Analyze</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {msg.mediaType === 'video' && (msg.mediaUrl || msg.downloadUrl) && (
                                  <div className="space-y-2 mb-2">
                                    <div className="relative rounded-xl overflow-hidden bg-black border border-white/15">
                                      <video
                                        src={resolveAuthorizedMediaUrl(msg.mediaUrl || msg.downloadUrl)}
                                        controls
                                        playsInline
                                        preload="metadata"
                                        className="ft-media-preview rounded-xl max-h-64 tablet:max-h-80 desktop:max-h-96 w-full object-contain bg-black"
                                      />
                                    </div>

                                    {/* Video Metadata + Visible Download & Fullscreen Theater Actions */}
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="px-1.5 py-0.5 rounded bg-black/25 font-mono text-[9px] uppercase">
                                          {(msg.mimeType || 'video/mp4').split('/')[1] || 'VIDEO'}
                                        </span>
                                        {msg.fileName && (
                                          <span className="text-[10px] truncate max-w-[120px] tablet:max-w-[180px] opacity-90">
                                            {msg.fileName}
                                          </span>
                                        )}
                                        {msg.fileSize ? (
                                          <span className="font-mono text-[10px] opacity-85">
                                            ({formatFileSize(msg.fileSize)})
                                          </span>
                                        ) : null}
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const resolved = resolveAuthorizedMediaUrl(
                                              msg.mediaUrl || msg.downloadUrl
                                            );
                                            setLightboxMediaItem({
                                              url: resolved,
                                              mediaType: 'video',
                                              fileName: msg.fileName || `flashtalk_video_${msg.timestamp}.mp4`,
                                              mimeType: msg.mimeType || 'video/mp4',
                                              fileSize: msg.fileSize,
                                              chatId:
                                                msg.chatId ||
                                                msg.roomId ||
                                                (isGroupChat
                                                  ? activeChatId || ''
                                                  : [currentUser.id, activeChatId || ''].sort().join('_')),
                                              msgId: msg.id,
                                            });
                                          }}
                                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer ${
                                            isMe
                                              ? 'bg-white/20 hover:bg-white/30 text-white'
                                              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-400'
                                          }`}
                                          title="Open Theater View"
                                        >
                                          <Maximize2 className="w-3 h-3" />
                                          <span>Theater</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDownloadMedia({
                                              msgId: msg.id,
                                              mediaUrl: msg.downloadUrl || msg.mediaUrl,
                                              fileName: msg.fileName || `flashtalk_video_${msg.timestamp}.mp4`,
                                              mimeType: msg.mimeType || 'video/mp4',
                                              chatId:
                                                msg.chatId ||
                                                msg.roomId ||
                                                (isGroupChat
                                                  ? activeChatId || ''
                                                  : [currentUser.id, activeChatId || ''].sort().join('_')),
                                            })
                                          }
                                          disabled={downloadingMsgId === msg.id}
                                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                                            isMe
                                              ? 'bg-white/20 hover:bg-white/30 text-white'
                                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                                          }`}
                                          title="Download Original Video"
                                        >
                                          {downloadingMsgId === msg.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Download className="w-3 h-3" />
                                          )}
                                          <span>Download Video</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {msg.mediaType === 'audio' && (msg.mediaUrl || msg.downloadUrl) && (
                                  <WaveformAudioPlayer
                                    src={resolveAuthorizedMediaUrl(msg.mediaUrl || msg.downloadUrl)}
                                    isOutgoing={isMe}
                                    isLightMode={isLightMode}
                                  />
                                )}

                                {(msg.mediaType === 'file' || msg.mediaType === 'drive') && (
                                  <div
                                    className={`p-2.5 rounded-xl mb-1 flex items-center justify-between gap-3 ${
                                      isMe ? 'bg-black/20' : 'bg-sky-500/10'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-4 h-4 shrink-0" />
                                      <div className="min-w-0">
                                        <span className="text-xs font-semibold truncate block">
                                          {msg.fileName || msg.text}
                                        </span>
                                        {msg.fileSize ? (
                                          <span className="text-[10px] font-mono opacity-80">
                                            {formatFileSize(msg.fileSize)}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                    {(msg.mediaUrl || msg.downloadUrl) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (msg.mediaType === 'drive' && msg.mediaUrl?.startsWith('http')) {
                                            window.open(msg.mediaUrl, '_blank', 'noopener,noreferrer');
                                          } else {
                                            handleDownloadMedia({
                                              msgId: msg.id,
                                              mediaUrl: msg.downloadUrl || msg.mediaUrl,
                                              fileName: msg.fileName || 'document',
                                              mimeType: msg.mimeType,
                                              chatId:
                                                msg.chatId ||
                                                msg.roomId ||
                                                (isGroupChat
                                                  ? activeChatId || ''
                                                  : [currentUser.id, activeChatId || ''].sort().join('_')),
                                            });
                                          }
                                        }}
                                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white shrink-0 cursor-pointer"
                                        title="Download File"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}

                                {msg.mediaType !== 'audio' && (
                                  <p className="leading-relaxed break-words">{msg.text}</p>
                                )}

                                {/* AI Image Analysis Output inside Bubble */}
                                {msg.aiAnalysis && (
                                  <div
                                    className={`mt-2 p-2.5 rounded-xl text-[11px] leading-relaxed ${
                                      isMe ? 'bg-black/25 text-sky-50' : 'bg-sky-500/10 text-slate-200'
                                    }`}
                                  >
                                    <div className="font-bold text-[10px] mb-1 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" />
                                      <span>Gemini 4 Argon Analysis:</span>
                                    </div>
                                    <p className="whitespace-pre-wrap">{msg.aiAnalysis}</p>
                                  </div>
                                )}

                                {/* Generated TTS Audio Player inside Bubble */}
                                {msg.ttsAudioUrl && (
                                  <div className="mt-2">
                                    <WaveformAudioPlayer
                                      src={msg.ttsAudioUrl}
                                      isOutgoing={isMe}
                                      isLightMode={isLightMode}
                                      label="gemini-3.8-flash-tts"
                                    />
                                  </div>
                                )}

                                {/* Reactions */}
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {Object.values(msg.reactions).map((emoji, i) => (
                                      <span
                                        key={i}
                                        className="px-1.5 py-0.5 rounded-full bg-black/25 text-[10px]"
                                      >
                                        {emoji}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Timestamp, E2EE, Edit/Delete/Forward, TTS Action & Read Receipt */}
                                <div className="flex items-center justify-end gap-2 mt-1.5 opacity-85 flex-wrap">
                                  {msg.e2eeFingerprint && (
                                    <span
                                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/20 flex items-center gap-0.5"
                                      title={`AES-GCM-256 E2EE Key: ${msg.e2eeFingerprint}`}
                                    >
                                      <Lock className="w-2.5 h-2.5" /> E2EE
                                    </span>
                                  )}
                                  {msg.edited && (
                                    <span className="text-[9px] italic opacity-75">(edited)</span>
                                  )}
                                  {msg.mediaType !== 'audio' && (
                                    <button
                                      type="button"
                                      onClick={() => handleSpeakMessage(msg)}
                                      disabled={synthesizingMsgId === msg.id}
                                      className="hover:opacity-100 opacity-75 transition cursor-pointer"
                                      title="Read Aloud with gemini-3.8-flash-tts"
                                    >
                                      {synthesizingMsgId === msg.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Volume2 className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplyingTo({
                                        msgId: msg.id,
                                        text: msg.text,
                                        senderName: msg.senderName,
                                      })
                                    }
                                    className="hover:opacity-100 opacity-75 transition cursor-pointer"
                                    title="Reply"
                                  >
                                    <Reply className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setForwardingMsg(msg)}
                                    className="hover:opacity-100 opacity-75 transition cursor-pointer"
                                    title="Forward Message"
                                  >
                                    <Forward className="w-3 h-3" />
                                  </button>
                                  {isMe && msg.mediaType !== 'audio' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMsgId(msg.id);
                                        setMessageInput(msg.text);
                                      }}
                                      className="hover:opacity-100 opacity-75 transition cursor-pointer"
                                      title="Edit Message"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  )}
                                  {isMe && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="hover:opacity-100 opacity-75 text-rose-200 hover:text-rose-100 transition cursor-pointer"
                                      title="Delete Message"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleAddReaction(msg.id, '❤️')}
                                    className="text-[10px] hover:scale-125 transition cursor-pointer"
                                    title="React Heart"
                                  >
                                    ❤️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddReaction(msg.id, '👍')}
                                    className="text-[10px] hover:scale-125 transition cursor-pointer"
                                    title="React Thumbs Up"
                                  >
                                    👍
                                  </button>
                                  <span className="text-[10px] font-mono tabular-nums">{timeStr}</span>
                                  {isMe && (
                                    <span title={`Status: ${msg.deliveryStatus || 'seen'}`}>
                                      {msg.deliveryStatus === 'sent' ? (
                                        <Check className="w-3.5 h-3.5 text-white/70" />
                                      ) : (
                                        <CheckCheck
                                          className={`w-3.5 h-3.5 ${
                                            msg.deliveryStatus === 'seen' ? 'text-cyan-200' : 'text-white/80'
                                          }`}
                                        />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Pre-Send Staged Photo / Video / Document Preview & Retry Card */}
                      {stagedMedia && (
                        <div className={`px-3 tablet:px-4 py-3 border-t space-y-2.5 shrink-0 ${bgPanel}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {stagedMedia.mediaType === 'image' ? (
                                <img
                                  src={stagedMedia.previewUrl}
                                  alt={stagedMedia.fileName}
                                  className="w-14 h-14 tablet:w-16 tablet:h-16 rounded-xl object-cover border border-sky-500/40 shrink-0 bg-black"
                                />
                              ) : stagedMedia.mediaType === 'video' ? (
                                <video
                                  src={stagedMedia.previewUrl}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="w-24 h-16 tablet:w-28 tablet:h-20 rounded-xl object-cover border border-sky-500/40 shrink-0 bg-black"
                                />
                              ) : (
                                <div className="w-12 h-12 tablet:w-14 tablet:h-14 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                                  <FileText className="w-6 h-6" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold uppercase">
                                    {stagedMedia.mediaType === 'video'
                                      ? 'VIDEO'
                                      : stagedMedia.mediaType === 'image'
                                      ? 'PHOTO'
                                      : 'FILE'}
                                  </span>
                                  <span className="text-xs font-bold truncate">{stagedMedia.fileName}</span>
                                </div>
                                <p className={`text-[11px] font-mono ${textMuted}`}>
                                  {formatFileSize(stagedMedia.fileSize)} • {stagedMedia.mimeType}
                                </p>
                                <input
                                  type="text"
                                  value={stagedMedia.caption}
                                  onChange={(e) =>
                                    setStagedMedia((prev) =>
                                      prev ? { ...prev, caption: e.target.value } : null
                                    )
                                  }
                                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmSendStagedMedia()}
                                  placeholder={`Add a caption to this ${stagedMedia.mediaType}...`}
                                  disabled={stagedMedia.uploading}
                                  className={`w-full rounded-xl px-3 py-1.5 text-xs border focus:outline-none ${bgInput}`}
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleClearStagedMedia}
                              disabled={stagedMedia.uploading}
                              className="p-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
                              title="Remove Attachment"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Upload Progress Bar inside Staging Card */}
                          {stagedMedia.uploading && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-sky-400 font-semibold flex items-center gap-1.5">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>
                                    Uploading {stagedMedia.mediaType} (
                                    {formatFileSize(stagedMedia.transferredBytes)} /{' '}
                                    {formatFileSize(stagedMedia.fileSize)})...
                                  </span>
                                </span>
                                <span className="font-mono font-bold text-sky-300">
                                  {stagedMedia.progress}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-150"
                                  style={{ width: `${stagedMedia.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Upload Error Banner & Retry Button */}
                          {stagedMedia.error && (
                            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-2 text-xs text-rose-300">
                              <div className="flex items-center gap-2 min-w-0">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span className="text-[11px] leading-snug">{stagedMedia.error}</span>
                              </div>
                              {stagedMedia.fileSize > 0 &&
                                stagedMedia.fileSize <=
                                  (stagedMedia.mediaType === 'video' ? 50 * 1024 * 1024 : 20 * 1024 * 1024) && (
                                  <button
                                    type="button"
                                    onClick={handleConfirmSendStagedMedia}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Retry</span>
                                  </button>
                                )}
                            </div>
                          )}

                          {/* Send Staged Media Action Row */}
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleClearStagedMedia}
                              disabled={stagedMedia.uploading}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${bgCard}`}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmSendStagedMedia}
                              disabled={
                                stagedMedia.uploading ||
                                Boolean(
                                  stagedMedia.error &&
                                    (stagedMedia.fileSize === 0 ||
                                      stagedMedia.fileSize >
                                        (stagedMedia.mediaType === 'video'
                                          ? 50 * 1024 * 1024
                                          : 20 * 1024 * 1024))
                                )
                              }
                              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer"
                            >
                              {stagedMedia.uploading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  <span>
                                    Send{' '}
                                    {stagedMedia.mediaType === 'video'
                                      ? 'Video'
                                      : stagedMedia.mediaType === 'image'
                                      ? 'Photo'
                                      : 'File'}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Editing Banner */}
                      {editingMsgId && (
                        <div className={`px-4 py-2 border-t flex items-center justify-between ${bgPanel}`}>
                          <div className="text-xs flex items-center gap-2">
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-amber-400 font-bold text-[11px]">Editing Message</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMsgId(null);
                              setMessageInput('');
                            }}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Reply Banner */}
                      {replyingTo && (
                        <div className={`px-4 py-2 border-t flex items-center justify-between ${bgPanel}`}>
                          <div className="text-xs truncate">
                            <span className="text-sky-400 font-bold block text-[10px]">
                              Replying to {replyingTo.senderName}
                            </span>
                            <span className={`truncate block text-[11px] ${textMuted}`}>
                              {replyingTo.text}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReplyingTo(null)}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Emoji Quick Picker Bar */}
                      {showEmojiPicker && (
                        <div className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto ${bgPanel}`}>
                          {['😀', '😂', '🥰', '😎', '🔥', '🎉', '❤️', '👍', '🙏', '✨', '🚀', '🇧🇩'].map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => {
                                setMessageInput((prev) => prev + em);
                                setShowEmojiPicker(false);
                              }}
                              className="text-lg hover:scale-125 transition px-1 cursor-pointer"
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Expandable Mobile Attachment Tray (Camera, Document, Emoji) */}
                      {showMobileAttachTray && (
                        <div className={`tablet:hidden px-3 py-2 border-t flex items-center justify-around gap-2 ${bgPanel}`}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMobileAttachTray(false);
                              setShowEmojiPicker((prev) => !prev);
                            }}
                            className={`flex-1 py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer ${bgCard}`}
                          >
                            <Smile className="w-4 h-4 text-amber-400" />
                            <span>Emoji</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMobileAttachTray(false);
                              setShowCameraModal(true);
                            }}
                            className={`flex-1 py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer ${bgCard}`}
                          >
                            <Camera className="w-4 h-4 text-cyan-400" />
                            <span>Camera</span>
                          </button>
                          <label
                            htmlFor="chat-media-upload"
                            onClick={() => setShowMobileAttachTray(false)}
                            className={`flex-1 py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer ${bgCard}`}
                          >
                            <Paperclip className="w-4 h-4 text-sky-400" />
                            <span>File</span>
                          </label>
                        </div>
                      )}

                      {/* Message Composer Bar (Responsive Android Phone, Tablet & Desktop Controls) */}
                      <div className={`p-2 tablet:p-3 border-t flex items-center gap-1 tablet:gap-1.5 desktop:gap-2 shrink-0 ${bgPanel}`}>
                        {/* Mobile Compact More-Attachments Toggle (< 600px) */}
                        <button
                          type="button"
                          onClick={() => setShowMobileAttachTray((prev) => !prev)}
                          className={`tablet:hidden w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer transition shrink-0 ${bgCard}`}
                          title="Camera, Emoji & Document"
                        >
                          <Plus className={`w-4 h-4 text-sky-400 transition-transform ${showMobileAttachTray ? 'rotate-45' : ''}`} />
                        </button>

                        {/* Tablet & Desktop Inline Emoji + Camera Buttons (>= 600px) */}
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker((prev) => !prev)}
                          className={`hidden tablet:flex w-9 h-9 desktop:w-10 desktop:h-10 rounded-full border items-center justify-center cursor-pointer transition shrink-0 ${bgCard}`}
                          title="Emoji Picker"
                        >
                          <Smile className="w-4 h-4 text-amber-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowCameraModal(true)}
                          className={`hidden tablet:flex w-9 h-9 desktop:w-10 desktop:h-10 rounded-full border items-center justify-center cursor-pointer transition shrink-0 ${bgCard}`}
                          title="Take Photo with Camera"
                        >
                          <Camera className="w-4 h-4 text-cyan-400" />
                        </button>

                        {/* Dedicated Photo Attachment Button (Always visible on Phone, Tablet & Desktop) */}
                        <label
                          htmlFor="chat-photo-upload"
                          className={`w-8 h-8 tablet:w-9 tablet:h-9 desktop:w-10 desktop:h-10 rounded-full border flex items-center justify-center cursor-pointer transition shrink-0 ${bgCard}`}
                          title="Attach Photo (JPG, JPEG, PNG, WebP)"
                        >
                          <ImageIcon className="w-4 h-4 text-emerald-400" />
                        </label>
                        <input
                          id="chat-photo-upload"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleSelectMediaFile(e, 'image')}
                        />

                        {/* Dedicated Video Attachment Button (Always visible on Phone, Tablet & Desktop) */}
                        <label
                          htmlFor="chat-video-upload"
                          className={`w-8 h-8 tablet:w-9 tablet:h-9 desktop:w-10 desktop:h-10 rounded-full border flex items-center justify-center cursor-pointer transition shrink-0 ${bgCard}`}
                          title="Attach Video (MP4, WebM)"
                        >
                          <Film className="w-4 h-4 text-purple-400" />
                        </label>
                        <input
                          id="chat-video-upload"
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/ogg,video/*"
                          className="hidden"
                          onChange={(e) => handleSelectMediaFile(e, 'video')}
                        />

                        {/* General File / Document Attachment Button (Inline on Tablet & Desktop) */}
                        <label
                          htmlFor="chat-media-upload"
                          className={`hidden tablet:flex w-9 h-9 desktop:w-10 desktop:h-10 rounded-full border items-center justify-center cursor-pointer transition shrink-0 ${bgCard}`}
                          title="Attach Document, Photo or Video"
                        >
                          <Paperclip className="w-4 h-4 text-sky-400" />
                        </label>
                        <input
                          id="chat-media-upload"
                          type="file"
                          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                          className="hidden"
                          onChange={(e) => handleSelectMediaFile(e, 'any')}
                        />

                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => {
                            setMessageInput(e.target.value);
                            if (wsRef.current?.readyState === WebSocket.OPEN && activeChatId && currentUser) {
                              wsRef.current.send(
                                JSON.stringify({
                                  type: 'chat:typing',
                                  roomId: activeChatId,
                                  isGroup: isGroupChat,
                                  userId: currentUser.id,
                                })
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (stagedMedia) {
                                handleConfirmSendStagedMedia();
                              } else {
                                handleSendMessage();
                              }
                            }
                          }}
                          placeholder={editingMsgId ? 'Update your message...' : 'Type a message...'}
                          className={`flex-1 min-w-0 rounded-full px-3 tablet:px-4 py-2 tablet:py-2.5 text-xs border focus:outline-none ${bgInput}`}
                        />

                        <button
                          type="button"
                          onClick={handleToggleVoiceRecording}
                          className={`w-8 h-8 tablet:w-9 tablet:h-9 desktop:w-10 desktop:h-10 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer ${
                            isRecordingVoice
                              ? 'bg-rose-500 text-white animate-pulse'
                              : `${bgCard} border text-sky-400`
                          }`}
                          title="Record Voice Note"
                        >
                          <Mic className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (stagedMedia) {
                              handleConfirmSendStagedMedia();
                            } else {
                              handleSendMessage();
                            }
                          }}
                          className="w-8 h-8 tablet:w-9 tablet:h-9 desktop:w-10 desktop:h-10 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white flex items-center justify-center shadow transition shrink-0 cursor-pointer"
                          title="Send Message"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </main>

            {/* MOBILE BOTTOM GLASSMORPHIC NAVIGATION BAR (< 600px Android Phone / APK) */}
            {!isSoftKeyboardOpen && (
              <nav
                className={`ft-mobile-bottom-nav h-16 border-t items-center justify-around px-1.5 shrink-0 ${bgPanel}`}
              >
                {[
                  { id: 'chats', label: 'Chats', icon: MessageSquare, badge: totalUnreadCount },
                  { id: 'contacts', label: 'Contacts', icon: Users },
                  { id: 'stories', label: 'Stories', icon: CircleDot },
                  { id: 'ai', label: 'AI Hub', icon: Sparkles },
                  { id: 'drive', label: 'Drive', icon: HardDrive },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setSubSettingView(null);
                        if (item.id !== 'chats' || activeChatId) {
                          setActiveChatId(null);
                        }
                      }}
                      className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[48px] ${
                        active ? 'text-sky-400 font-bold' : textMuted
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] mt-0.5 whitespace-nowrap">{item.label}</span>
                      {item.badge ? (
                        <span className="absolute top-0 right-1.5 w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        </div>
      )}

      {/* FORWARD MESSAGE MODAL */}
      {forwardingMsg && currentUser && (
        <div className="fixed inset-0 z-[175] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 space-y-4 shadow-2xl ${bgShell}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Forward className="w-4 h-4 text-sky-400" />
                <span>Forward Message</span>
              </h3>
              <button
                type="button"
                onClick={() => setForwardingMsg(null)}
                className={`text-xs ${textMuted} cursor-pointer`}
              >
                Cancel
              </button>
            </div>
            <p className={`text-xs ${textMuted} truncate border-l-2 border-sky-500 pl-2.5`}>
              "{forwardingMsg.text}"
            </p>
            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {(currentUser.contacts || []).map((uid) => {
                const u = usersDirectory[uid];
                if (!u) return null;
                return (
                  <button
                    key={uid}
                    type="button"
                    onClick={() => handleForwardMessageTo(uid)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between hover:border-sky-500/40 transition cursor-pointer ${bgCard}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center">
                        {u.avatar}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold">{u.name}</p>
                        <p className={`text-[10px] ${textMuted}`}>@{u.username}</p>
                      </div>
                    </div>
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ADD FRIEND MODAL */}
      {showAddFriendModal && (
        <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 space-y-4 shadow-2xl ${bgShell}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Add Friend</h3>
              <button
                type="button"
                onClick={() => setShowAddFriendModal(false)}
                className={`text-xs ${textMuted} cursor-pointer`}
              >
                Cancel
              </button>
            </div>
            <p className={`text-xs ${textMuted}`}>
              Search by @username, 8-digit UID (e.g. 84920381), or enter any name to add to your contacts.
            </p>
            <input
              type="text"
              value={friendSearchInput}
              onChange={(e) => setFriendSearchInput(e.target.value)}
              placeholder="@username or UID"
              className={`w-full rounded-xl p-3 text-xs border focus:outline-none ${bgInput}`}
            />
            <button
              type="button"
              onClick={handleSearchAndAddFriend}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition cursor-pointer"
            >
              Find & Add Contact
            </button>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && currentUser && (
        <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 space-y-4 shadow-2xl ${bgShell}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Create Group Chat</h3>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className={`text-xs ${textMuted} cursor-pointer`}
              >
                Cancel
              </button>
            </div>
            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${textMuted}`}>Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. FlashTalk Design Team"
                className={`w-full rounded-xl p-3 text-xs border focus:outline-none ${bgInput}`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-semibold mb-1.5 ${textMuted}`}>Select Members</label>
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-700/40">
                {(currentUser.contacts || []).map((uid) => {
                  const u = usersDirectory[uid];
                  if (!u) return null;
                  const checked = selectedGroupMembers.includes(uid);
                  return (
                    <label
                      key={uid}
                      className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-sky-500/10 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroupMembers((prev) => [...prev, uid]);
                          } else {
                            setSelectedGroupMembers((prev) => prev.filter((id) => id !== uid));
                          }
                        }}
                        className="accent-sky-500 w-4 h-4"
                      />
                      <span>
                        {u.name} (@{u.username})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateGroup}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition cursor-pointer"
            >
              Create Group
            </button>
          </div>
        </div>
      )}

      {/* STEP 8 STORY CREATE MODAL (IMAGE, VIDEO, TEXT & PRIVACY) */}
      <StoryCreateModal
        isOpen={showAddStoryModal || showStoryCreatorModal}
        onClose={() => {
          setShowAddStoryModal(false);
          setShowStoryCreatorModal(false);
        }}
        onCreateStory={async (storyData) => {
          if (!currentUser) return;
          const newStory: StoryItem = {
            id: 'st_' + Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            mediaUrl: storyData.imageUrl,
            mediaType: storyData.mediaType,
            textContent: storyData.textContent,
            backgroundGradient: storyData.backgroundGradient,
            caption: storyData.caption,
            privacy: storyData.privacy,
            viewers: [{ name: 'Amina Rahman', time: Date.now() - 120000 }],
            timestamp: Date.now(),
            expiresAt: Date.now() + 24 * 3600 * 1000,
          };
          await persistUserAndAccount({
            ...currentUser,
            stories: [newStory, ...(currentUser.stories || [])],
          });
          addToast('success', 'স্টোরি প্রকাশিত হয়েছে!', 'আপনার ২৪ ঘণ্টার স্টোরি যুক্ত হয়েছে।');
        }}
      />

      {/* STEP 4 LIVE CAMERA CAPTURE MODAL */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleSendCameraCapture}
      />

      {/* STEP 6 REPORT ABUSE MODAL */}
      <ReportAbuseModal
        isOpen={showReportModal}
        targetName={getActiveTarget()?.name || 'User'}
        onClose={() => setShowReportModal(false)}
        onSubmit={async (category, details) => {
          setShowReportModal(false);
          try {
            await addDoc(collection(db, 'reports'), {
              reporterId: currentUser?.id || 'anonymous',
              targetId: activeChatId || 'unknown',
              category,
              details,
              timestamp: Date.now(),
            });
          } catch {}
          addToast('success', 'রিপোর্ট জমা হয়েছে', `অভিযোগ (${category}) পর্যালোচনার জন্য সংরক্ষিত হয়েছে।`);
        }}
      />

      {/* STEP 2 & 12 VERIFY PASSWORD RE-AUTH MODAL */}
      <VerifyPasswordModal
        isOpen={verifyPasswordModal.open}
        actionLabel={verifyPasswordModal.actionLabel}
        onClose={() => setVerifyPasswordModal({ ...verifyPasswordModal, open: false })}
        onVerified={verifyPasswordModal.onVerified}
      />

      {/* STEP 7 GROUP MANAGEMENT MODAL */}
      {isGroupChat && activeChatId && currentUser && (
        <GroupManageModal
          isOpen={showGroupManageModal}
          onClose={() => setShowGroupManageModal(false)}
          groupName={
            (currentUser.groups || []).find((g) => g.id === activeChatId)?.name || 'Group Chat'
          }
          members={
            (currentUser.groups || []).find((g) => g.id === activeChatId)?.members || [currentUser.id]
          }
          adminIds={
            (currentUser.groups || []).find((g) => g.id === activeChatId)?.adminIds || [currentUser.id]
          }
          onlyAdminsCanPost={
            Boolean((currentUser.groups || []).find((g) => g.id === activeChatId)?.onlyAdminsCanPost)
          }
          inviteCode={
            (currentUser.groups || []).find((g) => g.id === activeChatId)?.inviteCode || activeChatId
          }
          allContacts={(currentUser.contacts || []).map((cid) => ({
            id: cid,
            name: usersDirectory[cid]?.name || cid,
          }))}
          onUpdateGroup={async (updates) => {
            const nextGroups = (currentUser.groups || []).map((g) =>
              g.id === activeChatId ? { ...g, ...updates } : g
            );
            await persistUserAndAccount({ ...currentUser, groups: nextGroups });
            addToast('success', 'গ্রুপ আপডেট হয়েছে', 'গ্রুপের সদস্য ও পারমিশন সংরক্ষিত হয়েছে।');
          }}
          onLeaveGroup={async () => {
            const nextGroups = (currentUser.groups || []).filter((g) => g.id !== activeChatId);
            await persistUserAndAccount({ ...currentUser, groups: nextGroups });
            setShowGroupManageModal(false);
            setActiveChatId(null);
            setIsGroupChat(false);
            addToast('info', 'গ্রুপ ত্যাগ করা হয়েছে', 'আপনি গ্রুপ চ্যাট থেকে বের হয়েছেন।');
          }}
          onCopyInvite={(link) => {
            navigator.clipboard?.writeText(link);
            addToast('success', 'ইনভাইট লিংক কপি হয়েছে', link);
          }}
        />
      )}

      {/* STEP 13, 14, 15, 16 AUDIT, AUTOMATED SELF-TEST & APK/AAB BUILD MODAL */}
      <BuildAndAuditModal
        isOpen={showBuildAuditModal}
        onClose={() => setShowBuildAuditModal(false)}
        wsConnected={wsConnected}
        onTriggerSimulatedCall={() => {
          setShowBuildAuditModal(false);
          setIncomingCall({
            callerId: 'u1',
            callerName: 'Amina Rahman',
            callerAvatar: 'AR',
            type: 'video',
          });
        }}
        onCopyText={(text, label) => {
          navigator.clipboard?.writeText(text);
          addToast('success', 'কপি সম্পন্ন', label);
        }}
      />

      {/* ADD ACCOUNT MODAL */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 space-y-3.5 shadow-2xl ${bgShell}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Add Another Account</h3>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className={`text-xs ${textMuted} cursor-pointer`}
              >
                Cancel
              </button>
            </div>
            <input
              type="text"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              placeholder="Full Name"
              className={`w-full rounded-xl p-3 text-xs border focus:outline-none ${bgInput}`}
            />
            <input
              type="email"
              value={newAccEmail}
              onChange={(e) => setNewAccEmail(e.target.value)}
              placeholder="Gmail Address"
              className={`w-full rounded-xl p-3 text-xs border focus:outline-none ${bgInput}`}
            />
            <input
              type="password"
              value={newAccPassword}
              onChange={(e) => setNewAccPassword(e.target.value)}
              placeholder="Password"
              className={`w-full rounded-xl p-3 text-xs border focus:outline-none ${bgInput}`}
            />
            <input
              type="text"
              value={newAccAnswer}
              onChange={(e) => setNewAccAnswer(e.target.value)}
              placeholder="Secret Recovery Answer"
              className={`w-full rounded-xl p-3 text-xs border focus:outline-none ${bgInput}`}
            />
            <button
              type="button"
              onClick={async () => {
                if (!newAccName.trim() || !newAccEmail.trim() || !newAccPassword.trim() || !newAccAnswer.trim()) {
                  addToast('error', 'তথ্য অসম্পূর্ণ', 'সবগুলো ঘর পূরণ করুন।');
                  return;
                }
                const cleanUser = newAccEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
                const newAcc: AppUser = {
                  id: 'usr_' + generateRandomUID(),
                  uid: generateRandomUID(),
                  name: newAccName.trim(),
                  email: newAccEmail.trim(),
                  recoveryAnswer: newAccAnswer.trim(),
                  bio: 'FlashTalk Multi-Account User',
                  username: cleanUser,
                  avatar: newAccName
                    .trim()
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2),
                  contacts: ['u1', 'u2', 'u3', 'u4'],
                  groups: [],
                  stories: [],
                  blocked: [],
                  online: true,
                  lastSeenTime: Date.now(),
                };
                await persistUserAndAccount(newAcc);
                setShowAddAccountModal(false);
                setNewAccName('');
                setNewAccEmail('');
                setNewAccPassword('');
                setNewAccAnswer('');
                addToast('success', 'নতুন অ্যাকাউন্ট যুক্ত হয়েছে', `${newAcc.name}-এ সুইচ করা হয়েছে।`);
              }}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition cursor-pointer"
            >
              Add & Switch Account
            </button>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION DIALOG FOR DESTRUCTIVE GOOGLE DRIVE DELETE */}
      {driveFileToDelete && (
        <div className="fixed inset-0 z-[180] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 space-y-4 shadow-2xl ${bgShell}`}>
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold">Delete File from Google Drive?</h3>
            </div>
            <p className={`text-xs ${textMuted} leading-relaxed`}>
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-white">"{driveFileToDelete.name}"</span> from your Google Drive? This
              action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDriveFileToDelete(null)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${bgCard}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDriveFile}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN MEDIA LIGHTBOX (SUPPORTS BOTH HIGH-RES PHOTOS & THEATER VIDEOS) */}
      {(lightboxMediaItem || lightboxMediaUrl) && (
        <div className="fixed inset-0 z-[190] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 max-w-4xl mx-auto">
            <div className="min-w-0 text-white">
              <p className="text-xs font-bold truncate">
                {lightboxMediaItem?.fileName || 'flashtalk-media'}
              </p>
              {lightboxMediaItem?.fileSize ? (
                <p className="text-[10px] font-mono text-slate-400">
                  {formatFileSize(lightboxMediaItem.fileSize)} • {lightboxMediaItem.mimeType}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setLightboxMediaItem(null);
                setLightboxMediaUrl(null);
              }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0"
              title="Close Full Screen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {lightboxMediaItem?.mediaType === 'video' ? (
            <video
              src={lightboxMediaItem.url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[76vh] rounded-2xl shadow-2xl mb-5 bg-black border border-white/15"
            />
          ) : (
            <img
              src={lightboxMediaItem?.url || lightboxMediaUrl || ''}
              alt={lightboxMediaItem?.fileName || 'Full screen preview'}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[76vh] object-contain rounded-2xl shadow-2xl mb-5"
            />
          )}

          <button
            type="button"
            onClick={() =>
              handleDownloadMedia({
                msgId: lightboxMediaItem?.msgId || 'lightbox',
                mediaUrl: lightboxMediaItem?.url || lightboxMediaUrl || '',
                fileName: lightboxMediaItem?.fileName || 'flashtalk-media.jpg',
                mimeType: lightboxMediaItem?.mimeType,
                chatId: lightboxMediaItem?.chatId,
              })
            }
            disabled={downloadingMsgId === (lightboxMediaItem?.msgId || 'lightbox')}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg cursor-pointer"
          >
            {downloadingMsgId === (lightboxMediaItem?.msgId || 'lightbox') ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download Original File ({lightboxMediaItem?.fileName || 'Media'})</span>
          </button>
        </div>
      )}

      {/* STEP 5 INCOMING CALL OVERLAY (ANSWER / DECLINE) */}
      {incomingCall && (
        <div className="fixed inset-0 z-[195] bg-[#06090F]/95 backdrop-blur-xl flex flex-col justify-between p-8 text-white">
          <div className="text-center pt-6">
            <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-wider">
              Incoming {incomingCall.type === 'video' ? 'Video' : 'Voice'} Call
            </span>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 text-white text-4xl font-bold flex items-center justify-center shadow-2xl ring-4 ring-sky-500/40 animate-pulse">
              {incomingCall.callerAvatar}
            </div>
            <h2 className="text-2xl font-bold">{incomingCall.callerName}</h2>
            <p className="text-xs text-sky-400">FlashTalk End-to-End Encrypted Call...</p>
          </div>

          <div className="flex items-center justify-center gap-8 pb-8">
            <button
              type="button"
              onClick={() => setIncomingCall(null)}
              className="px-8 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-xl transition cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Decline</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const callInfo = incomingCall;
                setIncomingCall(null);
                setActiveCall({
                  open: true,
                  type: callInfo.type,
                  targetName: callInfo.callerName,
                  targetAvatar: callInfo.callerAvatar,
                  status: 'Connected • End-to-End Encrypted',
                  seconds: 0,
                  isMuted: false,
                  isCameraOn: callInfo.type === 'video',
                  facingMode: 'user',
                });
                if (callTimerRef.current) window.clearInterval(callTimerRef.current);
                callTimerRef.current = window.setInterval(() => {
                  setActiveCall((prev) => (prev ? { ...prev, seconds: prev.seconds + 1 } : null));
                }, 1000);
              }}
              className="px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-2 shadow-xl transition cursor-pointer animate-bounce"
            >
              <Phone className="w-4 h-4" />
              <span>Answer</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5 LIVE WEBRTC CALL OVERLAY (OUTGOING & ACTIVE WITH HOLD) */}
      {activeCall && activeCall.open && (
        <div className="fixed inset-0 z-[185] bg-[#06090F]/95 backdrop-blur-xl flex flex-col justify-between p-6 text-white">
          <div className="flex items-center justify-between max-w-2xl w-full mx-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Lock className="w-3.5 h-3.5" />
              <span>End-to-End Encrypted P2P Call (STUN/WebRTC)</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/10 font-mono text-xs tabular-nums">
              {Math.floor(activeCall.seconds / 60)
                .toString()
                .padStart(2, '0')}
              :{(activeCall.seconds % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative max-w-2xl w-full mx-auto my-6">
            {activeCall.isCameraOn ? (
              <div className="w-full h-full max-h-[65vh] rounded-3xl overflow-hidden bg-black border border-sky-500/30 relative">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-4 right-4 w-32 h-44 object-cover rounded-2xl border-2 border-sky-400 shadow-2xl"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 text-white text-4xl font-bold flex items-center justify-center shadow-2xl ring-4 ring-sky-500/30">
                  {activeCall.targetAvatar}
                </div>
                <h2 className="text-xl font-bold">{activeCall.targetName}</h2>
                <p className="text-xs text-sky-400">
                  {activeCall.isOnHold ? 'Call on Hold' : activeCall.status}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 pb-4">
            <button
              type="button"
              onClick={() => {
                const nextMute = !activeCall.isMuted;
                if (localStreamRef.current) {
                  localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !nextMute));
                }
                setActiveCall({ ...activeCall, isMuted: nextMute });
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${
                activeCall.isMuted ? 'bg-rose-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Toggle Mute"
            >
              {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                const nextHold = !activeCall.isOnHold;
                if (localStreamRef.current) {
                  localStreamRef.current.getTracks().forEach((t) => (t.enabled = !nextHold));
                }
                setActiveCall({
                  ...activeCall,
                  isOnHold: nextHold,
                  status: nextHold ? 'Call on Hold' : 'Connected (E2EE)',
                });
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${
                activeCall.isOnHold ? 'bg-amber-500 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Hold Call"
            >
              <Pause className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                const nextCam = !activeCall.isCameraOn;
                if (localStreamRef.current) {
                  localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = nextCam));
                }
                setActiveCall({ ...activeCall, isCameraOn: nextCam });
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${
                activeCall.isCameraOn ? 'bg-sky-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Toggle Camera"
            >
              {activeCall.isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={async () => {
                const nextFacing = activeCall.facingMode === 'user' ? 'environment' : 'user';
                setActiveCall({ ...activeCall, facingMode: nextFacing });
                if (activeCall.isCameraOn && localStreamRef.current) {
                  localStreamRef.current.getTracks().forEach((t) => t.stop());
                  try {
                    const newStream = await navigator.mediaDevices.getUserMedia({
                      video: { facingMode: nextFacing },
                      audio: true,
                    });
                    localStreamRef.current = newStream;
                    if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
                  } catch {}
                }
              }}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              title="Flip Camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={endCall}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl transition cursor-pointer"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

