"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importGamePack, removeGamePack } from "@/lib/actions";
import { formatActionError } from "@/lib/actionErrors";
import { isCustomPackId } from "@/lib/gamePack";
import { translations, type Lang } from "@/lib/i18n/dictionary";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

// Under the New-Run dialog's game picker: import a game pack file (see
// docs/game-packs.md) and, for an imported game that is selected, remove it.
// The server validates the file with the repository's own rules and answers
// with the list of problems; they are shown right here, because a toast
// cannot hold "routes[12].names.de is required". Removing asks inline (two
// steps) - the dialog is already a Modal, and Modals must never nest.
export function CustomGameControls({
  lang,
  gameId,
  disabled,
  onImported,
  onRemoved,
}: {
  lang: Lang;
  // The game currently selected in the picker.
  gameId: string;
  disabled: boolean;
  onImported: (gameId: string) => void;
  onRemoved: () => void;
}) {
  const t = translations[lang].runSwitcher;
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [issues, setIssues] = useState<string[] | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (IS_PUBLIC_INSTANCE) return null;

  async function handleFile(file: File) {
    const json = await file.text();
    let label = file.name;
    try {
      label = JSON.parse(json)?.game?.names?.[lang] ?? JSON.parse(json)?.game?.names?.en ?? label;
    } catch {
      // Not JSON - the server says so in its answer.
    }
    setIssues(null);
    startTransition(async () => {
      const result = await importGamePack(json);
      if (result.success) {
        toast.success(t.imported(label));
        if (result.spritesPending) toast.info(t.spritesPending);
        router.refresh();
        onImported(result.gameId);
      } else if (result.issues?.length) {
        setIssues(result.issues);
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeGamePack(gameId);
      setConfirmRemove(false);
      if (result.success) {
        toast.success(t.gameRemoved);
        router.refresh();
        onRemoved();
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  const busy = disabled || pending;

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" loading={pending && !confirmRemove} disabled={busy} onClick={() => fileRef.current?.click()}>
          {pending && !confirmRemove ? t.importChecking : t.importGame}
        </Button>
        {isCustomPackId(gameId) &&
          (confirmRemove ? (
            <>
              <Button size="sm" variant="danger" loading={pending} disabled={busy} onClick={handleRemove}>
                {t.removeGameConfirm}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmRemove(false)}>
                {t.removeGameCancel}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmRemove(true)}>
              {t.removeGame}
            </Button>
          ))}
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label={t.importGame}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </div>
      <p className="mt-1 text-xs text-ink-subtle">{t.importHint}</p>
      {issues && (
        <div role="alert" className="mt-2 rounded-md border border-danger-line bg-danger-bg p-2 text-xs text-danger">
          <p className="mb-1 font-semibold">{t.importIssues}</p>
          <ul className="space-y-0.5 font-mono">
            {issues.slice(0, 8).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
            {issues.length > 8 && <li>… +{issues.length - 8}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
