import { redirect } from "next/navigation";
import AdminMessagingClient from "@/components/admin/admin-messaging-client";
import { getSessionUser } from "@/lib/auth/session";
export default async function AdminMessagesPage(){const user=await getSessionUser(); if(!user) redirect('/login'); if(user.role!=='ADMIN') redirect('/dashboard'); return <AdminMessagingClient/>}
