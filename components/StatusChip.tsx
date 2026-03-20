import { UploadStatus } from "@/lib/types";

export function StatusChip({ status }: { status: UploadStatus }) {
  const map = {
    done:      "bg-emerald-500/10 text-emerald-400",
    uploading: "bg-amber-400/10 text-amber-300",
    error:     "bg-red-500/10 text-red-400",
    pending:   "bg-white/5 text-[#4a5252]",
  };
  const labels = { done: "Ready", uploading: "…", error: "Error", pending: "Wait" };
  return (
    <span className={`mono text-[9px] px-2 py-0.5 rounded-full shrink-0 ${map[status]}`}>
      {labels[status]}
    </span>
  );
}
