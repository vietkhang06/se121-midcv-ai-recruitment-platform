import { Suspense } from "react";
import { NotificationsWorkspace } from "@/components/inbox/NotificationsWorkspace";
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="inbox-workspace" role="status">
          Đang tải… / Loading…
        </main>
      }
    >
      <NotificationsWorkspace />
    </Suspense>
  );
}
