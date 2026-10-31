import { FileText, Search } from "lucide-react";
import { Avatar, Button, Card, StatusBadge } from "../common";
import type { EmployerVerification } from "../../types";

interface VerificationRowProps {
  item: EmployerVerification;
  onPreview: (id: string, documentId: string) => void;
}

export default function VerificationRow({
  item,
  onPreview,
}: VerificationRowProps) {
  return (
    <Card className="grid min-h-[106px] items-center gap-5 rounded-xl px-5 py-5 shadow-[0_1px_2px_rgba(38,58,59,.04)] md:grid-cols-[minmax(240px,1fr)_minmax(290px,.72fr)_auto] max-[680px]:gap-4">
      <div className="flex items-center gap-3.5">
        <Avatar initials={item.initials} shape="square" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[13px] font-semibold">{item.company}</h2>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-1 text-[10px] text-muted">
            Submitted by {item.submittedBy} · {item.submittedAt}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 md:items-end">
        {item.documents.map((doc) => (
          <li
            key={doc.id}
            className="flex h-[28px] w-full items-center gap-2 rounded-md bg-[#f8faf9] px-2 text-[10px] text-[#718181] md:max-w-[270px]"
          >
            <FileText size={14} aria-hidden="true" className="shrink-0" />
            <span className="flex-1 truncate">{doc.name}</span>
            <button
              type="button"
              aria-label={`Preview ${doc.name}`}
              onClick={() => onPreview(item.id, doc.id)}
              className="grid place-items-center rounded p-0.5 hover:text-brand-600"
            >
              <Search size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 md:justify-end max-[680px]:w-full max-[680px]:[&>button]:flex-1">
        <Button
          variant="outline"
          onClick={() => onPreview(item.id, item.documents[0].id)}
          className="h-8 border-transparent bg-[#eef7f6] px-3 text-[10px] text-brand-700 hover:bg-[#e2f2ef] hover:text-brand-700"
        >
          Reopen review
        </Button>
      </div>
    </Card>
  );
}
