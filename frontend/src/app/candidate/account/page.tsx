import { Suspense } from "react";
import { AccountWorkspace } from "@/components/inbox/AccountWorkspace";
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="inbox-workspace" role="status">
          Đang tải… / Loading…
        </main>
      }
    >
      <AccountWorkspace />
    </Suspense>
  );
}
