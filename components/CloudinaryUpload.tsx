"use client";

import { useCallback, useRef, useState } from "react";
import { ImageOff, Loader2, Upload, X } from "lucide-react";

/* ============================================================
   Types & Constantes
   ============================================================ */

type Props = {
  value: string;
  onChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  label?: string;
  maxSizeMB?: number;
  maxWidth?: number;
  quality?: number;
};

const MAX_FILE_SIZE_MB = 10;
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.8;

/* ============================================================
   Utilitaires
   ============================================================ */

function compressImage(
  file: File,
  maxWidth: number = MAX_WIDTH,
  quality: number = JPEG_QUALITY
): Promise<File> {
  return new Promise((resolve, reject) => {
    if (file.type === "image/gif" || file.type === "image/svg+xml") {
      resolve(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((maxWidth / width) * height);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Impossible de créer le contexte Canvas."));
        return;
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Échec de la compression de l'image."));
            return;
          }
          const safeName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          resolve(
            new File([blob], safeName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
          );
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Impossible de charger l'image pour la compression."));
    };

    img.src = objectUrl;
  });
}

/* ============================================================
   Composant
   ============================================================ */

export default function CloudinaryUpload({
  value,
  onChange,
  onUploadingChange,
  label = "Photo du produit",
  maxSizeMB = MAX_FILE_SIZE_MB,
  maxWidth = MAX_WIDTH,
  quality = JPEG_QUALITY,
}: Props) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const setUploadingState = useCallback(
    (next: boolean) => {
      setUploading(next);
      onUploadingChange?.(next);
    },
    [onUploadingChange]
  );

  /* -------------------- Upload -------------------- */

  const uploadFile = useCallback(
    async (file: File) => {
      if (!cloudName || !uploadPreset) {
        setError("Configuration Cloudinary manquante (variables d'environnement).");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Le fichier doit être une image.");
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`L'image ne doit pas dépasser ${maxSizeMB} Mo.`);
        return;
      }

      setError("");
      setProgress(0);
      setCompressing(true);
      setUploadingState(true);

      try {
        const compressed = await compressImage(file, maxWidth, quality);
        setCompressing(false);

        const form = new FormData();
        form.append("file", compressed);
        form.append("upload_preset", uploadPreset);

        const url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
          );
          xhr.timeout = 60_000;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url as string);
              } catch {
                reject(new Error("Réponse Cloudinary invalide."));
              }
            } else {
              reject(new Error(`Échec de l'upload (statut ${xhr.status}).`));
            }
          };
          xhr.onerror = () =>
            reject(new Error("Erreur réseau pendant l'upload."));
          xhr.ontimeout = () =>
            reject(new Error("Délai d'upload dépassé. Réessayez."));
          xhr.send(form);
        });

        onChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload échoué.");
      } finally {
        setCompressing(false);
        setUploadingState(false);
      }
    },
    [cloudName, uploadPreset, maxSizeMB, maxWidth, quality, onChange, setUploadingState]
  );

  /* -------------------- Handlers -------------------- */

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const reset = () => {
    setError("");
    onChange("");
  };

  const busy = uploading || compressing;

  /* -------------------- Rendu -------------------- */

  return (
    <div className="space-y-2">
      <label
        className="text-sm font-medium"
        onClick={() => !busy && inputRef.current?.click()}
      >
        {label}
      </label>

      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-label={
          value
            ? "Remplacer l'image du produit"
            : "Ajouter une image au produit"
        }
        aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition outline-none focus-visible:ring-2 focus-visible:ring-[#65D900]/50 ${
          busy ? "cursor-wait opacity-80" : "cursor-pointer"
        } ${
          dragOver
            ? "border-[#65D900] bg-[#65D900]/5"
            : "border-gray-300 bg-gray-50 hover:border-[#65D900]/60"
        }`}
      >
        {value ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={`Aperçu de ${label}`}
              className="h-32 w-32 rounded-lg border object-cover"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg bg-[#65D900] px-3 py-1.5 text-xs font-semibold text-[#010101] hover:bg-[#58bf00] disabled:opacity-50"
              >
                <Upload size={12} aria-hidden="true" /> Remplacer
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <X size={12} aria-hidden="true" /> Retirer
              </button>
            </div>
          </div>
        ) : (
          <>
            <ImageOff size={28} className="text-gray-400" aria-hidden="true" />
            <p className="text-xs text-gray-500">
              Glissez une image ici ou cliquez pour sélectionner
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && !busy) void uploadFile(file);
            e.target.value = "";
          }}
        />

        {busy && (
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              {compressing ? "Compression…" : `Upload ${progress}%`}
            </span>
            {!compressing && (
              <div
                className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-200"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progression de l'upload"
              >
                <div
                  className="h-full bg-[#65D900] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {!value && !busy && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#65D900] px-3 py-2 text-xs font-semibold text-[#010101] hover:bg-[#58bf00]"
          >
            <Upload size={14} aria-hidden="true" />
            Choisir une image
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}