"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logIn, register, setUpWithAccount, setUpWithoutAccounts } from "@/lib/authActions";
import { formatActionError, type ActionResult } from "@/lib/actionErrors";
import { PASSWORD_MAX, PASSWORD_MIN, USER_NAME_MAX } from "@/lib/accountRules";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { LanguagePicker } from "@/components/LanguagePicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldLabel, Input } from "@/components/ui/Input";

// What the layout shows instead of the app while nobody may see run data
// (src/lib/auth.ts):
//   setup - the first start: create the first account, or go on without any
//   login - accounts are on and this browser is not logged in
// The lock itself sits in the data layer; this is only its door.
export function AccountGate({ mode, forced }: { mode: "setup" | "login"; forced: boolean }) {
  const { lang } = useLanguage();
  const t = translations[lang].accounts;
  const router = useRouter();
  const ids = useId();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [skipping, setSkipping] = useState(false);

  // A new password is typed twice; a login only once.
  const creating = mode === "setup" || tab === "register";

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) router.refresh();
      else setError(formatActionError(result.error, lang));
      setSkipping(false);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (creating && password !== repeat) {
      setError(t.passwordMismatch);
      return;
    }
    if (mode === "setup") run(() => setUpWithAccount(name, password));
    else if (tab === "register") run(() => register(name, password, code));
    else run(() => logIn(name, password));
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{mode === "setup" ? t.setupTitle : "Lockstep"}</h1>
      <p className="mt-2 text-sm text-ink-muted">{mode === "setup" ? t.setupIntro : t.loginIntro}</p>

      {mode === "login" && (
        <div className="mt-6 grid grid-cols-2 gap-2" role="group" aria-label={t.section}>
          {(
            [
              ["login", t.loginTab],
              ["register", t.registerTab],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={tab === value ? "primary" : "secondary"}
              aria-pressed={tab === value}
              onClick={() => {
                setTab(value);
                setError(null);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      <Card className="mt-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
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
          <div>
            <FieldLabel htmlFor={`${ids}-password`}>{t.password}</FieldLabel>
            <Input
              id={`${ids}-password`}
              type="password"
              autoComplete={creating ? "new-password" : "current-password"}
              required
              minLength={creating ? PASSWORD_MIN : undefined}
              maxLength={PASSWORD_MAX}
              aria-describedby={creating ? `${ids}-password-hint` : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
            {creating && (
              <p id={`${ids}-password-hint`} className="mt-1 text-xs text-ink-muted">
                {t.passwordHint(PASSWORD_MIN)}
              </p>
            )}
          </div>
          {creating && (
            <div>
              <FieldLabel htmlFor={`${ids}-repeat`}>{t.passwordRepeat}</FieldLabel>
              <Input
                id={`${ids}-repeat`}
                type="password"
                autoComplete="new-password"
                required
                maxLength={PASSWORD_MAX}
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className="w-full"
              />
            </div>
          )}
          {mode === "login" && tab === "register" && (
            <div>
              <FieldLabel htmlFor={`${ids}-code`}>{t.inviteCode}</FieldLabel>
              <Input
                id={`${ids}-code`}
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                aria-describedby={`${ids}-code-hint`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full font-mono uppercase"
              />
              <p id={`${ids}-code-hint`} className="mt-1 text-xs text-ink-muted">
                {t.inviteCodeHint}
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" loading={pending && !skipping}>
            {mode === "setup" ? t.setupCreate : tab === "register" ? t.setupCreate : t.loginTab}
          </Button>
        </form>
      </Card>

      {mode === "setup" &&
        (forced ? (
          <p className="mt-4 text-xs text-ink-muted">{t.setupForcedHint}</p>
        ) : (
          <div className="mt-6 border-t border-line pt-6">
            <Button
              className="w-full"
              loading={pending && skipping}
              disabled={pending}
              onClick={() => {
                setSkipping(true);
                run(setUpWithoutAccounts);
              }}
            >
              {t.setupSkip}
            </Button>
            <p className="mt-2 text-xs text-ink-muted">{t.setupSkipHint}</p>
          </div>
        ))}

      <LanguagePicker variant="names" className="mt-8" />
    </main>
  );
}
