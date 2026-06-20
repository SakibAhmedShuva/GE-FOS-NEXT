# API Route Parity Map

Every old Flask route below must be either replaced by a Next.js route handler/service or intentionally retired with written approval. None are approved for silent removal.

| Old Flask route/event | New Next.js/Node route/service | Notes |
| --- | --- | --- |
| `GET /` | `app/(default)/page.tsx` or redirect to `/dashboard` | Public landing only, not core workflow |
| `GET /static/<path>` | Next static/public assets | No business logic |
| `GET /get_tnc/<template_name>` | `GET /api/settings/tnc/[templateName]` | Sanitize HTML |
| `GET /get_cover_thumbnail/<filename>` | `GET /api/covers/[id]/thumbnail` | Permission/storage-key based |
| `GET /get_covers` | `GET /api/covers` | Searchable cover list |
| `POST /upload_cover` | `POST /api/covers` | Validate PDF only |
| `POST /reinitialize` | `POST /api/admin/catalog/reindex` | Admin-only background job |
| `GET /get_activity_log` | `GET /api/admin/activity` | Admin-only |
| `GET /download_fo/<filename>` | `GET /api/exports/[id]/download` | Permission checked |
| `POST /login` | `POST /api/auth/login` | Hash/session auth |
| `POST /update_user` | `PATCH /api/users/me` and `PATCH /api/admin/users/[id]` | Split self/admin |
| `GET /get_sheet_names` | `GET /api/catalog/sheet-names` | DB product types |
| `GET /get_filter_options` | `GET /api/catalog/filter-options` | DB distinct filters |
| `GET /get_offer_config` | `GET /api/settings/offer-config` | Server settings |
| `GET /search_clients` | `GET /api/clients/search` | DB search |
| `GET /search_items` | `GET /api/catalog/search` | Preserve negative keywords |
| `POST /project` | `POST /api/projects` | Typed project save |
| `GET /projects` | `GET /api/projects?scope=mine` | Current user only |
| `GET /all_projects_for_admin` | `GET /api/admin/projects` | Admin-only |
| `GET /project/<id>` | `GET /api/projects/[id]` | Permission checked |
| `DELETE /project/<id>` | `DELETE /api/projects/[id]` | Delivered restricted |
| `POST /project/reference/<id>` | `PATCH /api/projects/[id]/reference` | Permission checked |
| `POST /project/status/<id>` | `PATCH /api/projects/[id]/status` | Permission checked |
| `POST /export_pdf` | `POST /api/exports/offer/pdf` | Shared document model |
| `POST /export_xlsx` | `POST /api/exports/offer/xlsx` | Shared document model |
| `POST /export_built_po` | `POST /api/exports/purchase-order` | Admin-only |
| `POST /ai_helper/process_file` | `POST /api/ai-helper/process-file` | Upload validation |
| `POST /submit_review_request` | `POST /api/reviews` | Current user only |
| `GET /get_my_requests` | `GET /api/reviews/mine` | Current user only |
| `GET /get_admin_requests` | `GET /api/admin/reviews` | Admin-only |
| `POST /update_review_request/<id>` | `PATCH /api/reviews/[id]` | Owner checked |
| `POST /process_admin_request` | `POST /api/admin/reviews/[id]/process` | Admin-only |
| `GET /get_notifications` | `GET /api/notifications` | Current user only |
| `POST /mark_notification_read` | `PATCH /api/notifications/[id]/read` | Owner checked |
| `POST /delete_notification` | `DELETE /api/notifications/[id]` | Owner checked |
| `POST /share_project` | `POST /api/projects/[id]/shares` | Owner/admin only |
| `GET /get_shared_projects` | `GET /api/projects?scope=shared` | Current user only |
| `POST /send_message` | `POST /api/admin/messages` | Admin-only |
| `GET /get_all_users` | `GET /api/admin/users` | Admin-only; optional limited `/api/users` for sharing |
| `GET /get_new_challan_ref` | `POST /api/challans/next-reference` | Transaction-safe |
| `POST /export_challan` | `POST /api/exports/challan` | Updates challan log |
| `POST /convert_to_words` | `POST /api/utils/amount-to-words` | Or server-only utility |
| `POST /update_master_price` | `PATCH /api/admin/catalog/items/[id]/price` | Admin-only |
| `POST /autofill_master_prices` | `POST /api/admin/catalog/autofill-installation` | Admin-only |
| `POST /upload_chat_attachment` | `POST /api/chat/attachments` | Conversation/member checked |
| `GET /chat_attachment/<filename>` | `GET /api/chat/attachments/[id]` | Storage-key and permission checked |
| `GET /chat_history/<user1>/<user2>` | `GET /api/chat/conversations/[userId]/messages` | Current user only |
| Socket `connect` | `/chat` Socket.IO namespace or realtime service | Authenticated sockets only |
| Socket `user_online` | presence service | Never trust supplied email alone |
| Socket `disconnect` | presence service | Clean socket/presence row |
| Socket `private_message` | chat message service | Persist then emit |

