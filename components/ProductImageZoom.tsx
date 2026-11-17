"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

type Props = { src: string; alt: string; onError: () => void; discount?: number };
type Point = { x: number; y: number };
type View = Point & { scale: number };
const initialView: View = { scale: 1, x: 0, y: 0 };
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

export default function ProductImageZoom({ src, alt, onError, discount }: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLImageElement>(null);

  function followPointer(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (preview.current) {
      preview.current.style.transformOrigin = `${(event.clientX - rect.left) / rect.width * 100}% ${(event.clientY - rect.top) / rect.height * 100}%`;
      preview.current.style.transform = "scale(1.8)";
    }
  }

  function resetPreview() {
    if (preview.current) preview.current.style.transform = "scale(1)";
  }

  return <>
    <button
      ref={trigger}
      type="button"
      aria-label={`Agrandir l’image : ${alt}`}
      aria-haspopup="dialog"
      onClick={() => { resetPreview(); setOpen(true); }}
      onPointerEnter={followPointer}
      onPointerMove={followPointer}
      onPointerLeave={resetPreview}
      onPointerCancel={resetPreview}
      onBlur={resetPreview}
      className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl border border-gray-100 bg-white text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900]"
    >
      <Image ref={preview} src={src} alt={alt} fill sizes="(max-width: 1023px) 100vw, 600px"
        unoptimized={/^https?:\/\//i.test(src)} onError={onError} draggable={false}
        className="object-contain p-6 transition-[transform,transform-origin] duration-300 ease-out motion-reduce:transition-none sm:p-10" />
      {discount !== undefined && <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-[#65D900] px-3 py-1.5 text-xs font-extrabold text-black">−{discount} %</span>}
    </button>
    {open && <ImageLightbox src={src} alt={alt} onError={onError} onClose={() => {
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    }} />}
  </>;
}

function ImageLightbox({ src, alt, onError, onClose }: Omit<Props, "discount"> & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef({ moved: false, outside: false, start: { x: 0, y: 0 } });
  const current = useRef<View>(initialView);
  const [view, setView] = useState(initialView);
  const [dragging, setDragging] = useState(false);
  const [ratio, setRatio] = useState(1);
  const titleId = useId();
  const helpId = useId();

  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    document.body.style.overflow = "hidden";
    const animation = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? null
      : element.animate([{ opacity: 0, transform: "scale(.98)" }, { opacity: 1, transform: "scale(1)" }], { duration: 220, easing: "ease-out" });
    return () => {
      animation?.cancel();
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  function close() {
    if (closing.current) return;
    closing.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onClose(); return; }
    const animation = dialog.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-in", fill: "forwards" });
    if (animation) void animation.finished.then(onClose, () => {});
    else onClose();
  }

  // Keep the image inside the viewport, and centered on axes where it still fits.
  function updateView(next: View) {
    const area = stage.current;
    const image = picture.current;
    if (!area || !image) return;
    const scale = Math.max(1, Math.min(4, next.scale));
    const value = {
      scale,
      x: clamp(next.x, Math.max(0, (image.offsetWidth * scale - area.clientWidth) / 2)),
      y: clamp(next.y, Math.max(0, (image.offsetHeight * scale - area.clientHeight) / 2)),
    };
    current.current = value;
    setView(value);
  }

  useEffect(() => {
    const area = stage.current;
    if (!area) return;
    const observer = new ResizeObserver(() => updateView(current.current));
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  function localPoint(point: Point): Point {
    const rect = stage.current!.getBoundingClientRect();
    return { x: point.x - rect.left - rect.width / 2, y: point.y - rect.top - rect.height / 2 };
  }

  function zoom(scale: number, anchor: Point = { x: 0, y: 0 }) {
    const old = current.current;
    const nextScale = Math.max(1, Math.min(4, scale));
    const factor = nextScale / old.scale;
    updateView({ scale: nextScale, x: anchor.x - (anchor.x - old.x) * factor, y: anchor.y - (anchor.y - old.y) * factor });
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!pointers.current.size) {
      const rect = picture.current!.getBoundingClientRect();
      gesture.current = {
        moved: false,
        outside: event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom,
        start: { x: event.clientX, y: event.clientY },
      };
    } else gesture.current.moved = true;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const before = [...pointers.current.values()];
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const after = [...pointers.current.values()];
    if (Math.hypot(event.clientX - gesture.current.start.x, event.clientY - gesture.current.start.y) > 5) gesture.current.moved = true;
    if (after.length === 1) {
      const old = current.current;
      updateView({ ...old, x: old.x + event.clientX - previous.x, y: old.y + event.clientY - previous.y });
    } else if (after.length === 2) {
      const distance = (points: Point[]) => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      const midpoint = (points: Point[]) => localPoint({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
      const old = current.current;
      const scale = Math.max(1, Math.min(4, old.scale * distance(after) / Math.max(1, distance(before))));
      const start = midpoint(before);
      const end = midpoint(after);
      updateView({ scale, x: end.x - (start.x - old.x) * scale / old.scale, y: end.y - (start.y - old.y) * scale / old.scale });
    }
  }

  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.type !== "pointerup") gesture.current.moved = true;
    if (!pointers.current.size) setDragging(false);
  }

  const control = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900] disabled:opacity-30 motion-reduce:transition-none";

  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={helpId}
    onCancel={event => { event.preventDefault(); close(); }}
    className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-black/85 p-0 text-white backdrop:bg-transparent backdrop:backdrop-blur-sm"
  >
    <div onClick={event => { if (event.target === event.currentTarget) close(); }} className="flex h-full flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <header className="flex shrink-0 items-center justify-between gap-4 pb-4">
        <h2 id={titleId} className="min-w-0 truncate text-sm font-semibold text-white/90">{alt}</h2>
        <button type="button" aria-label="Fermer l’image agrandie" onClick={close} className={`${control} bg-white/10`}><X size={22} aria-hidden="true" /></button>
      </header>
      <div ref={stage} className={`relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden ${view.scale > 1 ? dragging ? "cursor-grabbing" : "cursor-grab" : "cursor-zoom-in"}`}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={event => { pointers.current.delete(event.pointerId); if (!pointers.current.size) setDragging(false); }}
        onClick={() => { if (gesture.current.outside && !gesture.current.moved) close(); }}
        onDoubleClick={event => { if (!gesture.current.outside) zoom(current.current.scale > 1 ? 1 : 2.5, localPoint({ x: event.clientX, y: event.clientY })); }}
      >
        <div ref={picture} className={`relative max-h-full shrink-0 ${dragging ? "" : "transition-transform duration-200 ease-out motion-reduce:transition-none"}`}
          style={{ aspectRatio: ratio, width: `min(100%, calc((100dvh - 12rem) * ${ratio}))`, transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}>
          <Image src={src} alt={alt} fill sizes="100vw" unoptimized draggable={false} onError={onError}
            onLoad={event => { const image = event.currentTarget; if (image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight); }}
            className="pointer-events-none object-contain" />
        </div>
      </div>
      <footer className="flex shrink-0 flex-col items-center gap-2 pt-4">
        <div role="group" aria-label="Contrôles du zoom" className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 p-1 backdrop-blur-md">
          <button type="button" aria-label="Réduire le zoom" disabled={view.scale <= 1} onClick={() => zoom(current.current.scale - .5)} className={control}><Minus size={19} aria-hidden="true" /></button>
          <output aria-label="Niveau de zoom" className="w-14 text-center text-xs font-semibold tabular-nums">{Math.round(view.scale * 100)} %</output>
          <button type="button" aria-label="Augmenter le zoom" disabled={view.scale >= 4} onClick={() => zoom(current.current.scale + .5)} className={control}><Plus size={19} aria-hidden="true" /></button>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/15" />
          <button type="button" aria-label="Réinitialiser le zoom" onClick={() => zoom(1)} className={control}><RotateCcw size={18} aria-hidden="true" /></button>
        </div>
        <p id={helpId} className="text-center text-xs text-white/60"><span className="sm:hidden">Pincez pour zoomer · Glissez pour explorer</span><span className="hidden sm:inline">Double-cliquez pour zoomer · Glissez pour explorer · Échap pour fermer</span></p>
      </footer>
    </div>
  </dialog>;
}
