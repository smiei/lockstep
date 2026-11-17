// The rules of the optional accounts that need neither the database nor
// Node: client-safe and pure, shared by the forms and the server.

// What an installation does about accounts right now:
//   off   - none; every run is listed to everyone (the app as it always was)
//   on    - a visitor logs in and lists only their own runs
//   setup - undecided: the first-start window asks once
export type AccountsMode = "off" | "on" | "setup";

export const ACCOUNTS_ENV = "LOCKSTEP_ACCOUNTS";

// The variable is an override, the stored choice the normal case.
//
// An installation that already holds runs and never chose is "off": it was
// set up before accounts existed, and a registration window in front of
// somebody's running tracker would be a surprise, not a first start.
export function decideAccountsMode(input: {
  env: string | undefined;
  setting: string | null;
  isPublicInstance: boolean;
  hasRuns: boolean;
  hasUsers: boolean;
}): AccountsMode {
  // A public instance hands out runs by link and has no accounts.
  if (input.isPublicInstance) return "off";
  const env = input.env?.trim().toLowerCase();
  if (env === "off" || env === "false" || env === "0") return "off";
  if (env === "on" || env === "true" || env === "1") return input.hasUsers ? "on" : "setup";
  if (input.setting === "off") return "off";
  // "on" without a single account cannot be logged into: ask again.
  if (input.setting === "on") return input.hasUsers ? "on" : "setup";
  return input.hasRuns ? "off" : "setup";
}

// Whether the variable decides, so the settings page offers no switch.
export function accountsForcedByEnv(env: string | undefined): "off" | "on" | null {
  const value = env?.trim().toLowerCase();
  if (value === "off" || value === "false" || value === "0") return "off";
  if (value === "on" || value === "true" || value === "1") return "on";
  return null;
}

export const USER_NAME_MIN = 2;
export const USER_NAME_MAX = 24;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

// A display name: letters and digits of any script, single blanks, and the
// few signs names carry. Null when it is not one.
export function cleanUserName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < USER_NAME_MIN || name.length > USER_NAME_MAX) return null;
  return /^[\p{L}\p{N} ._-]+$/u.test(name) ? name : null;
}

// What a login compares, so "Red" and "red" are one account.
export function userNameKey(name: string): string {
  return name.normalize("NFC").toLowerCase();
}

export function isAcceptablePassword(raw: unknown): raw is string {
  return typeof raw === "string" && raw.length >= PASSWORD_MIN && raw.length <= PASSWORD_MAX;
}

// What the settings page and the gate get to know about the visitor.
export type AccountView = {
  mode: AccountsMode;
  // The variable decides: no switch is offered.
  forced: "off" | "on" | null;
  user: { id: number; name: string; isAdmin: boolean } | null;
  // Admin only.
  inviteCode: string | null;
  users: { id: number; name: string; isAdmin: boolean }[] | null;
};
