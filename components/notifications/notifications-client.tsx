"use client";

import { useEffect, useState } from "react";

type NotificationRow = { id: string; title?: string | null; messageHtml: string; isRead: boolean; createdAt: string; type: string };

export default function NotificationsClient() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/notifications");
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Failed to load notifications");
    setRows(body.notifications || []);
    setUnread(body.unreadCount || 0);
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    await load();
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-950">Notifications</h1>
      <p className="mt-1 text-sm text-slate-500">Unread: {unread}</p>
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{row.type}</p>
                <h2 className="mt-1 font-bold text-slate-950">{row.title || "Notification"}</h2>
                <p className="mt-2 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: row.messageHtml }} />
              </div>
              {!row.isRead && <button onClick={() => markRead(row.id)} className="rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 ring-1 ring-cyan-200">Mark read</button>}
            </div>
          </article>
        ))}
        {!rows.length && <p className="text-sm text-slate-500">No notifications.</p>}
      </div>
    </section>
  );
}
