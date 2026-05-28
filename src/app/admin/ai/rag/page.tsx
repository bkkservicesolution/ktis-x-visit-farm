import { redirect } from "next/navigation";
import { RagIndexAdminClient } from "@/app/admin/ai/rag/RagIndexAdminClient";
import { canAccessAdminAiRag } from "@/lib/adminAiRagAccess";

export default async function AdminAiRagPage() {
  if (!(await canAccessAdminAiRag())) {
    redirect("/admin/ai");
  }

  return <RagIndexAdminClient />;
}
