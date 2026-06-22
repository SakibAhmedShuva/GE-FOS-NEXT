"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  passwordResetRequired: boolean;
  signatureStorageKey?: string | null;
};

export default function UsersAdminClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [signatureStorageKey, setSignatureStorageKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/users");
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Load failed");
    setUsers(body.users || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function create() {
    setError(null);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, signatureStorageKey: signatureStorageKey || null }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Create failed");
      return;
    }
    setMessage("User created");
    setName("");
    setEmail("");
    setPassword("");
    setSignatureStorageKey("");
    await load();
  }

  async function update(user: UserRow, data: Record<string, unknown>) {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Update failed");
      return;
    }
    setMessage("User updated");
    await load();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Admin users</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">User Management</h1>
        <p className="mt-2 text-sm text-slate-500">Assign per-user signature storage keys for document PDF stamping.</p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm grid gap-3 md:grid-cols-6">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Temp password" type="password" className="rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
        <select value={role} onChange={(event) => setRole(event.target.value as "ADMIN" | "USER")} className="rounded-xl border-slate-300 px-3 py-2.5 text-sm">
          <option>USER</option>
          <option>ADMIN</option>
        </select>
        <input value={signatureStorageKey} onChange={(event) => setSignatureStorageKey(event.target.value)} placeholder="Signature storage key" className="rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
        <button onClick={create} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950">Create user</button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Signature</th>
              <th className="px-6 py-3">Active</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 font-semibold">{user.name}</td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">{user.role}</td>
                <td className="px-6 py-4 max-w-[260px] truncate text-xs text-slate-500">{user.signatureStorageKey || "Global/default"}</td>
                <td className="px-6 py-4">{user.isActive ? "Yes" : "No"}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => update(user, { role: user.role === "ADMIN" ? "USER" : "ADMIN" })} className="rounded-lg border px-3 py-2 text-xs font-bold">Toggle role</button>
                  <button onClick={() => update(user, { isActive: !user.isActive })} className="rounded-lg border px-3 py-2 text-xs font-bold">{user.isActive ? "Disable" : "Enable"}</button>
                  <button onClick={() => { const next = prompt("Signature storage key", user.signatureStorageKey || ""); if (next !== null) update(user, { signatureStorageKey: next || null }); }} className="rounded-lg border px-3 py-2 text-xs font-bold">Signature</button>
                  <button onClick={() => { const next = prompt("New password, min 8 chars"); if (next) update(user, { password: next }); }} className="rounded-lg border px-3 py-2 text-xs font-bold">Reset password</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
