"use client";

import { Heart } from "lucide-react";
import { formatSavedDay, isNewItem, isoWeekKey } from "@/lib/inspo/weeks";
import { STATUS_COLOR, statusInk, type InspoItem } from "@/lib/inspo/types";

function kindLabel(item: InspoItem): string {
  if (item.type === "hook") return item.source === "Instagram" ? "Hook · IG" : "Hook";
  if (item.type === "texto") return "Texto · IG";
  if (item.source === "Vogue") return "Vogue";
  if (item.source === "Pinterest") return "Pinterest";
  if (item.source === "Drive") return "Drive";
  return item.source;
}

export function Card({
  item,
  now,
  onOpen,
  onHeart,
}: {
  item: InspoItem;
  now: string;
  onOpen: (id: string) => void;
  onHeart: (id: string) => void;
}) {
  const fresh = isNewItem(item.savedAt, now);
  const hearted = item.weekKey === isoWeekKey(now);
  const hasImage = Boolean(item.imagePath || item.imageUrl);
  const tags = item.tags.filter((tag) => tag !== item.pillar).slice(0, 3);
  return (
    <article className="border border-[#161216] bg-white">
      <div className="shot">
        <button type="button" onClick={() => onOpen(item.id)}>
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imagePath || item.imageUrl} alt="" />
          ) : (
            <div className="grid min-h-44 place-items-center bg-[#E7D52B] px-4 py-8">
              <p className="meta">Sin captura</p>
            </div>
          )}
        </button>
        <div className="card-badges">
          <span className="meta kind">{kindLabel(item)}</span>
          {fresh ? <span className="nuevo">Nuevo</span> : null}
          {item.status ? (
            <span className="meta" style={{ background: STATUS_COLOR[item.status], color: statusInk(item.status), padding: "3px 6px" }}>
              {item.status}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          aria-pressed={hearted}
          aria-label={hearted ? "Quitar de Esta semana" : "Sumar a Esta semana"}
          onClick={() => onHeart(item.id)}
          className="heart"
        >
          <Heart className="size-4" fill={hearted ? "#161216" : "none"} />
        </button>
      </div>
      <button type="button" onClick={() => onOpen(item.id)} className="caption">
        <h3 className={item.type === "hook" ? "hook-title" : undefined}>
          {item.type === "hook" ? `“${item.title}”` : item.title}
        </h3>
        <div className="tag-row">
          {item.pillar ? <span className="meta">{item.pillar}</span> : null}
          {tags.map((tag) => (
            <span key={tag} className="meta">
              {tag}
            </span>
          ))}
        </div>
        <p className="meta source-line">
          {item.account ? `@${item.account.replace(/^@/, "")}` : item.source} · {formatSavedDay(item.savedAt)}
          {" · "}
          {item.notionUrl ? "Notion" : "sin Notion"}
          {" · "}
          {item.driveUrl ? "Drive" : hasImage ? "captura local" : "sin captura"}
        </p>
      </button>
    </article>
  );
}
