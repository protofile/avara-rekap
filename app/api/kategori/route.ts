import { masterDataHandlers } from "@/lib/masterData";

export const dynamic = "force-dynamic";

export const { GET, POST, PUT, DELETE } = masterDataHandlers({
  table: "kategori",
  label: "kategori",
  readAccess: "user", // technicians pick a kategori on the report form
  usedBy: { table: "laporan", column: "kategori_id", where: "laporan" },
});
