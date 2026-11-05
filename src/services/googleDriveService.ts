import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

export const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
];

const existingApp = getApps().find((a) => a.name === "workspace-auth");
const workspaceApp = existingApp || initializeApp(firebaseConfig, "workspace-auth");
const auth = getAuth(workspaceApp);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: "consent" });

let isSigningIn = false;
// Cache the access token in memory ONLY (never in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export const initDriveAuth = (
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

export const googleDriveSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get Google Drive access token from Firebase Auth");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Google Drive Sign-In Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleDriveLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export const listDriveFiles = async (searchQuery = ""): Promise<DriveFileItem[]> => {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error("NEEDS_AUTH");
  }

  let q = "trashed = false";
  if (searchQuery.trim()) {
    const safe = searchQuery.trim().replace(/'/g, "\\'");
    q += ` and name contains '${safe}'`;
  }

  const params = new URLSearchParams({
    pageSize: "25",
    fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink)",
    orderBy: "modifiedTime desc",
    q,
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error("NEEDS_AUTH");
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Failed to list Google Drive files");
  }

  const data = await res.json();
  return data.files || [];
};

export const uploadTextBackupToDrive = async (
  fileName: string,
  textContent: string
): Promise<DriveFileItem> => {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error("NEEDS_AUTH");
  }

  const metadata = {
    name: fileName,
    mimeType: "text/plain",
    description: "FlashTalk Secure Messenger Chat Backup",
  };

  const boundary = "-------flashtalk_drive_boundary_" + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
    textContent +
    closeDelimiter;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error("NEEDS_AUTH");
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Failed to upload backup to Google Drive");
  }

  return await res.json();
};

export const uploadBase64FileToDrive = async (
  fileName: string,
  dataUrl: string,
  mimeType: string
): Promise<DriveFileItem> => {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error("NEEDS_AUTH");
  }

  const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const metadata = {
    name: fileName,
    mimeType: mimeType || "application/octet-stream",
  };

  const boundary = "-------flashtalk_media_boundary_" + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType || "application/octet-stream"}\r\n` +
    "Content-Transfer-Encoding: base64\r\n\r\n" +
    base64Data +
    closeDelimiter;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error("NEEDS_AUTH");
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Failed to upload file to Google Drive");
  }

  return await res.json();
};

export const deleteDriveFile = async (fileId: string): Promise<void> => {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error("NEEDS_AUTH");
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error("NEEDS_AUTH");
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Failed to delete file from Google Drive");
  }
};
