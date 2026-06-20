import { redirect } from "next/navigation";
import UsersAdminClient from "@/components/admin/users-admin-client";
import { getSessionUser } from "@/lib/auth/session";
export default async function AdminUsersPage(){const user=await getSessionUser(); if(!user) redirect('/login'); if(user.role!=='ADMIN') redirect('/dashboard'); return <UsersAdminClient/>}
