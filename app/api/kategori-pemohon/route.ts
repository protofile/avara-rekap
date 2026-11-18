import { masterDataHandlers } from "@/lib/masterData";

export const dynamic = "force-dynamic";

export const { GET, POST, PUT, DELETE } = masterDataHandlers({
  table: "kategori_pemohon",
  label: "kategori pemohon",
  readAccess: "admin",
});
