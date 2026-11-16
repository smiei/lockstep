// The project's public links, in one place so a repository rename is one edit.
export const REPO_URL = "https://github.com/smiei/lockstep";
// The chooser offers the "Report a data mistake" template (.github/ISSUE_TEMPLATE).
export const REPORT_ISSUE_URL = `${REPO_URL}/issues/new/choose`;

// "Report a bug" / "Suggest a feature" (Settings, the start page): the issue
// form of that kind, with the app version already filled in - the one thing
// a reporter would otherwise have to look up. The field ids are the ones in
// .github/ISSUE_TEMPLATE/bug.yml and feature.yml.
export function feedbackUrl(kind: "bug" | "feature", version: string): string {
  return `${REPO_URL}/issues/new?template=${kind}.yml&version=${encodeURIComponent(version)}`;
}
