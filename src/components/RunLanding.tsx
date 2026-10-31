import { RunHome } from "@/components/RunHome";

// Rendered by every run-scoped page when resolveRunId found no run: a fresh
// install with none yet, or a public instance this browser holds no key for.
// It is the start page - the welcome, or the runs this browser may open.
export async function RunLanding() {
  return <RunHome />;
}
