import { Pencil } from "lucide-react";
import { Card } from "../common";
import type { Category } from "../../types";

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
}

export default function CategoryCard({ category, onEdit }: CategoryCardProps) {
  return (
    <Card className="min-h-[190px] rounded-[14px] p-[18px] shadow-none max-[680px]:min-h-[175px]">
      <div className="flex items-start justify-between">
        <span className="grid size-10 place-items-center rounded-lg bg-brand-50 text-[13px] font-semibold text-brand-700">
          {category.name.charAt(0).toUpperCase()}
        </span>
        <button
          type="button"
          aria-label={`Edit ${category.name}`}
          onClick={() => onEdit(category)}
          className="grid size-8 place-items-center rounded-lg text-[#263638] hover:bg-canvas"
        >
          <Pencil size={14} />
        </button>
      </div>
      <h2 className="mt-[18px] text-[13px] font-semibold">{category.name}</h2>
      <p className="mt-2 line-clamp-2 min-h-8 text-[10px] leading-[1.55] text-[#718181]">
        {category.description || "No description"}
      </p>
      <p className="mt-5 text-[10px] text-[#718181]">
        <span className="font-bold text-[#263638]">{category.jobCount.toLocaleString()}</span> active jobs
      </p>
    </Card>
  );
}
