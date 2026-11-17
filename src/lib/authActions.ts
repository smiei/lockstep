"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import type { ActionError, ActionResult } from "@/lib/actionErrors";
import { ACCOUNTS_ENV, accountsForcedByEnv, cleanUserName, isAcceptablePassword, userNameKey } from "@/lib/accountRules";
import { hashPassword, newInviteCode, sameSecret, verifyPassword } from "@/lib/passwords";
import {
  SETTING_ACCOUNTS,
  SETTING_INVITE,
  endSession,
  getAccountsMode,
  getViewer,
  startSession,
} from "@/lib/auth";

// The accounts' own actions: the first-start choice, logging in and out,
// registering with the invite code, and what the admin manages. Every one of
// them checks who is asking itself - an action is a public POST endpoint.

const fail = (key: ActionError["key"]): ActionResult => ({ success: false, error: { key } as ActionError });
const OK: ActionResult = { success: true };

// Wrong passwords per name: eight tries, then ten minutes of nothing. In
// memory, which is right for one long-running process and resets on restart.
const ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const failures = new Map<string, { count: number; until: number }>();

function blocked(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (entry.until < Date.now()) {
    failures.delete(key);
    return false;
  }
  return entry.count >= ATTEMPTS;
}

function noteFailure(key: string): void {
  const entry = failures.get(key);
  if (!entry || entry.until < Date.now()) failures.set(key, { count: 1, until: Date.now() + WINDOW_MS });
  else entry.count++;
}

async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

function refreshEverything(): void {
  revalidatePath("/", "layout");
}

// The first account of an installation: its admin, and the owner of every run
// that already exists. Used by the first-start window and by "switch accounts
// on" in the settings.
async function createFirstAccount(name: unknown, password: unknown): Promise<ActionResult> {
  const clean = cleanUserName(name);
  if (!clean) return fail("accountNameInvalid");
  if (!isAcceptablePassword(password)) return fail("passwordTooShort");
  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    // Somebody else finished the same window a moment earlier.
    if ((await tx.user.count()) > 0) return null;
    const created = await tx.user.create({
      data: { name: clean, nameKey: userNameKey(clean), passwordHash, isAdmin: true },
    });
    const runs = await tx.run.findMany({ select: { id: true } });
    for (const run of runs) {
      await tx.runMember.create({ data: { runId: run.id, userId: created.id, owner: true } });
    }
    return created;
  });
  if (!user) return fail("notAllowed");
  await setSetting(SETTING_ACCOUNTS, "on");
  if (!(await prisma.appSetting.findUnique({ where: { key: SETTING_INVITE } }))) {
    await setSetting(SETTING_INVITE, newInviteCode());
  }
  await startSession(user.id);
  refreshEverything();
  return OK;
}

// First-start window, upper half.
export async function setUpWithAccount(name: string, password: string): Promise<ActionResult> {
  if ((await getAccountsMode()) !== "setup") return fail("notAllowed");
  return createFirstAccount(name, password);
}

// First-start window, lower half: "continue without accounts".
export async function setUpWithoutAccounts(): Promise<ActionResult> {
  if ((await getAccountsMode()) !== "setup") return fail("notAllowed");
  // The variable asked for accounts: there is no skipping them here.
  if (accountsForcedByEnv(process.env[ACCOUNTS_ENV]) === "on") return fail("notAllowed");
  await setSetting(SETTING_ACCOUNTS, "off");
  refreshEverything();
  return OK;
}

// Settings, on an installation without accounts. With accounts left over from
// an earlier time it only switches them back on; otherwise it creates the
// admin.
export async function switchAccountsOn(name: string, password: string): Promise<ActionResult> {
  if (IS_PUBLIC_INSTANCE || accountsForcedByEnv(process.env[ACCOUNTS_ENV]) !== null) return fail("notAllowed");
  if ((await getAccountsMode()) !== "off") return fail("notAllowed");
  if ((await prisma.user.count()) === 0) return createFirstAccount(name, password);
  // Existing accounts: only one of them may bring the lock back.
  const login = await checkLogin(name, password);
  if (!login.user) return fail(login.error);
  await setSetting(SETTING_ACCOUNTS, "on");
  await startSession(login.user.id);
  refreshEverything();
  return OK;
}

// Settings, admin only. Accounts and their run lists stay stored, so
// switching back on later restores them.
export async function switchAccountsOff(): Promise<ActionResult> {
  if (accountsForcedByEnv(process.env[ACCOUNTS_ENV]) !== null) return fail("notAllowed");
  const viewer = await getViewer();
  if (viewer.mode !== "on" || !viewer.user?.isAdmin) return fail("notAllowed");
  await setSetting(SETTING_ACCOUNTS, "off");
  refreshEverything();
  return OK;
}

async function checkLogin(
  name: unknown,
  password: unknown,
): Promise<{ user: { id: number } | null; error: ActionError["key"] }> {
  const clean = cleanUserName(name);
  if (!clean || typeof password !== "string") return { user: null, error: "invalidCredentials" };
  const key = userNameKey(clean);
  if (blocked(key)) return { user: null, error: "tooManyAttempts" };
  const user = await prisma.user.findUnique({ where: { nameKey: key } });
  // Verified against a stored hash either way, so an unknown name takes as
  // long as a wrong password.
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : (await hashPassword(password), false);
  if (!user || !valid) {
    noteFailure(key);
    return { user: null, error: "invalidCredentials" };
  }
  failures.delete(key);
  return { user, error: "invalidCredentials" };
}

export async function logIn(name: string, password: string): Promise<ActionResult> {
  if ((await getAccountsMode()) !== "on") return fail("notAllowed");
  const login = await checkLogin(name, password);
  if (!login.user) return fail(login.error);
  await startSession(login.user.id);
  refreshEverything();
  return OK;
}

export async function logOut(): Promise<ActionResult> {
  await endSession();
  refreshEverything();
  return OK;
}

// A further account: anybody with the installation's invite code.
export async function register(name: string, password: string, inviteCode: string): Promise<ActionResult> {
  if ((await getAccountsMode()) !== "on") return fail("notAllowed");
  if (blocked("register")) return fail("tooManyAttempts");
  const stored = await prisma.appSetting.findUnique({ where: { key: SETTING_INVITE } });
  const given = typeof inviteCode === "string" ? inviteCode.trim().toUpperCase() : "";
  if (!stored || !given || !sameSecret(given, stored.value)) {
    noteFailure("register");
    return fail("inviteCodeWrong");
  }
  const clean = cleanUserName(name);
  if (!clean) return fail("accountNameInvalid");
  if (!isAcceptablePassword(password)) return fail("passwordTooShort");
  const nameKey = userNameKey(clean);
  if (await prisma.user.findUnique({ where: { nameKey } })) return fail("accountNameTaken");
  const passwordHash = await hashPassword(password);
  let userId: number;
  try {
    userId = (await prisma.user.create({ data: { name: clean, nameKey, passwordHash } })).id;
  } catch {
    // The same name, registered twice at the same moment.
    return fail("accountNameTaken");
  }
  await startSession(userId);
  refreshEverything();
  return OK;
}

export async function changeOwnPassword(current: string, next: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (viewer.mode !== "on" || !viewer.user) return fail("loginRequired");
  if (!isAcceptablePassword(next)) return fail("passwordTooShort");
  const user = await prisma.user.findUnique({ where: { id: viewer.user.id } });
  if (!user || typeof current !== "string" || !(await verifyPassword(current, user.passwordHash))) {
    return fail("invalidCredentials");
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  // Every other device of this account has to log in again.
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await startSession(user.id);
  return OK;
}

async function requireAdmin(): Promise<boolean> {
  const viewer = await getViewer();
  return viewer.mode === "on" && viewer.user?.isAdmin === true;
}

export async function renewInviteCode(): Promise<ActionResult> {
  if (!(await requireAdmin())) return fail("notAllowed");
  await setSetting(SETTING_INVITE, newInviteCode());
  revalidatePath("/settings");
  return OK;
}

// Nobody receives e-mail here, so a forgotten password is the admin's to
// replace. The account's devices are logged out with it.
export async function setUserPassword(userId: number, password: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return fail("notAllowed");
  if (!isAcceptablePassword(password)) return fail("passwordTooShort");
  if (!Number.isInteger(userId) || !(await prisma.user.findUnique({ where: { id: userId } }))) {
    return fail("notAllowed");
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  await prisma.session.deleteMany({ where: { userId } });
  return OK;
}

// Removes the account and its list of runs. The runs themselves stay: the
// admin sees them, and their links keep working for the other players.
export async function removeUser(userId: number): Promise<ActionResult> {
  const viewer = await getViewer();
  if (viewer.mode !== "on" || !viewer.user?.isAdmin) return fail("notAllowed");
  if (!Number.isInteger(userId) || userId === viewer.user.id) return fail("notAllowed");
  await prisma.user.deleteMany({ where: { id: userId, isAdmin: false } });
  revalidatePath("/settings");
  return OK;
}
