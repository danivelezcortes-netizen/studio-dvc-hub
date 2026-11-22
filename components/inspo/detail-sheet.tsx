"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ItemForm, draftFromItem } from "./item-form";
import { formatSavedDay, formatStamp } from "@/lib/inspo/weeks";
import { PILLAR_LABEL, STATUS_COLOR, TYPE_LABEL, statusInk, type InspoItem, type ItemInput } from "@/lib/inspo/types";

export function DetailSheet({
  item,
  open,
  onOpenChange,
  onSave,
  onDelete,
  onAddNote,
  onEditNote,
  busy,
}: {
  item: InspoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: ItemInput, file: File | null, removeImage: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddNote: (text: string) => Promise<void>;
  onEditNote: (noteId: string, text: string) => Promise<void>;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ItemInput | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [note, setNote] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [confirming, setConfirming] = useState(false);

  function startEdit() {
    if (!item) return;
    setDraft(draftFromItem(item));
    setFile(null);
    setRemoveImage(false);
    setEditing(true);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setEditing(false);
          setConfirming(false);
        }
        onOpenChange(next);
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto border-l border-[#161216] bg-white p-0 sm:max-w-[560px]">
        {item ? (
          <div>
            <div className="relative bg-[#f4f4f4]">
              {item.imagePath || item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imagePath || item.imageUrl} alt="" className="max-h-[70vh] w-full object-contain bg-white" />
              ) : (
                <div className="grid min-h-48 place-items-center bg-[#E7D52B]">
                  <p className="meta">Sin captura</p>
                </div>
              )}
            </div>
            <div className="grid gap-5 px-5 py-5">
              <div>
                <p className="meta">{TYPE_LABEL[item.type]}</p>
                <SheetTitle className="hook-title mt-1 text-[2rem] text-[#161216]">{item.title}</SheetTitle>
                <SheetDescription className="meta mt-2 text-[#5c585e]">
                  {item.source}
                  {item.account ? ` · ${item.account}` : ""} · {formatSavedDay(item.savedAt)}
                </SheetDescription>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span key={tag} className="meta border border-[#161216] px-2 py-1">
                    {tag}
                  </span>
                ))}
                {item.pillar ? <span className="meta bg-[#161216] px-2 py-1 text-white">{PILLAR_LABEL[item.pillar]}</span> : null}
                {item.status ? (
                  <span className="meta px-2 py-1" style={{ background: STATUS_COLOR[item.status], color: statusInk(item.status) }}>
                    {item.status}
                  </span>
                ) : null}
              </div>

              {editing && draft ? (
                <ItemForm
                  value={draft}
                  onChange={setDraft}
                  file={file}
                  onFile={setFile}
                  existingImage={item.imagePath || item.imageUrl}
                  removeImage={removeImage}
                  onRemoveImage={setRemoveImage}
                />
              ) : (
                <>
                  <section className="border-l-4 border-[#E7D52B] pl-3">
                    <h3 className="meta">Cómo puede usarlo Studio DVC</h3>
                    <p className="mt-2 text-[15px] leading-relaxed">{item.howToUse || "Todavía no hay una nota de uso."}</p>
                  </section>
                  <section>
                    <h3 className="meta mb-2">Fuente</h3>
                    <dl className="grid gap-2 border border-[#161216] p-3">
                      <Row label="Cuenta" value={item.account || "—"} />
                      <Row label="Origen" value={item.origin || "—"} />
                      <Row label="Enlace" value={item.sourceUrl ? item.sourceUrl : "—"} href={item.sourceUrl || undefined} />
                      <Row label="Imagen original" value={item.imageUrl || "—"} href={item.imageUrl || undefined} />
                      <Row label="Fecha guardada" value={formatSavedDay(item.savedAt)} />
                      <Row label="Añadido por" value={item.addedBy} />
                      <Row label="Sonido" value={item.sound || "—"} />
                      <Row label="Notion" value={item.notionUrl ? "Abrir página" : "Sin página enlazada"} href={item.notionUrl || undefined} />
                      <Row label="Drive" value={item.driveUrl ? "Abrir archivo" : "Sin archivo en Drive"} href={item.driveUrl || undefined} />
                    </dl>
                  </section>
                  <section>
                    <h3 className="meta mb-2">Notas</h3>
                    {item.notes.length === 0 ? <p className="text-sm text-[#5c585e]">Sin notas todavía.</p> : null}
                    <ul className="grid gap-3">
                      {item.notes.map((entry) => (
                        <li key={entry.id} className="border border-[#161216] p-3">
                          <p className="meta text-[#5c585e]">
                            {formatStamp(entry.createdAt)}
                            {entry.updatedAt !== entry.createdAt ? " · editada" : ""}
                          </p>
                          {editingNote === entry.id ? (
                            <div className="mt-2 grid gap-2">
                              <Textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} className="min-h-20 rounded-none border-[#161216]" />
                              <div className="flex gap-2">
                                <Button type="button" disabled={busy} className="h-10 rounded-none bg-[#E7D52B] text-[#161216]" onClick={() => onEditNote(entry.id, noteDraft).then(() => setEditingNote(null))}>
                                  Guardar nota
                                </Button>
                                <Button type="button" variant="outline" className="h-10 rounded-none border-[#161216]" onClick={() => setEditingNote(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="mt-2 text-sm leading-relaxed">{entry.text}</p>
                              <button
                                type="button"
                                className="meta mt-2 underline"
                                onClick={() => {
                                  setEditingNote(entry.id);
                                  setNoteDraft(entry.text);
                                }}
                              >
                                Editar
                              </button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    <form
                      className="mt-3 grid gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const text = note.trim();
                        if (!text) return;
                        void onAddNote(text).then(() => setNote(""));
                      }}
                    >
                      <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Una nota con fecha" className="min-h-20 rounded-none border-[#161216]" />
                      <Button type="submit" disabled={busy || !note.trim()} className="h-10 rounded-none bg-[#161216] text-white">
                        Añadir nota
                      </Button>
                    </form>
                  </section>
                </>
              )}

              <div className="flex flex-wrap gap-2 border-t border-[#161216] pt-4">
                {editing && draft ? (
                  <>
                    <Button
                      type="button"
                      disabled={busy}
                      className="h-11 rounded-none bg-[#E7D52B] px-4 text-[#161216]"
                      onClick={() => {
                        void onSave(draft, file, removeImage)
                          .then(() => {
                            setEditing(false);
                            setFile(null);
                          })
                          .catch(() => undefined);
                      }}
                    >
                      Guardar cambios
                    </Button>
                    <Button type="button" variant="outline" className="h-11 rounded-none border-[#161216]" onClick={() => setEditing(false)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button type="button" className="h-11 rounded-none bg-[#161216] px-4 text-white" onClick={startEdit}>
                    Editar
                  </Button>
                )}
                {confirming ? (
                  <div className="flex w-full flex-wrap items-center gap-2 border border-[#FF2D9A] p-3">
                    <p className="text-sm">¿Borrar esta referencia? No se puede deshacer.</p>
                    <Button type="button" disabled={busy} className="h-10 rounded-none bg-[#FF2D9A] text-white" onClick={() => onDelete()}>
                      Sí, borrar
                    </Button>
                    <Button type="button" variant="outline" className="h-10 rounded-none border-[#161216]" onClick={() => setConfirming(false)}>
                      No
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="h-11 rounded-none border-[#FF2D9A] text-[#FF2D9A]" onClick={() => setConfirming(true)}>
                    Borrar
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm">
      <dt className="meta text-[#5c585e]">{label}</dt>
      <dd className="min-w-0 break-words">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="underline">
            {value.startsWith("http") ? "Abrir" : value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
