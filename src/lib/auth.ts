import { cache } from "react";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import {
  ACCOUNTS_ENV,
  accountsForcedByEnv,
  decideAccountsMode,
  type AccountView,
  type AccountsMode,
} from "@/lib/accountRules";
import { newToken, tokenId } from "@/lib/passwords";

// The optional accounts, server side: who is asking, and which runs they may
// list. Everything that hands out run data asks here - the pages through
// resolveRunId/listRunsForHeader (src/lib/runs.ts), the actions through
// findRunByKey (src/lib/runAccess.ts) - so the window the layout shows
// instead of the app is only the visible half of the lock.
//
// The model is the one the app already had, with a login in front: a run's
// link is still what opens it. An account adds a private list - the runs it
// made or whose link it opened - and the admin sees all of them.

export const SESSION_COOKIE = "lockstep_session";
const SESSION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export const SETTING_ACCOUNTS = "accounts";
export const SETTING_INVITE = "inviteCode";

export type Viewer = {
  mode: AccountsMode;
  user: { id: number; name: string; isAdmin: boolean } | null;
};

// Once per request: every page asks several times.
export const getAccountsMode = cache(async (): Promise<AccountsMode> => {
  if (IS_PUBLIC_INSTANCE) return "off";
  const env = process.env[ACCOUNTS_ENV];
  if (accountsForcedByEnv(env) === "off") return "off";
  const [setting, users, runs] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: SETTING_ACCOUNTS } }),
    prisma.user.count(),
    prisma.run.count(),
  ]);
  return decideAccountsMode({
    env,
    setting: setting?.value ?? null,
    isPublicInstance: false,
    hasRuns: runs > 0,
    hasUsers: users > 0,
  });
});

const readSessionUser = cache(async (): Promise<Viewer["user"]> => {
  let token: string | undefined;
  try {
    token = (await cookies()).get(SESSION_COOKIE)?.value;
  } catch {
    // No request (a script, a build step): nobody is logged in.
    return null;
  }
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: tokenId(token) },
    include: { user: { select: { id: true, name: true, isAdmin: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return session.user;
});

export async function getViewer(): Promise<Viewer> {
  const mode = await getAccountsMode();
  return { mode, user: mode === "on" ? await readSessionUser() : null };
}

// Nobody gets run data: accounts are on and the visitor is not logged in, or
// the installation has not been set up yet.
export function isLockedOut(viewer: Viewer): boolean {
  return viewer.mode === "setup" || (viewer.mode === "on" && !viewer.user);
}

// The Prisma filter for "the runs this visitor lists": none needed without
// accounts or for the admin.
export function visibleRunsWhere(viewer: Viewer): { members: { some: { userId: number } } } | undefined {
  if (viewer.mode !== "on" || !viewer.user || viewer.user.isAdmin) return undefined;
  return { members: { some: { userId: viewer.user.id } } };
}

// Opening a run's link while logged in is what puts it on the account's list.
export async function joinRun(runId: number, viewer: Viewer, owner = false): Promise<void> {
  if (viewer.mode !== "on" || !viewer.user) return;
  try {
    await prisma.runMember.upsert({
      where: { runId_userId: { runId, userId: viewer.user.id } },
      create: { runId, userId: viewer.user.id, owner },
      update: owner ? { owner: true } : {},
    });
  } catch (error) {
    // Two tabs opening the same link at once: the other one made the row.
    console.error("joinRun failed:", error);
  }
}

export async function isRunMember(runId: number, userId: number): Promise<boolean> {
  return (await prisma.runMember.count({ where: { runId, userId } })) > 0;
}

// Only the run's owner or the admin deletes it, once accounts are on.
export async function mayDeleteRun(runId: number, viewer: Viewer): Promise<boolean> {
  if (viewer.mode !== "on") return true;
  if (!viewer.user) return false;
  if (viewer.user.isAdmin) return true;
  return (await prisma.runMember.count({ where: { runId, userId: viewer.user.id, owner: true } })) > 0;
}

export async function startSession(userId: number): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await prisma.session.create({ data: { id: tokenId(token), userId, expiresAt } });
  // Old logins of this account that ran out: nobody else clears them.
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: tokenId(token) } });
  store.delete(SESSION_COOKIE);
}

// What the gate and the settings page render from. The invite code and the
// account list only ever reach the admin.
export async function getAccountView(): Promise<AccountView> {
  const viewer = await getViewer();
  const admin = viewer.mode === "on" && viewer.user?.isAdmin === true;
  const [invite, users] = admin
    ? await Promise.all([
        prisma.appSetting.findUnique({ where: { key: SETTING_INVITE } }),
        prisma.user.findMany({ select: { id: true, name: true, isAdmin: true }, orderBy: { id: "asc" } }),
      ])
    : [null, null];
  return {
    mode: viewer.mode,
    forced: IS_PUBLIC_INSTANCE ? "off" : accountsForcedByEnv(process.env[ACCOUNTS_ENV]),
    user: viewer.user,
    inviteCode: invite?.value ?? null,
    users,
  };
}
