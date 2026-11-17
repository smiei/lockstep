"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeOwnPassword,
  logOut,
  removeUser,
  renewInviteCode,
  setUserPassword,
  switchAccountsOff,
  switchAccountsOn,
} from "@/lib/authActions";
import { formatActionError, type ActionResult } from "@/lib/actionErrors";
import { PASSWORD_MAX, PASSWORD_MIN, USER_NAME_MAX, type AccountView } from "@/lib/accountRules";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { useDialog } from "@/components/DialogProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldLabel, Input } from "@/components/ui/Input";
import { Section } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";

function Row({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 p-4">
      <div className="min-w-0 max-w-prose flex-1 basis-56">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
      </div>
      {children && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

// The Settings page's "Accounts" section (src/lib/auth.ts): switch them on on
// an installation without, and with them the visitor's own account plus - for
// the admin - the invite code, the other accounts and the switch back off.
export function AccountSettings({ account }: { account: AccountView }) {
  const { lang } = useLanguage();
  const t = translations[lang].accounts;
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useDialog();
  const ids = useId();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  // Which form is open: switching on, the own password, or another account's.
  const [open, setOpen] = useState<"on" | "own" | number | null>(null);
  const [name, setName] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");

  function run(key: string, action: () => Promise<ActionResult>, done?: () => void) {
    setBusy(key);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if (result.success) {
        setOpen(null);
        setName("");
        setCurrent("");
        setPassword("");
        done?.();
        router.refresh();
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  const passwordField = (id: string, label: string, value: string, onChange: (value: string) => void, fresh: boolean) => (
    <div className="min-w-0 flex-1 basis-48">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="password"
        autoComplete={fresh ? "new-password" : "current-password"}
        required
        minLength={fresh ? PASSWORD_MIN : undefined}
        maxLength={PASSWORD_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />
    </div>
  );

  // --- no accounts on this installation
  if (account.mode !== "on") {
    return (
      <Section title={t.section}>
        <Card padding="none" className="divide-y divide-line">
          <Row title={t.offHint} hint={account.forced === "off" ? t.forcedOff : t.switchOnHint}>
            {account.forced === null && open !== "on" && <Button onClick={() => setOpen("on")}>{t.switchOn}</Button>}
          </Row>
          {open === "on" && (
            <form
              className="flex flex-wrap items-end gap-2 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                run("on", () => switchAccountsOn(name, password));
              }}
            >
              <div className="min-w-0 flex-1 basis-48">
                <FieldLabel htmlFor={`${ids}-name`}>{t.name}</FieldLabel>
                <Input
                  id={`${ids}-name`}
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={USER_NAME_MAX}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                />
              </div>
              {passwordField(`${ids}-pw`, t.password, password, setPassword, true)}
              <Button type="submit" variant="primary" loading={busy === "on"} disabled={pending}>
                {t.switchOn}
              </Button>
              <p className="w-full text-xs text-ink-muted">{t.passwordHint(PASSWORD_MIN)}</p>
            </form>
          )}
        </Card>
      </Section>
    );
  }

  const user = account.user;
  if (!user) return null;

  return (
    <Section title={t.section}>
      <Card padding="none" className="divide-y divide-line">
        <Row title={t.signedInAs(user.name)} hint={account.forced === "on" ? t.forcedOn : undefined}>
          {user.isAdmin && <Badge>{t.adminBadge}</Badge>}
          {open !== "own" && <Button onClick={() => setOpen("own")}>{t.changePassword}</Button>}
          <Button loading={busy === "logout"} disabled={pending} onClick={() => run("logout", logOut)}>
            {t.logout}
          </Button>
        </Row>
        {open === "own" && (
          <form
            className="flex flex-wrap items-end gap-2 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              run("own", () => changeOwnPassword(current, password), () => toast.success(t.passwordChanged));
            }}
          >
            {passwordField(`${ids}-cur`, t.currentPassword, current, setCurrent, false)}
            {passwordField(`${ids}-new`, t.newPassword, password, setPassword, true)}
            <Button type="submit" variant="primary" loading={busy === "own"} disabled={pending}>
              {t.save}
            </Button>
            <p className="w-full text-xs text-ink-muted">{t.passwordHint(PASSWORD_MIN)}</p>
          </form>
        )}

        {user.isAdmin && account.inviteCode && (
          <Row title={t.inviteCode} hint={t.inviteHint}>
            <code className="rounded-sm bg-sunken px-2 py-1 font-mono text-sm font-semibold tracking-widest text-ink">
              {account.inviteCode}
            </code>
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(account.inviteCode ?? "");
                  toast.success(t.inviteCopied);
                } catch {
                  // No clipboard (plain http): the code is on screen to type.
                }
              }}
            >
              {t.inviteCopy}
            </Button>
            <Button loading={busy === "invite"} disabled={pending} onClick={() => run("invite", renewInviteCode)}>
              {t.inviteRenew}
            </Button>
          </Row>
        )}

        {user.isAdmin &&
          account.users
            ?.filter((other) => other.id !== user.id)
            .map((other) => (
              <div key={other.id}>
                <Row title={other.name}>
                  {open !== other.id && <Button onClick={() => setOpen(other.id)}>{t.userSetPassword}</Button>}
                  <Button
                    variant="danger"
                    loading={busy === `remove-${other.id}`}
                    disabled={pending}
                    onClick={async () => {
                      const sure = await confirm({ message: t.userRemoveConfirm(other.name), confirmLabel: t.userRemove, danger: true });
                      if (sure) run(`remove-${other.id}`, () => removeUser(other.id));
                    }}
                  >
                    {t.userRemove}
                  </Button>
                </Row>
                {open === other.id && (
                  <form
                    className="flex flex-wrap items-end gap-2 px-4 pb-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(`pw-${other.id}`, () => setUserPassword(other.id, password), () =>
                        toast.success(t.userPasswordSet(other.name)),
                      );
                    }}
                  >
                    {passwordField(`${ids}-pw-${other.id}`, t.newPassword, password, setPassword, true)}
                    <Button type="submit" variant="primary" loading={busy === `pw-${other.id}`} disabled={pending}>
                      {t.save}
                    </Button>
                  </form>
                )}
              </div>
            ))}

        {user.isAdmin && account.forced === null && (
          <Row title={t.switchOff} hint={t.switchOffHint}>
            <Button
              variant="danger"
              loading={busy === "off"}
              disabled={pending}
              onClick={async () => {
                const sure = await confirm({ message: t.switchOffConfirm, confirmLabel: t.switchOff, danger: true });
                if (sure) run("off", switchAccountsOff);
              }}
            >
              {t.switchOff}
            </Button>
          </Row>
        )}
      </Card>
    </Section>
  );
}
