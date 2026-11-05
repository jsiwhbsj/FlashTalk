import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";

// Preserve the exact FlashTalk Firebase config from the original index.html
const flashtalkConfig = {
  apiKey: "AIzaSyBiSO7-5KYsXmmNX0CdpsqeqLyW39Z6zZ8",
  authDomain: "flashtalk-d899c.firebaseapp.com",
  projectId: "flashtalk-d899c",
  storageBucket: "flashtalk-d899c.firebasestorage.app",
  messagingSenderId: "55037200501",
  appId: "1:55037200501:web:de59469d43ff2da0f7903c",
};

const existingApp = getApps().find((a) => a.name === "flashtalk-core");
export const flashtalkApp =
  existingApp || initializeApp(flashtalkConfig, "flashtalk-core");
export const flashtalkAuth = getAuth(flashtalkApp);
export const flashtalkDb = getFirestore(flashtalkApp);

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
};

export interface FlashUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  recoveryAnswer: string;
  bio: string;
  username: string;
  avatar: string;
  photoUrl?: string | null;
  passcode?: string | null;
  contacts: string[];
  groups: FlashGroup[];
  stories: FlashStory[];
  blocked: string[];
  online: boolean;
  lastSeenTime: number;
  isLightMode?: boolean;
  chatTheme?: string;
}

export interface FlashGroup {
  id: string;
  name: string;
  avatar: string;
  members: string[];
  admin: string;
  createdAt: number;
}

export interface FlashStory {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  timestamp: number;
}

export interface FlashMessage {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  timestamp: number;
  seen: boolean;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "file" | "call" | "drive";
  fileName?: string;
  fileSize?: string;
  driveLink?: string;
  replyTo?: {
    msgId: string;
    text: string;
    senderName: string;
  } | null;
  reactions?: Record<string, string>;
}

export const INITIAL_DEMO_USERS: Record<string, FlashUser> = {
  u1: {
    id: "u1",
    uid: "84920381",
    name: "Rahim Ahmed",
    email: "rahim@gmail.com",
    recoveryAnswer: "dhaka",
    bio: "Product Architect & Security Researcher",
    username: "rahim",
    avatar: "RA",
    online: true,
    lastSeenTime: Date.now() - 12000,
    contacts: ["u2"],
    groups: [],
    stories: [
      {
        id: "s_demo_1",
        userId: "u1",
        userName: "Rahim Ahmed",
        userAvatar: "RA",
        mediaUrl:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="50%" stop-color="#0369a1"/><stop offset="100%" stop-color="#1e1b4b"/></linearGradient></defs><rect width="800" height="450" fill="url(#g)"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#38bdf8" font-family="sans-serif" font-size="36" font-weight="bold">FlashTalk 2.0 + Gemini AI</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="20">End-to-End P2P &amp; Google Drive Sync Active</text></svg>`
          ),
        mediaType: "image",
        caption: "Testing the upgraded FlashTalk with Gemini AI & Google Drive backup!",
        timestamp: Date.now() - 1800000,
      },
    ],
    blocked: [],
  },
  u2: {
    id: "u2",
    uid: "59201843",
    name: "Tanvir Hossain",
    email: "tanvir@gmail.com",
    recoveryAnswer: "sylhet",
    bio: "Full-Stack Systems Engineer",
    username: "tanvir",
    avatar: "TH",
    online: false,
    lastSeenTime: Date.now() - 3600000,
    contacts: ["u1"],
    groups: [],
    stories: [],
    blocked: [],
  },
  u3: {
    id: "u3",
    uid: "73194025",
    name: "Nusrat Jahan",
    email: "nusrat@gmail.com",
    recoveryAnswer: "chittagong",
    bio: "UI/UX Lead Designer • Available for P2P calls",
    username: "nusrat",
    avatar: "NJ",
    online: true,
    lastSeenTime: Date.now() - 5000,
    contacts: ["u1", "u2"],
    groups: [],
    stories: [],
    blocked: [],
  },
};

export function generateRandomUID(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export function getChatRoomId(id1: string, id2: string): string {
  return [id1, id2].sort().join("_");
}

export function formatLastSeen(timestamp?: number): string {
  if (!timestamp) return "offline";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return "online";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `last seen ${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `last seen ${diffHour}h ago`;
  return `last seen ${Math.floor(diffHour / 24)}d ago`;
}
