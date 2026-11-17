import { describe, expect, it } from "vitest";
import {
  accountsForcedByEnv,
  cleanUserName,
  decideAccountsMode,
  isAcceptablePassword,
  userNameKey,
} from "@/lib/accountRules";
import { hashPassword, newInviteCode, newToken, sameSecret, tokenId, verifyPassword } from "@/lib/passwords";

const base = { env: undefined, setting: null, isPublicInstance: false, hasRuns: false, hasUsers: false };

describe("decideAccountsMode", () => {
  it("asks on a fresh installation", () => {
    expect(decideAccountsMode(base)).toBe("setup");
  });

  it("leaves an installation that already has runs alone", () => {
    expect(decideAccountsMode({ ...base, hasRuns: true })).toBe("off");
  });

  it("follows the stored choice", () => {
    expect(decideAccountsMode({ ...base, setting: "off" })).toBe("off");
    expect(decideAccountsMode({ ...base, setting: "on", hasUsers: true, hasRuns: true })).toBe("on");
  });

  it("asks again when accounts are on but nobody could log in", () => {
    expect(decideAccountsMode({ ...base, setting: "on" })).toBe("setup");
  });

  it("lets the variable win over the stored choice", () => {
    expect(decideAccountsMode({ ...base, env: "off", setting: "on", hasUsers: true })).toBe("off");
    expect(decideAccountsMode({ ...base, env: " ON ", setting: "off", hasUsers: true })).toBe("on");
    expect(decideAccountsMode({ ...base, env: "on", setting: "off" })).toBe("setup");
  });

  it("ignores a value it does not know", () => {
    expect(decideAccountsMode({ ...base, env: "maybe", hasRuns: true })).toBe("off");
    expect(accountsForcedByEnv("maybe")).toBeNull();
    // What the Unraid template sends for "ask on the first start".
    expect(accountsForcedByEnv("ask")).toBeNull();
    expect(decideAccountsMode({ ...base, env: "ask" })).toBe("setup");
    expect(accountsForcedByEnv("0")).toBe("off");
    expect(accountsForcedByEnv("true")).toBe("on");
  });

  it("never has accounts on a public instance", () => {
    expect(decideAccountsMode({ ...base, isPublicInstance: true, env: "on", setting: "on", hasUsers: true })).toBe("off");
  });
});

describe("account names and passwords", () => {
  it("tidies a name and rejects what is not one", () => {
    expect(cleanUserName("  Red   Leaf ")).toBe("Red Leaf");
    expect(cleanUserName("Jörg_2")).toBe("Jörg_2");
    expect(cleanUserName("A")).toBeNull();
    expect(cleanUserName("x".repeat(25))).toBeNull();
    expect(cleanUserName("<script>")).toBeNull();
    expect(cleanUserName(42)).toBeNull();
  });

  it("compares names without their case", () => {
    expect(userNameKey("Red")).toBe(userNameKey("rED"));
  });

  it("wants eight characters", () => {
    expect(isAcceptablePassword("1234567")).toBe(false);
    expect(isAcceptablePassword("12345678")).toBe(true);
    expect(isAcceptablePassword("x".repeat(201))).toBe(false);
    expect(isAcceptablePassword(null)).toBe(false);
  });
});

describe("passwords", () => {
  it("verifies what it hashed and nothing else", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("correct horsf", stored)).toBe(false);
  });

  it("salts: the same password hashes differently", async () => {
    expect(await hashPassword("same-password")).not.toBe(await hashPassword("same-password"));
  });

  it("answers false for a stored value it cannot read", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "plain$text")).toBe(false);
    expect(await verifyPassword("x", "scrypt$0$8$1$AAAA$AAAA")).toBe(false);
  });

  it("stores a token only as its hash", () => {
    const token = newToken();
    expect(tokenId(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenId(token)).not.toBe(token);
    expect(newToken()).not.toBe(token);
  });

  it("makes invite codes without look-alike characters", () => {
    const code = newInviteCode();
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{10}$/);
    expect(sameSecret(code, code)).toBe(true);
    expect(sameSecret(code, code.toLowerCase())).toBe(false);
  });
});
