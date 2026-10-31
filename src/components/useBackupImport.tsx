"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unzipSync } from "fflate";
import { importBackup } from "@/lib/actions";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { rememberRun } from "@/lib/visitedRuns";
import { formatActionError } from "@/lib/actionErrors";
import { BACKUP_FORMAT, BACKUP_VERSION, parseBackup, type BackupFile } from "@/lib/backupParse";
import { translations, type Lang } from "@/lib/i18n/dictionary";
import { ImportBackupDialog } from "@/components/ImportBackupDialog";
import { useToast } from "@/components/ui/ToastProvider";

// Importing a backup file, shared by the gear menu and the start page: a
// hidden file picker, the parse (a .json or a .zip of them), the naming
// dialog and the import itself. Render `elements` once and call `pick()`.
// `openPath` is where a public instance opens the first imported run - it has
// no list of runs to show it in.
export function useBackupImport({
  lang,
  existingNames,
  openPath,
}: {
  lang: Lang;
  existingNames: string[];
  openPath: string;
}) {
  const t = translations[lang].backup;
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [importState, setImportState] = useState<{ json: string; runs: { name: string }[] } | null>(
    null,
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-picking the same file later
    if (!file) return;

    let json: string;
    if (file.name.toLowerCase().endsWith(".zip")) {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
      const decoder = new TextDecoder();
      const parts = Object.values(entries)
        .map((bytes) => parseBackup(decoder.decode(bytes)))
        .filter((b): b is BackupFile => b !== null);
      if (parts.length === 0) {
        toast.error(formatActionError({ key: "backupInvalid" }, lang));
        return;
      }
      const merged: BackupFile = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        runs: parts.flatMap((p) => p.runs),
      };
      json = JSON.stringify(merged);
    } else {
      json = await file.text();
    }
    const parsed = parseBackup(json);
    if (!parsed) {
      toast.error(formatActionError({ key: "backupInvalid" }, lang));
      return;
    }
    if (parsed.runs.length === 0) {
      toast.error(formatActionError({ key: "backupEmpty" }, lang));
      return;
    }
    // A file newer than this build understands - an older build reading it
    // would silently drop fields it doesn't know about yet (fusions
    // included). Not a hard stop: the import is still lenient/best-effort.
    if (parsed.version > BACKUP_VERSION) {
      toast.info(t.importNewerVersion);
    }
    // Naming is asked for every time (see ImportBackupDialog) rather than
    // reusing the backup's stored name - re-importing an old backup of a run
    // that's since moved on used to silently shadow the newer run under the
    // same name.
    setImportState({ json, runs: parsed.runs.map((r) => ({ name: r.name })) });
  }

  function handleConfirm(names: string[]) {
    if (!importState) return;
    startTransition(async () => {
      const result = await importBackup(importState.json, names);
      if (result.success) {
        setImportState(null);
        if (IS_PUBLIC_INSTANCE && result.runKeys.length > 0) {
          // Nothing lists every run here, so an imported run this browser does
          // not remember would be unreachable. Remember all, open the first.
          for (const key of [...result.runKeys].reverse()) rememberRun(key);
          router.push(`${openPath}?run=${result.runKeys[0]}`);
        } else {
          router.refresh();
        }
        toast.success(t.importSuccess(result.runKeys.length));
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  const elements = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json,application/zip,.zip"
        onChange={handleFileChange}
        className="hidden"
        aria-label={t.import}
      />
      {importState && (
        <ImportBackupDialog
          lang={lang}
          pending={pending}
          runs={importState.runs}
          existingNames={existingNames}
          onClose={() => setImportState(null)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );

  return { pending, pick: () => fileInputRef.current?.click(), elements };
}
