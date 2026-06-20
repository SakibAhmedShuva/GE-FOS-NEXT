# Legacy Feature Matrix — Locked Before UI Work

This file is the migration contract. Any Next.js/Node implementation must preserve these workflows before the old Flask system is retired.

## Source inventory

| Area | Legacy source files | Migration status |
| --- | --- | --- |
| Backend routes/auth/projects/exports/reviews/chat | `app.py` | Locked for API parity |
| PDF exports and PDF merge | `pdf_gen.py`, `cover_merger.py` | Must be reproduced with shared document model |
| XLSX exports | `xlsx_gen.py` | Must be reproduced with shared document model |
| Catalog/client import and FAISS search | `data_management.py` | Must be migrated to DB-backed search/index |
| HTML cleaning and amount words | `app_helpers.py` | Must be ported to server utilities |
| T&C templates | `tnc.py` | Must be migrated to DB/settings or typed constants |
| Offer builder | `static/offer.js` | Core workflow; do not simplify |
| Challan builder | `static/challan.js` | Core workflow; do not simplify |
| Purchase Order builder | `static/purchase-order.js` | Admin-only; do not expose to normal users |
| AI helper | `static/ai-helper.js` | Preserve upload, detection, match, selection, save |
| Chat UI | `static/chat.js` | Preserve online/private/minimized/attachment behavior |
| Main dashboard/login/projects/notifications/share/review | `static/main.js` | Split into feature routes, preserve behavior |
| Admin messaging | `static/messaging.js` | Admin-only notifications/messages |
| Activity log | `static/activity_log.js` | Admin-only read, append-only writes |
| Search result renderer | `static/search_result.js` | Replace with typed shared components |

## Legacy route count

- Flask routes locked: 46
- Socket.IO events locked: 4

## Data/storage count from uploaded stable system

| Data set | Count |
| --- | ---: |
| Project JSON files | 79 |
| Generated FOS files | 115 |
| Cover files | 14 |
| Chat attachments | 3 |
| Users | 11 |
| Root client CSV rows | 35 |
| Data-storage client CSV rows | 2 |
| Activity log rows | 940 |
| Review requests | 0 |
| Notifications | 20 |
| Project shares | 9 |
| Tasks | 0 |
| Chat history rows | 43 |
| Malformed project JSON files | 0 |

## Auth and users

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| Email/password login from `authorization/users.csv` | DB users, hashed passwords, secure session | `users`, `/api/auth/login` |
| Roles: `admin`, `user` | Server-side RBAC only | `requireUser`, `requireAdmin` |
| Profile update email/password | Hash new passwords, audit admin changes | `/api/users/me`, `/api/admin/users/[id]` |
| Admin-only tabs hidden in JS | Backend blocks non-admin requests | permission helpers |

## Client management

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| Client CSV search | DB search by name/address | `clients`, `/api/clients/search` |
| Client snapshot inside project | Preserve snapshot so old offers do not change | `projects.client_snapshot` |
| Add/edit clients | Admin client management | `/api/admin/clients` |

## Catalog and price list

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| Foreign price list workbook, multi-sheet | Import sheets as product types | `catalog_items`, `price_list_imports` |
| Local item workbook | Preserve `source_type=local` | `catalog_items.source_type` |
| Rich description HTML | Store sanitized HTML + plain text | `description_html`, `description_plain` |
| Filters: make/approvals/model/product type | Preserve all filters | `/api/catalog/filter-options`, `/api/catalog/search` |
| Negative search keywords | Preserve `-keyword` behavior | catalog search service |
| Update master price | Admin-only DB update + audit | `/api/admin/catalog/items/[id]` |
| Autofill installation price | Admin-only batch update + audit | `/api/admin/catalog/autofill-installation` |
| Reinitialize search index | Admin-only reindex/job | `/api/admin/catalog/reindex` |

## Offer builder

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| Offer reference/client/item selection | Route-based offer builder | `projects`, `project_items`, `offer_settings` |
| Foreign/local/custom items | Preserve source and catalog links | `project_items.source_type`, `catalog_item_id` |
| Rich row description editing | Sanitized editor, same export source | `project_items.description_html` |
| Qty/unit/prices/totals | Centralized calculation module | `lib/calculations/offer.ts` |
| Customs/conversion/markup | Server-owned settings + shared calculations | `offer_settings.financials` |
| Visible columns | Preserve for UI and export | `offer_settings.visible_columns` |
| Summary page/scope descriptions | Preserve exactly | `offer_settings.summary_scope_descriptions` |
| T&C state | Preserve | `offer_settings.tnc_state` |
| Signature include/exclude | Preserve | `offer_settings.include_signature` |
| Cover selection/upload/merge | Preserve | `covers`, `offer_settings.selected_cover_id` |
| Save/export/duplicate/reference update | Preserve with permissions | project and export services |

## Challan builder

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| New challan ref from `challan.xlsx` | Transaction-safe DB sequence | `challan_sequences` |
| Challan log in Excel | DB log first, optional XLSX export | `challan_logs` |
| Client, categories, items | Preserve | `projects`, `project_items` |
| Signature option | Preserve | project settings/metadata |
| PDF/XLSX export | Preserve filename/layout/data | `exports` |

## Purchase Order

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| Admin-only PO tab | Admin-only route and API | `/purchase-order/*`, `requireAdmin` |
| PO from selected/offer data | Preserve original offer reference | `projects.parent_project_id` |
| PO terms and financials | Preserve in project metadata/settings | `projects`, `project_items` |
| Built PO PDF/XLSX | Preserve | `exports` |

## Projects, shares, and status

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| My Projects | Only owned projects | `/api/projects?scope=mine` |
| Shared With Me | Only shared projects | `/api/projects?scope=shared` |
| Admin all projects | Admin-only | `/api/admin/projects` |
| Delivered delete restriction | Only admin can delete delivered project | project service |
| Admin save preserves owner | Do not steal ownership | project service |
| Reference update | Permission checked | `/api/projects/[id]/reference` |
| Share with edit/view | Preserve | `project_shares` |

## AI helper

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| Spreadsheet upload | Preserve | `/api/ai-helper/process-file` |
| Header/column detection | Preserve indices and fallback | `ai_helper_runs`, project metadata |
| Drop footer rows | Preserve | AI helper service |
| Foreign/local/both matching | Preserve source selection | catalog search/vector service |
| Top suggestions and user selection | Preserve | `ai_helper_matches` |
| Save AI helper project | Preserve `projectType=ai_helper` equivalent | `projects.project_type=AI_HELPER` |
| Convert/add selected rows to offer | Preserve | `/api/ai-helper/convert-to-offer` |

## Review requests

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| User submit/update/send to admin | Preserve visibility/status flow | `review_requests` |
| Admin approve/reject | Preserve | `/api/admin/reviews/[id]/process` |
| Approval updates master data | Update DB first, regenerate Excel if needed | catalog service |
| Notifications | Per-user notification rows | `notifications` |

## Notifications

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| CSV notification dropdown/badge | DB unread count | `notifications` |
| Mark read/delete | Verify ownership | `/api/notifications/[id]` |
| Admin/share/review messages | Typed notifications | `notifications.type` |
| Message HTML | Sanitized HTML | sanitizer service |

## Chat

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| Online list | Presence table/service | `user_presence` |
| Private messages | DB messages + realtime emit | `chat_messages` |
| Attachments | Storage keys, permission download | `chat_attachments` |
| Chat history CSV | Import to DB | migration scripts |
| Minimize/unread badges | Preserve UI behavior | chat components |

## Activity log

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| CSV activity log | Append-only DB log | `activity_logs` |
| Admin page | Admin-only | `/api/admin/activity` |
| Dirty CSV rows possible | Store migration errors, do not silently drop | `migration_errors` |

## Covers and exports

| Existing behavior | Required new behavior | Schema/API owner |
| --- | --- | --- |
| PDF covers and thumbnails | Storage + DB metadata | `covers` |
| Cover search | Search filename/project ref | `/api/covers` |
| Cover merge/resize | Preserve final PDF behavior | export service |
| Offer/PO/challan PDF/XLSX | Shared document model | `exports` |
| Download old generated files | Storage-linked exports | `exports.storage_key` |

## Acceptance rule

No feature is accepted as migrated unless:

1. Its legacy data imports.
2. Its permissions are server-checked.
3. Its UI can perform the old workflow.
4. Its API has validation.
5. Its action is logged where the old app logged it.
6. Its export/document output matches old business data.

