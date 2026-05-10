import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  setCurrentUserSession,
  type LocalUserSession,
} from "../auth/localUser";
import { db } from "./firebaseConfig";

interface AuthUserRecord {
  id: string;
  email: string;
  phone: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
}

interface RegisterInput {
  email: string;
  phone: string;
  password: string;
}

interface LoginInput {
  emailOrPhone: string;
  password: string;
}

const usersCollection = collection(db, "users");

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

function getUsernameFromEmail(email: string) {
  return email.split("@")[0]?.trim() || "user";
}

function createSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string) {
  const payload = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function createSession(user: AuthUserRecord): LocalUserSession {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    username: user.username,
  };
}

async function findUserByField(field: "email" | "phone", value: string) {
  const userQuery = query(usersCollection, where(field, "==", value), limit(1));
  const snapshot = await getDocs(userQuery);
  const userDoc = snapshot.docs[0];
  if (!userDoc) return null;

  return {
    id: userDoc.id,
    ...userDoc.data(),
  } as AuthUserRecord;
}

export async function registerUser(input: RegisterInput) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const password = input.password.trim();

  if (!email || !email.includes("@")) {
    throw new Error("auth.errors.invalidEmail");
  }

  if (!phone || phone.length < 10) {
    throw new Error("auth.errors.invalidPhone");
  }

  if (password.length < 6) {
    throw new Error("auth.errors.shortPassword");
  }

  const existingEmail = await findUserByField("email", email);
  if (existingEmail) {
    throw new Error("auth.errors.emailExists");
  }

  const existingPhone = await findUserByField("phone", phone);
  if (existingPhone) {
    throw new Error("auth.errors.phoneExists");
  }

  const userRef = doc(usersCollection);
  const passwordSalt = createSalt();
  const passwordHash = await hashPassword(password, passwordSalt);

  const user: AuthUserRecord = {
    id: userRef.id,
    email,
    phone,
    username: getUsernameFromEmail(email),
    passwordHash,
    passwordSalt,
  };

  await setDoc(userRef, {
    email: user.email,
    phone: user.phone,
    username: user.username,
    passwordHash: user.passwordHash,
    passwordSalt: user.passwordSalt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const session = createSession(user);
  setCurrentUserSession(session);
  return session;
}

export async function loginUser(input: LoginInput) {
  const identity = input.emailOrPhone.trim();
  const normalizedEmail = normalizeEmail(identity);
  const normalizedPhone = normalizePhone(identity);
  const field = identity.includes("@") ? "email" : "phone";
  const user = await findUserByField(
    field,
    field === "email" ? normalizedEmail : normalizedPhone,
  );

  if (!user) {
    throw new Error("auth.errors.notFound");
  }

  const passwordHash = await hashPassword(input.password.trim(), user.passwordSalt);
  if (passwordHash !== user.passwordHash) {
    throw new Error("auth.errors.invalidCredentials");
  }

  const session = createSession(user);
  setCurrentUserSession(session);
  return session;
}
