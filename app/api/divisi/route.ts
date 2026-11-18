import { masterDataHandlers } from "@/lib/masterData";

export const dynamic = "force-dynamic";

export const { GET, POST, PUT, DELETE } = masterDataHandlers({
  table: "divisi",
  label: "divisi",
  readAccess: "admin",
  usedBy: { table: "users", column: "divisi_id", where: "pemohon" },
});
