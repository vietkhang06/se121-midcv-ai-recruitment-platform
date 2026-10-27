import { Suspense } from "react";
import { MessagesWorkspace } from "@/components/inbox/MessagesWorkspace";
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="inbox-workspace" role="status">
          Đang tải… / Loading…
        </main>
      }
    >
      <MessagesWorkspace />
    </Suspense>
  );
}
