import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
  signOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  where,
  limit,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported as isMessagingSupported,
  Messaging,
} from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

// Single Unified Firebase App Instance (Project: gen-lang-client-0142706943)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration. The client is offline.');
      return false;
    }
    return true;
  }
}

// Run boot connection test
testFirestoreConnection();

// Basic Google Sign-In Provider (openid, email, profile only — avoids restricted Drive scope 403 blocks on initial login)
const basicGoogleProvider = new GoogleAuthProvider();
basicGoogleProvider.addScope('email');
basicGoogleProvider.addScope('profile');
basicGoogleProvider.setCustomParameters({ prompt: 'select_account' });

// Google Workspace Drive Provider (includes drive.file and drive.readonly scopes)
const driveGoogleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => driveGoogleProvider.addScope(scope));
driveGoogleProvider.setCustomParameters({ prompt: 'select_account' });

export const FIREBASE_OAUTH_CONFIG_SUMMARY = {
  projectId: firebaseConfig.projectId,
  projectNumber: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  authDomain: firebaseConfig.authDomain,
  oAuthClientId: firebaseConfig.oAuthClientId,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  authorizedRedirectUri: `https://${firebaseConfig.authDomain}/__/auth/handler`,
  javascriptOrigins: [
    `https://${firebaseConfig.authDomain}`,
    'https://ais-dev-cjx6kbfeeoidv3flk4u625-742051385233.europe-west2.run.app',
    'https://ais-pre-cjx6kbfeeoidv3flk4u625-742051385233.europe-west2.run.app',
  ],
  consoleUrls: {
    audienceAndTestUsers: `https://console.cloud.google.com/auth/audience?project=${firebaseConfig.projectId}`,
    oauthClients: `https://console.cloud.google.com/auth/clients?project=${firebaseConfig.projectId}`,
    branding: `https://console.cloud.google.com/auth/branding?project=${firebaseConfig.projectId}`,
    scopesDataAccess: `https://console.cloud.google.com/auth/scopes?project=${firebaseConfig.projectId}`,
    credentialsLegacy: `https://console.cloud.google.com/apis/credentials?project=${firebaseConfig.projectId}`,
    firebaseProviders: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`,
    firebaseAuthorizedDomains: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`,
  },
};

let isSigningIn = false;
// Cache the access token in memory ONLY (never in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (options?: {
  includeDriveScopes?: boolean;
}): Promise<{ user: User; accessToken: string | null; driveScopesGranted: boolean } | null> => {
  try {
    isSigningIn = true;
    const useDrive = Boolean(options?.includeDriveScopes);
    const activeProvider = useDrive ? driveGoogleProvider : basicGoogleProvider;
    const result = await signInWithPopup(auth, activeProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;

    if (useDrive && !token) {
      throw new Error('Failed to obtain Google Drive OAuth access token from Firebase Auth.');
    }

    if (token) {
      cachedAccessToken = token;
    }
    return {
      user: result.user,
      accessToken: token,
      driveScopesGranted: useDrive && Boolean(token),
    };
  } catch (error: any) {
    const code = error?.code || '';
    const msg = String(error?.message || '');
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/user-cancelled'
    ) {
      // User closed the Google Sign-In popup window voluntarily; return null cleanly
      return null;
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        `Current domain (${window.location.hostname}) is not in Firebase Authorized Domains for project ${firebaseConfig.projectId}.`
      );
    }
    if (msg.includes('access_denied') || msg.includes('403')) {
      throw new Error(
        `Google OAuth Error 403 (access_denied): Ensure your Gmail is added under Test Users or click "Publish App" in Google Auth Platform Audience for project ${firebaseConfig.projectId}.`
      );
    }
    throw new Error(error?.message || 'Google Sign-In could not be completed.');
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Re-authenticate current Firebase Email/Password user for sensitive operations
export async function reauthenticateCurrentUser(password: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No active email/password Firebase session to re-authenticate.');
  }
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  return true;
}

export interface UploadedMediaResult {
  mediaId?: string;
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  senderId: string;
  recipientId: string;
  chatId: string;
  timestamp: number;
  provider: 'firebase-storage' | 'authenticated-server-storage';
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Upload binary file via XHR to conversation-authorized server storage with real byte progress
function uploadToAuthenticatedServerStorage(params: {
  file: File | Blob;
  fileName: string;
  mimeType: string;
  senderId: string;
  recipientId: string;
  chatId: string;
  storagePath: string;
  onProgress?: (percent: number, transferredBytes: number, totalBytes: number) => void;
}): Promise<UploadedMediaResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media/upload', true);
    xhr.setRequestHeader('Content-Type', params.mimeType || 'application/octet-stream');
    xhr.setRequestHeader('x-file-name', encodeURIComponent(params.fileName));
    xhr.setRequestHeader('x-mime-type', params.mimeType || 'application/octet-stream');
    xhr.setRequestHeader('x-sender-id', params.senderId);
    xhr.setRequestHeader('x-recipient-id', params.recipientId);
    xhr.setRequestHeader('x-chat-id', params.chatId);
    xhr.setRequestHeader('x-storage-path', encodeURIComponent(params.storagePath));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && params.onProgress) {
        const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
        params.onProgress(pct, event.loaded, event.total);
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.downloadUrl) {
          if (params.onProgress) {
            params.onProgress(100, params.file.size, params.file.size);
          }
          resolve({
            mediaId: data.mediaId,
            downloadUrl: data.downloadUrl,
            storagePath: data.storagePath || params.storagePath,
            fileName: data.fileName || params.fileName,
            mimeType: data.mimeType || params.mimeType,
            fileSize: data.fileSize || params.file.size,
            senderId: params.senderId,
            recipientId: params.recipientId,
            chatId: params.chatId,
            timestamp: data.timestamp || Date.now(),
            provider: 'authenticated-server-storage',
          });
        } else {
          reject(new Error(data.error || `Upload failed with HTTP ${xhr.status}.`));
        }
      } catch {
        reject(new Error(`Upload failed with HTTP ${xhr.status}.`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred while uploading media attachment.'));
    };

    xhr.send(params.file);
  });
}

// Primary Media Upload: Uses Firebase Cloud Storage when bucket is provisioned & authenticated,
// and falls back seamlessly to conversation-authorized server storage when bucket returns 404/uninitialized.
export async function uploadMediaAttachment(params: {
  file: File | Blob;
  fileName: string;
  mimeType: string;
  senderId: string;
  recipientId: string;
  chatId: string;
  onProgress?: (percent: number, transferredBytes: number, totalBytes: number) => void;
}): Promise<UploadedMediaResult> {
  const timestamp = Date.now();
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || `media_${timestamp}`;
  const storagePath = `chats/${params.chatId}/${params.senderId}/${timestamp}_${safeName}`;

  // Pre-validate size and MIME type before starting upload
  const mime = (params.mimeType || '').toLowerCase();
  const isVideo = mime.startsWith('video/');
  const isImage = mime.startsWith('image/');
  const maxBytes = isVideo ? 50 * 1024 * 1024 : isImage ? 20 * 1024 * 1024 : 25 * 1024 * 1024;

  if (params.file.size === 0) {
    throw new Error('Selected file is empty (0 bytes).');
  }

  if (params.file.size > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(
      `File size (${formatFileSize(params.file.size)}) exceeds the ${limitMb} MB limit for ${
        isVideo ? 'video' : isImage ? 'photo' : 'file'
      } attachments.`
    );
  }

  // If authenticated with Firebase Auth, try Firebase Storage first with a 2.5s initial progress watchdog
  if (auth.currentUser && auth.currentUser.uid === params.senderId) {
    try {
      const fbUrl = await new Promise<string>((resolve, reject) => {
        const fileRef = storageRef(storage, storagePath);
        const uploadTask = uploadBytesResumable(fileRef, params.file, {
          contentType: params.mimeType,
          customMetadata: {
            chatId: params.chatId,
            senderId: params.senderId,
            recipientId: params.recipientId,
            originalName: params.fileName,
          },
        });

        let progressed = false;
        const watchdog = window.setTimeout(() => {
          if (!progressed) {
            uploadTask.cancel();
            reject(new Error('Firebase Storage bucket not initialized yet; switching to authenticated server storage.'));
          }
        }, 2500);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.bytesTransferred > 0) {
              progressed = true;
              window.clearTimeout(watchdog);
            }
            if (snapshot.totalBytes > 0 && params.onProgress) {
              const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              params.onProgress(pct, snapshot.bytesTransferred, snapshot.totalBytes);
            }
          },
          (err) => {
            window.clearTimeout(watchdog);
            reject(err);
          },
          async () => {
            window.clearTimeout(watchdog);
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (e) {
              reject(e);
            }
          }
        );
      });

      return {
        downloadUrl: fbUrl,
        storagePath,
        fileName: params.fileName,
        mimeType: params.mimeType,
        fileSize: params.file.size,
        senderId: params.senderId,
        recipientId: params.recipientId,
        chatId: params.chatId,
        timestamp,
        provider: 'firebase-storage',
      };
    } catch {
      // Fall through to authenticated server storage if Firebase Storage bucket is not yet initialized in console
    }
  }

  return uploadToAuthenticatedServerStorage({
    ...params,
    storagePath,
  });
}

// Backwards-compatible wrapper
export async function uploadMediaToFirebaseStorage(
  file: File | Blob,
  fileName: string,
  ownerId: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const res = await uploadMediaAttachment({
    file,
    fileName,
    mimeType: (file as File).type || 'application/octet-stream',
    senderId: ownerId,
    recipientId: ownerId,
    chatId: `${ownerId}_self`,
    onProgress: (pct) => {
      if (onProgress) onProgress(pct);
    },
  });
  return res.downloadUrl;
}

// Authenticated Media Download Helper (Works on Android Mobile Browsers & Desktop Browsers without CORS failure)
export async function downloadMediaAttachment(params: {
  mediaUrl: string;
  fileName?: string;
  mimeType?: string;
  chatId: string;
  userId: string;
}): Promise<void> {
  const cleanUrl = params.mediaUrl.replace(/&userId=[^&]+/, '');
  const extFromMime = params.mimeType
    ? params.mimeType.includes('mp4')
      ? '.mp4'
      : params.mimeType.includes('webm')
      ? '.webm'
      : params.mimeType.includes('png')
      ? '.png'
      : params.mimeType.includes('webp')
      ? '.webp'
      : params.mimeType.includes('jpeg') || params.mimeType.includes('jpg')
      ? '.jpg'
      : ''
    : '';

  const fallbackName = `flashtalk_${Date.now()}${extFromMime || '.bin'}`;
  const sensibleFileName = params.fileName && params.fileName.trim() ? params.fileName.trim() : fallbackName;

  const downloadEndpoint = `/api/media/download?url=${encodeURIComponent(cleanUrl)}&fileName=${encodeURIComponent(
    sensibleFileName
  )}&chatId=${encodeURIComponent(params.chatId)}&userId=${encodeURIComponent(params.userId)}`;

  const response = await fetch(downloadEndpoint);
  if (!response.ok) {
    let errMsg = `Download failed (HTTP ${response.status}).`;
    try {
      const errJson = await response.json();
      if (errJson?.error) errMsg = errJson.error;
    } catch {}
    throw new Error(errMsg);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error('Downloaded media file is empty.');
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = sensibleFileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}

// Real Firebase Cloud Messaging (FCM) Push Notification Setup
let messagingInstance: Messaging | null = null;

export async function registerFCMToken(
  onForegroundMessage?: (payload: { title: string; body: string }) => void
): Promise<{ token: string | null; status: string }> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { token: null, status: 'Notifications API not supported in this browser.' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { token: null, status: 'Notification permission was denied by user.' };
    }

    const supported = await isMessagingSupported();
    if (!supported) {
      return { token: null, status: 'Browser Notification API active (FCM Web Push unsupported in this frame).' };
    }

    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }

    if (onForegroundMessage) {
      onMessage(messagingInstance, (payload) => {
        onForegroundMessage({
          title: payload.notification?.title || 'FlashTalk Message',
          body: payload.notification?.body || 'New encrypted message received.',
        });
      });
    }

    const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || '';
    if (!vapidKey) {
      return {
        token: null,
        status:
          'Browser push notifications enabled. Set VITE_FIREBASE_VAPID_KEY in .env to issue an FCM device token.',
      };
    }

    const token = await getToken(messagingInstance, {
      vapidKey,
    });

    if (token && auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'users', auth.currentUser.uid, 'private', 'profile'),
          {
            ownerId: auth.currentUser.uid,
            email: auth.currentUser.email || 'user@flashtalk.app',
            fcmToken: token,
          },
          { merge: true }
        );
      } catch {}
    }

    return { token, status: 'FCM Push Token active and saved.' };
  } catch (err: any) {
    return {
      token: null,
      status: err?.message || 'Failed to register FCM token.',
    };
  }
}

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  where,
  limit,
};

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

export async function listDriveFiles(searchQuery = ''): Promise<DriveFileItem[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Drive authorization required.');
  }

  let q = 'trashed = false';
  if (searchQuery.trim()) {
    const escaped = searchQuery.trim().replace(/'/g, "\\'");
    q += ` and name contains '${escaped}'`;
  }

  const params = new URLSearchParams({
    pageSize: '25',
    fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)',
    orderBy: 'modifiedTime desc',
    q,
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to fetch Google Drive files.');
  }

  const data = await res.json();
  return data.files || [];
}

export async function uploadTextBackupToDrive(
  fileName: string,
  content: string
): Promise<DriveFileItem> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Drive authorization required.');
  }

  const metadata = {
    name: fileName,
    mimeType: 'text/plain',
  };

  const boundary = '-------flashtalk_drive_boundary_928374';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
    content +
    closeDelim;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to upload backup to Google Drive.');
  }

  return await res.json();
}

export async function deleteDriveFileById(fileId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Drive authorization required.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to delete file from Google Drive.');
  }
}
