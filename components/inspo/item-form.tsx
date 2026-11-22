"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ADDED_BY, CHIP_TAGS, ITEM_TYPES, PILLARS, SOURCES, STATUSES, TYPE_LABEL, type InspoItem, type ItemInput } from "@/lib/inspo/types";

export function emptyDraft(): ItemInput {
  return {
    title: "",
    type: "imagen",
    tags: [],
    pillar: "",
    status: "",
    source: "Manual",
    sourceUrl: "",
    account: "",
    origin: "",
    addedBy: "Daniela",
    savedAt: new Date().toISOString().slice(0, 10),
    driveUrl: "",
    notionUrl: "",
    howToUse: "",
    sound: "",
    frame: null,
    addToWeek: false,
    imageUrl: "",
    externalId: crypto.randomUUID(),
  };
}

export function draftFromItem(item: InspoItem): ItemInput {
  return {
    title: item.title,
    type: item.type,
    tags: item.tags,
    pillar: item.pillar,
    status: item.status,
    source: item.source,
    sourceUrl: item.sourceUrl,
    account: item.account,
    origin: item.origin,
    addedBy: item.addedBy,
    savedAt: item.savedAt.slice(0, 10),
    imageUrl: item.imageUrl,
    driveUrl: item.driveUrl,
    notionUrl: item.notionUrl,
    howToUse: item.howToUse,
    sound: item.sound,
    frame: item.frame,
    externalId: item.externalId,
    addToWeek: false,
  };
}

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-1.5">
      <span className="meta">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full border border-[#161216] bg-white px-2 font-mono text-xs tracking-wide"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ItemForm({
  value,
  onChange,
  file,
  onFile,
  existingImage,
  showWeek,
  removeImage,
  onRemoveImage,
}: {
  value: ItemInput;
  onChange: (next: ItemInput) => void;
  file: File | null;
  onFile: (file: File | null) => void;
  existingImage?: string | null;
  showWeek?: boolean;
  removeImage?: boolean;
  onRemoveImage?: (remove: boolean) => void;
}) {
  const [tagDraft, setTagDraft] = useState("");
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const tags = useMemo(() => {
    const all = new Set<string>([...CHIP_TAGS, ...value.tags]);
    return [...all];
  }, [value.tags]);
  function patch(partial: Partial<ItemInput>) {
    onChange({ ...value, ...partial });
  }

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || value.tags.includes(tag)) return;
    patch({ tags: [...value.tags, tag] });
    setTagDraft("");
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="meta">Título</span>
        <Input
          value={value.title}
          onChange={(event) => patch({ title: event.target.value })}
          className="h-11 rounded-none border-[#161216] text-base"
          required
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice
          label="Tipo"
          value={value.type}
          onChange={(type) => patch({ type: type as ItemInput["type"] })}
          options={ITEM_TYPES.map((type) => ({ value: type, label: TYPE_LABEL[type] }))}
        />
        <Choice
          label="Fuente"
          value={value.source}
          onChange={(source) => patch({ source: source as ItemInput["source"] })}
          options={SOURCES.map((source) => ({ value: source, label: source }))}
        />
        <Choice
          label="Pilar"
          value={value.pillar || "none"}
          onChange={(pillar) => patch({ pillar: pillar === "none" ? "" : (pillar as ItemInput["pillar"]) })}
          options={[{ value: "none", label: "Sin pilar" }, ...PILLARS.map((pillar) => ({ value: pillar, label: pillar }))]}
        />
        <Choice
          label="Estado"
          value={value.status || "none"}
          onChange={(status) => patch({ status: status === "none" ? "" : (status as ItemInput["status"]) })}
          options={[{ value: "none", label: "Sin estado" }, ...STATUSES.map((status) => ({ value: status, label: status }))]}
        />
      </div>
      <div>
        <p className="meta mb-2">Etiquetas</p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const on = value.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => patch({ tags: on ? value.tags.filter((item) => item !== tag) : [...value.tags, tag] })}
                className={`meta border border-[#161216] px-2 py-1 ${on ? "bg-[#E7D52B]" : "bg-white"}`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <Input
          value={tagDraft}
          onChange={(event) => setTagDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag(tagDraft);
            }
          }}
          placeholder="Nueva etiqueta y Enter"
          className="mt-2 h-11 rounded-none border-[#161216]"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="meta">Cuenta</span>
          <Input value={value.account} onChange={(event) => patch({ account: event.target.value })} className="h-11 rounded-none border-[#161216]" />
        </label>
        <label className="grid gap-1.5">
          <span className="meta">Enlace</span>
          <Input value={value.sourceUrl} onChange={(event) => patch({ sourceUrl: event.target.value })} className="h-11 rounded-none border-[#161216]" placeholder="https://" />
        </label>
        <label className="grid gap-1.5">
          <span className="meta">Origen</span>
          <Input value={value.origin} onChange={(event) => patch({ origin: event.target.value })} className="h-11 rounded-none border-[#161216]" />
        </label>
        <Choice
          label="Añadido por"
          value={value.addedBy}
          onChange={(addedBy) => patch({ addedBy: addedBy as ItemInput["addedBy"] })}
          options={ADDED_BY.map((name) => ({ value: name, label: name }))}
        />
        <label className="grid gap-1.5">
          <span className="meta">Fecha guardada</span>
          <Input type="date" value={value.savedAt} onChange={(event) => patch({ savedAt: event.target.value })} className="h-11 rounded-none border-[#161216]" />
        </label>
        <label className="grid gap-1.5">
          <span className="meta">Sonido</span>
          <Input value={value.sound} onChange={(event) => patch({ sound: event.target.value })} className="h-11 rounded-none border-[#161216]" />
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="meta">Cómo puede usarlo Studio DVC</span>
        <Textarea value={value.howToUse} onChange={(event) => patch({ howToUse: event.target.value })} className="min-h-28 rounded-none border-[#161216]" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="meta">Página de Notion</span>
          <Input value={value.notionUrl} onChange={(event) => patch({ notionUrl: event.target.value })} className="h-11 rounded-none border-[#161216]" />
        </label>
        <label className="grid gap-1.5">
          <span className="meta">Archivo de Drive</span>
          <Input value={value.driveUrl} onChange={(event) => patch({ driveUrl: event.target.value })} className="h-11 rounded-none border-[#161216]" />
        </label>
      </div>
      <div>
        <p className="meta mb-2">Imagen o captura</p>
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) {
              onFile(dropped);
              onRemoveImage?.(false);
            }
          }}
          className={`grid cursor-pointer gap-2 border border-dashed border-[#161216] p-4 ${over ? "bg-[#E7D52B]" : "bg-white"}`}
        >
          <span className="text-sm">Suelta la imagen aquí o elige un archivo.</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="text-sm"
            onChange={(event) => {
              onFile(event.target.files?.[0] ?? null);
              onRemoveImage?.(false);
            }}
          />
        </label>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="mt-2 max-h-48 w-full object-contain" />
        ) : existingImage && !removeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={existingImage} alt="" className="mt-2 max-h-48 w-full object-contain" />
        ) : (
          <p className="meta mt-2">Sin captura</p>
        )}
        {existingImage && onRemoveImage ? (
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(removeImage)} onChange={(event) => onRemoveImage(event.target.checked)} />
            Quitar la imagen
          </label>
        ) : null}
      </div>
      {showWeek ? (
        <label className="flex items-center justify-between gap-3 border border-[#161216] px-3 py-3">
          <span className="text-sm">Agregar a Esta semana</span>
          <Switch checked={Boolean(value.addToWeek)} onCheckedChange={(checked) => patch({ addToWeek: checked })} />
        </label>
      ) : null}
    </div>
  );
}
