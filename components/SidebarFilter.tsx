"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import { Bird, Cat, Dog, Fish, LoaderCircle, PawPrint, RefreshCw, SlidersHorizontal, Tag, type LucideIcon } from "lucide-react";

type Option = { id: string; name: string };

type SidebarFilterProps = {
  animal: string;
  animals: Record<string, string>;
  category: string;
  categories: Option[];
  brand: string;
  brands: string[];
  brandsLoading: boolean;
  brandsError: boolean;
  priceCeiling: number | null;
  pricesLoading: boolean;
  pricesError: boolean;
  onRetryPrices: () => void;
  minPrice: string;
  maxPrice: string;
  promotion: boolean;
  onAnimalChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onPromotionChange: (value: boolean) => void;
  onReset: () => void;
  onRetryBrands: () => void;
};


const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900]";
const rowFocusClass =
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[#65D900]";
const animalIcons: Record<string, LucideIcon> = {
  chien: Dog,
  chat: Cat,
  oiseaux: Bird,
  poissons: Fish,
};


const rangeClass =
  "pointer-events-none absolute inset-0 m-0 h-10 w-full appearance-none bg-transparent focus:outline-none disabled:opacity-40 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#65D900] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&:focus-visible::-webkit-slider-thumb]:outline-2 [&:focus-visible::-webkit-slider-thumb]:outline-offset-2 [&:focus-visible::-webkit-slider-thumb]:outline-[#65D900] [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-ew-resize [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#65D900] [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm [&:focus-visible::-moz-range-thumb]:outline-2 [&:focus-visible::-moz-range-thumb]:outline-offset-2 [&:focus-visible::-moz-range-thumb]:outline-[#65D900]";

type PriceRangeProps = Pick<SidebarFilterProps,
  "minPrice" | "maxPrice" | "priceCeiling" | "pricesLoading" | "pricesError" |
  "onMinPriceChange" | "onMaxPriceChange" | "onRetryPrices"
>;
type PricePair = [number, number];
type PricePreview = { source: string; values: PricePair };
type PriceThumb = "min" | "max";

const formatAmount = (value: number) =>
  `${value.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;

function readPrice(value: string, fallback: number) {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function PriceRangeSlider(props: PriceRangeProps) {
  const id = useId();
  const source = `${props.minPrice}|${props.maxPrice}|${props.priceCeiling}`;
  const minimum = readPrice(props.minPrice, 0);
  const maximum = readPrice(props.maxPrice, props.priceCeiling ?? 0);
  // Preserve prices from shared URLs even when they exceed the current catalogue.
  const ceiling = Math.max(props.priceCeiling ?? 0, minimum, maximum);
  const disabled = props.pricesLoading || props.pricesError || props.priceCeiling === null || ceiling === 0;
  // Only a gesture preview is local. Once URL props change, they take precedence.
  const [preview, setPreview] = useState<PricePreview | null>(null);
  const dragging = useRef<(PricePreview & { thumb: PriceThumb }) | null>(null);
  // Discard previews when URL props change, including Back/Forward navigation.
  if (preview && preview.source !== source) setPreview(null);
  const [lower, upper] = preview?.source === source ? preview.values : [minimum, maximum];

  function commit(thumb: PriceThumb, values: PricePair) {
    if (thumb === "min") {
      props.onMinPriceChange(values[0] === 0 ? "" : values[0].toFixed(3));
    } else {
      props.onMaxPriceChange(values[1] === ceiling ? "" : values[1].toFixed(3));
    }
  }

  function startDrag(thumb: PriceThumb, event: PointerEvent<HTMLInputElement>) {
    dragging.current = { source, thumb, values: [lower, upper] };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function change(thumb: PriceThumb, value: string) {
    const current = dragging.current;
    if (current && current.source !== source) {
      dragging.current = null;
      setPreview(null);
      return;
    }
    const [min, max] = current?.values ?? [lower, upper];
    const next: PricePair = thumb === "min"
      ? [Math.min(Number(value), max), max]
      : [min, Math.max(Number(value), min)];
    setPreview({ source, values: next });
    if (current) current.values = next;
    else commit(thumb, next); // Keyboard changes update the URL immediately.
  }

  function finishDrag() {
    const current = dragging.current;
    dragging.current = null;
    if (!current) return;
    if (current.source === source) commit(current.thumb, current.values);
    else setPreview(null);
  }

  function cancelDrag() {
    dragging.current = null;
    setPreview(null);
  }

  const start = ceiling > 0 ? lower / ceiling * 100 : 0;
  const end = ceiling > 0 ? upper / ceiling * 100 : 0;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2.5 text-xs font-semibold text-gray-900">Prix (TND)</legend>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="min-w-0">
          <label htmlFor={`${id}-min`} className="text-[11px] font-medium text-gray-500">Min</label>
          <output htmlFor={`${id}-min`} className="mt-1 block font-medium tabular-nums text-gray-900 [overflow-wrap:anywhere]">{formatAmount(lower)}</output>
        </div>
        <div className="min-w-0 text-right">
          <label htmlFor={`${id}-max`} className="text-[11px] font-medium text-gray-500">Max</label>
          <output htmlFor={`${id}-max`} className="mt-1 block font-medium tabular-nums text-gray-900 [overflow-wrap:anywhere]">{props.maxPrice === "" && props.priceCeiling === null ? "—" : formatAmount(upper)}</output>
        </div>
      </div>
      <div className={`relative mt-2 h-10 ${disabled ? "opacity-40" : ""}`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-2.5 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-200">
          <div className="absolute inset-y-0 rounded-full bg-[#65D900]" style={{ left: `${start}%`, width: `${Math.max(0, end - start)}%` }} />
        </div>
        <input
          id={`${id}-min`}
          type="range"
          min="0"
          max={ceiling || 1}
          step="0.001"
          value={lower}
          disabled={disabled}
          aria-label="Prix minimum"
          aria-valuemax={upper}
          aria-valuetext={formatAmount(lower)}
          onChange={event => change("min", event.target.value)}
          onPointerDown={event => startDrag("min", event)}
          onPointerUp={finishDrag}
          onLostPointerCapture={finishDrag}
          onPointerCancel={cancelDrag}
          onBlur={finishDrag}
          className={`${rangeClass} ${lower === ceiling ? "z-30" : "z-10"}`}
        />
        <input
          id={`${id}-max`}
          type="range"
          min="0"
          max={ceiling || 1}
          step="0.001"
          value={upper}
          disabled={disabled}
          aria-label="Prix maximum"
          aria-valuemin={lower}
          aria-valuetext={formatAmount(upper)}
          onChange={event => change("max", event.target.value)}
          onPointerDown={event => startDrag("max", event)}
          onPointerUp={finishDrag}
          onLostPointerCapture={finishDrag}
          onPointerCancel={cancelDrag}
          onBlur={finishDrag}
          className={`${rangeClass} z-20`}
        />
      </div>
      {props.pricesLoading ? (
        <p role="status" className="flex items-center gap-2 text-xs leading-5 text-gray-500">
          <LoaderCircle size={13} aria-hidden="true" className="shrink-0 motion-safe:animate-spin" />
          Chargement des prix…
        </p>
      ) : props.pricesError ? (
        <div role="alert" className="space-y-1 text-xs leading-5 text-gray-600">
          <p>Impossible de charger la plage de prix.</p>
          <button type="button" onClick={props.onRetryPrices} className={`rounded-sm font-medium underline underline-offset-4 ${focusClass}`}>Réessayer</button>
        </div>
      ) : ceiling === 0 ? (
        <p className="text-xs leading-5 text-gray-500">Aucune plage de prix à ajuster.</p>
      ) : null}
    </fieldset>
  );
}

function RadioFilter({
  name,
  title,
  value,
  options,
  disabled = false,
  onChange,
}: {
  name: string;
  title: string;
  value: string;
  options: Option[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0 disabled:opacity-50">
      <legend className="mb-2 text-xs font-semibold text-gray-900">{title}</legend>
      <div className="-mx-1 max-h-36 space-y-0.5 overflow-y-auto overscroll-contain px-1 py-1 [scrollbar-color:#d1d5db_transparent] [scrollbar-width:thin]">
        {options.map(option => (
          <label
            key={option.id}
            className={`flex min-w-0 items-start gap-2.5 rounded-md px-2 py-1.5 text-xs leading-5 transition-colors ${rowFocusClass} ${
              disabled
                ? "cursor-not-allowed text-gray-400"
                : value === option.id
                  ? "cursor-pointer bg-gray-100 font-medium text-gray-900 hover:bg-gray-200/70"
                  : "cursor-pointer text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              className="mt-0.5 size-4 shrink-0 appearance-none rounded-full border border-gray-300 bg-white checked:border-[#65D900] checked:bg-[#65D900] checked:shadow-[inset_0_0_0_3px_white] focus-visible:outline-none forced-colors:appearance-auto"
            />
            <span className="min-w-0 [overflow-wrap:anywhere]">{option.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function SidebarFilter(props: SidebarFilterProps) {
  // Keep the radio groups independent in the desktop sidebar and mobile drawer.
  const id = useId();
  const hasActiveFilters =
    props.promotion ||
    [props.animal, props.category, props.brand, props.minPrice, props.maxPrice].some(
      value => value.trim() !== "",
    );
  const animalOptions = [
    { id: "", name: "Tous les animaux" },
    ...Object.entries(props.animals).map(([id, name]) => ({ id, name })),
  ];

  return (
    <div className="min-w-0 bg-white text-gray-900">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-gray-500" />
          Filtres
        </h2>
        <button
          type="button"
          disabled={!hasActiveFilters}
          onClick={props.onReset}
          className={`shrink-0 rounded-sm py-1 text-[11px] font-medium text-gray-500 transition-colors enabled:hover:text-gray-900 enabled:hover:underline enabled:hover:underline-offset-4 disabled:cursor-not-allowed disabled:text-gray-300 ${focusClass}`}
        >
          Réinitialiser
        </button>
      </div>

      <div className="space-y-4">
        <fieldset className="min-w-0">
          <legend className="mb-2.5 text-xs font-semibold text-gray-900">Animal cible</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {animalOptions.map(option => {
              const Icon = animalIcons[option.id] ?? PawPrint;
              const selected = props.animal === option.id;

              return (
                <label
                  key={option.id}
                  className={`relative min-w-0 cursor-pointer ${option.id === "" ? "col-span-2" : ""}`}
                >
                  <input
                    type="radio"
                    name={`${id}-animal`}
                    value={option.id}
                    checked={selected}
                    onChange={() => props.onAnimalChange(option.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex min-h-9 items-center gap-2 rounded-md border px-2 py-2 text-xs leading-4 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#65D900] ${
                      selected
                        ? "border-[#65D900] bg-[#65D900]/10 font-medium text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.025)] hover:bg-[#65D900]/15"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.6} aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{option.name}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="border-t border-gray-100 pt-4">
          <RadioFilter
            name={`${id}-category`}
            title="Catégories"
            value={props.category}
            options={[{ id: "", name: "Toutes les catégories" }, ...props.categories]}
            onChange={props.onCategoryChange}
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <RadioFilter
            name={`${id}-brand`}
            title="Marques"
            value={props.brand}
            disabled={props.brandsLoading || props.brandsError}
            options={[
              { id: "", name: "Toutes les marques" },
              ...props.brands.map(name => ({ id: name, name })),
            ]}
            onChange={props.onBrandChange}
          />
          {props.brandsLoading ? (
            <p role="status" className="mt-2 flex items-center gap-2 text-xs leading-5 text-gray-500">
              <LoaderCircle size={13} aria-hidden="true" className="shrink-0 motion-safe:animate-spin" />
              Chargement des marques…
            </p>
          ) : props.brandsError ? (
            <div role="alert" className="mt-2 space-y-1.5">
              <p className="text-xs leading-5 text-gray-600">Impossible de charger les marques.</p>
              <button
                type="button"
                onClick={props.onRetryBrands}
                className={`inline-flex items-center gap-1.5 rounded-sm py-1 text-xs font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 hover:text-gray-900 ${focusClass}`}
              >
                <RefreshCw size={12} aria-hidden="true" />
                Réessayer
              </button>
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <PriceRangeSlider {...props} />
        </div>

        <div className="border-t border-gray-100 pt-3">
          <label className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-50 ${rowFocusClass}`}>
            <Tag size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-gray-400" />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">En promotion</span>
            <input
              type="checkbox"
              checked={props.promotion}
              onChange={event => props.onPromotionChange(event.target.checked)}
              className="size-4 shrink-0 cursor-pointer accent-[#65D900] focus-visible:outline-none"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
