export type MigrationStatus =
  | "locked"
  | "schema-ready"
  | "import-ready"
  | "api-ready"
  | "ui-ready"
  | "parity-tested";

export type LegacyFeature = {
  key: string;
  legacySources: string[];
  requiredNewOwners: string[];
  status: MigrationStatus;
  acceptanceChecks: string[];
};

export const legacyFeatureMatrix: LegacyFeature[] = [
  {
    key: "auth-users-rbac",
    legacySources: ["authorization/users.csv", "app.py:/login", "app.py:/update_user"],
    requiredNewOwners: ["users", "lib/auth", "lib/permissions", "/api/auth/login"],
    status: "schema-ready",
    acceptanceChecks: [
      "Plain passwords are not stored after migration.",
      "All user/admin permissions come from the server session.",
      "Normal users cannot hit admin APIs by changing frontend state.",
    ],
  },
  {
    key: "catalog-price-list-search",
    legacySources: ["data_management.py", "Price List 2017-Rev-Edited -All Item 2018.xlsx", "local_items.xlsx", "static/search_result.js"],
    requiredNewOwners: ["catalog_items", "price_list_imports", "/api/catalog/search", "/api/admin/catalog/reindex"],
    status: "schema-ready",
    acceptanceChecks: [
      "Foreign and local items import separately.",
      "Rich descriptions are preserved as sanitized HTML and plain text.",
      "Negative keyword search still works.",
      "Admin price update and installation autofill are audit logged.",
    ],
  },
  {
    key: "offer-builder",
    legacySources: ["static/offer.js", "pdf_gen.py", "xlsx_gen.py", "tnc.py", "cover_merger.py"],
    requiredNewOwners: ["projects", "project_items", "offer_settings", "lib/calculations/offer.ts", "lib/document-generation"],
    status: "schema-ready",
    acceptanceChecks: [
      "Existing offer projects load with the same items/settings.",
      "Totals match old UI and old export output.",
      "Visible columns, T&C, signature, summary, cover selection all persist.",
      "PDF and XLSX use the same centralized calculation output.",
    ],
  },
  {
    key: "challan-builder",
    legacySources: ["static/challan.js", "data_storage/challan.xlsx", "pdf_gen.py", "xlsx_gen.py"],
    requiredNewOwners: ["challan_sequences", "challan_logs", "projects", "project_items", "/api/challans/next-reference"],
    status: "schema-ready",
    acceptanceChecks: [
      "Challan reference generation is transaction-safe.",
      "Existing challan log imports before new writes.",
      "PDF/XLSX export updates the DB challan log.",
    ],
  },
  {
    key: "purchase-order-builder",
    legacySources: ["static/purchase-order.js", "app.py:/export_built_po", "pdf_gen.py", "xlsx_gen.py"],
    requiredNewOwners: ["projects", "project_items", "requireAdmin", "/api/exports/purchase-order"],
    status: "schema-ready",
    acceptanceChecks: [
      "PO routes and APIs are admin-only.",
      "Original offer reference is preserved when generated from offer.",
      "PO PDF/XLSX matches old business output.",
    ],
  },
  {
    key: "projects-shares-status",
    legacySources: ["data_storage/projects/*.json", "data_storage/project_shares.csv", "static/main.js"],
    requiredNewOwners: ["projects", "project_items", "project_shares", "project_activity"],
    status: "schema-ready",
    acceptanceChecks: [
      "My Projects only shows owned projects.",
      "Shared With Me only shows shared projects.",
      "Delivered projects can only be deleted by admin.",
      "Admin editing does not change owner.",
    ],
  },
  {
    key: "reviews-notifications",
    legacySources: ["data_storage/review_requests.csv", "data_storage/notifications.csv", "static/main.js"],
    requiredNewOwners: ["review_requests", "notifications", "/api/reviews", "/api/admin/reviews"],
    status: "schema-ready",
    acceptanceChecks: [
      "User-to-admin visibility flow is preserved.",
      "Admin approve/reject updates catalog through DB services.",
      "Unread badge, mark read, delete all verify user ownership.",
    ],
  },
  {
    key: "chat-presence-attachments",
    legacySources: ["static/chat.js", "data_storage/chat_history.csv", "data_storage/chat_attachments/*", "Socket.IO events"],
    requiredNewOwners: ["chat_messages", "chat_attachments", "user_presence", "chat realtime service"],
    status: "schema-ready",
    acceptanceChecks: [
      "Old chat history imports.",
      "Online list and private message work in realtime.",
      "Attachment download checks conversation membership.",
      "Minimize/restore and unread badges remain in UI.",
    ],
  },
  {
    key: "ai-helper-spreadsheet-matching",
    legacySources: ["static/ai-helper.js", "data_management.py", "FAISS index files"],
    requiredNewOwners: ["ai_helper_runs", "catalog vector/search service", "/api/ai-helper/process-file"],
    status: "locked",
    acceptanceChecks: [
      "Header detection, column detection, fallback mode, and footer dropping are preserved.",
      "Foreign/local/both match source selection works.",
      "Selected rows can be saved and converted into an offer.",
    ],
  },
  {
    key: "exports-covers-activity",
    legacySources: ["pdf_gen.py", "xlsx_gen.py", "cover_merger.py", "assets/covers/*", "data_storage/FOS/*", "data_storage/activity_log.csv"],
    requiredNewOwners: ["covers", "exports", "activity_logs", "migration_errors"],
    status: "schema-ready",
    acceptanceChecks: [
      "Generated files are archived or linked.",
      "Cover thumbnails and merge behavior are preserved.",
      "Activity log is append-only and malformed rows are reported.",
    ],
  },
];

export const featureCount = legacyFeatureMatrix.length;
