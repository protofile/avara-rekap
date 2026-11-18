import { masterDataHandlers } from "@/lib/masterData";

export const dynamic = "force-dynamic";

export const { GET, POST, PUT, DELETE } = masterDataHandlers({
  table: "region",
  label: "region",
  readAccess: "user", // technicians pick a region on the report form
  usedBy: { table: "laporan", column: "region_id", where: "laporan" },
});
