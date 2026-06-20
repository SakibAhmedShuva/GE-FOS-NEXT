import { redirect } from "next/navigation";
import CatalogAdminClient from "@/components/admin/catalog-admin-client";
import { getSessionUser } from "@/lib/auth/session";
export default async function AdminCatalogPage(){const user=await getSessionUser(); if(!user) redirect('/login'); if(user.role!=='ADMIN') redirect('/dashboard'); return <CatalogAdminClient/>}
