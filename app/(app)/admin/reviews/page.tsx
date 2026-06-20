import { redirect } from "next/navigation";
import AdminReviewsClient from "@/components/reviews/admin-reviews-client";
import { getSessionUser } from "@/lib/auth/session";

export default async function AdminReviewsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return <AdminReviewsClient />;
}
