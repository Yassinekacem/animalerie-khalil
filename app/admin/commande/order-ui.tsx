"use client";

import { memo, useEffect, useRef, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";

export const statuses = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmée",
  EN_LIVRAISON: "En livraison",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
} as const;
export type Status = keyof typeof statuses;

export const notificationLabels = {
  PENDING: "Notification en attente d’envoi.",
  SENDING: "Envoi en cours. Actualisez dans une minute si nécessaire.",
  SENT: "Notification acceptée par Brevo.",
  FAILED: "L’envoi a échoué. La commande est conservée. Vous pouvez réessayer après une minute.",
  UNKNOWN: "Envoi non confirmé. Une reprise sécurisée est possible pendant dix minutes après le premier essai. Ensuite, vérifiez les journaux Brevo avant toute intervention.",
  SKIPPED: "Commande antérieure à l’activation des notifications.",
} as const;
export type NotificationDetails = {
  adminNotificationStatus: keyof typeof notificationLabels;
  adminNotificationAttemptAt: string | null;
  adminNotificationStartedAt: string | null;
  adminNotificationSentAt: string | null;
};

export type Order = NotificationDetails & {
  adminSeenAt: string | null;
  id: number;
  reference: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  gouvernorat: string | null;
  ville: string | null;
  customerEmail: string | null;
  note: string | null;
  createdAt: string;
  status: Status;
  subtotal: string;
  deliveryFee: string;
  total: string;
};
type OrderItem = { id: number; productName: string; quantity: number; unitPrice: string };
export type OrderDetail = Order & { updatedAt: string; items: OrderItem[] };

const transitions: Record<Status, Status[]> = {
  EN_ATTENTE: ["CONFIRMEE", "ANNULEE"],
  CONFIRMEE: ["EN_LIVRAISON", "ANNULEE"],
  EN_LIVRAISON: ["LIVREE", "ANNULEE"],
  LIVREE: [],
  ANNULEE: [],
};

const badgeStyles: Record<Status, string> = {
  EN_ATTENTE: "bg-amber-50 text-amber-800",
  CONFIRMEE: "bg-blue-50 text-blue-800",
  EN_LIVRAISON: "bg-violet-50 text-violet-800",
  LIVREE: "bg-[#65D900]/15 text-[#306900]",
  ANNULEE: "bg-red-50 text-red-700",
};

export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010101] disabled:cursor-not-allowed disabled:opacity-50";

// API amounts are TND; integer millimes preserve Decimal precision.
export function millimes(amount: string) {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
}
export function money(amount: string | bigint) {
  const value = typeof amount === "bigint" ? amount : millimes(amount);
  return `${(value / BigInt(1000)).toLocaleString("fr-TN")},${String(
    value % BigInt(1000)
  ).padStart(3, "0")} TND`;
}
const orderDateFormat = new Intl.DateTimeFormat("fr-TN", {
  timeZone: "Africa/Tunis",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function dateLabel(date: string) {
  const { day, month, year, hour, minute } = Object.fromEntries(
    orderDateFormat.formatToParts(new Date(date)).map(({ type, value }) => [type, value])
  );
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

export async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const issues: { message: string }[] = Array.isArray(data?.issues) ? data.issues : [];
    throw new Error(
      [data?.error ?? "La demande a échoué.", ...issues.map(i => i.message)].join("\n")
    );
  }
  if (data === null) throw new Error("Réponse invalide du serveur. Réessayez.");
  return data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof TypeError
    ? "Connexion au serveur impossible. Réessayez."
    : error instanceof Error
      ? error.message
      : "Une erreur est survenue. Réessayez.";
}

export const Skeleton = memo(function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse rounded-md bg-gray-200 ${className}`}
    />
  );
});

export const OrderDetailSkeleton = memo(function OrderDetailSkeleton() {
  return (
    <div role="status" aria-label="Chargement de la commande" className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <div className="space-y-3 rounded-xl bg-gray-50 p-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="ml-auto max-w-sm space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
});

export const Badge = memo(function Badge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${badgeStyles[status]}`}
    >
      {statuses[status]}
    </span>
  );
});

const Modal = memo(function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="order-modal-title"
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-[#010101] shadow-xl backdrop:bg-black/60 sm:p-6"
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="order-modal-title" className="text-xl font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fenêtre"
          className="rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2 disabled:opacity-50"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
});


export function StatusSelect({
  order,
  pending,
  onChange,
}: {
  order: Order;
  pending: boolean;
  onChange: (status: Status) => void;
}) {
  const allowed = transitions[order.status];
  return (
    <span className="relative inline-flex">
      <select
        aria-label={`Changer le statut de ${order.reference}`}
        value={order.status}
        disabled={pending || allowed.length === 0}
        onChange={event => onChange(event.target.value as Status)}
        className="min-w-36 rounded-lg border border-gray-300 bg-white py-2 pl-2.5 pr-8 text-sm focus:border-[#65D900] focus:outline-none focus:ring-2 focus:ring-[#65D900]/30 disabled:opacity-60"
      >
        {[order.status, ...allowed].map(item => (
          <option key={item} value={item}>
            {statuses[item]}
          </option>
        ))}
      </select>
      {pending && (
        <Loader2
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-500"
        />
      )}
    </span>
  );
}

export function CancelOrderDialog({ order, onClose, onConfirm }: {
  order: Order;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      title="Annuler la commande"
      onClose={onClose}
    >
      <p className="text-sm leading-6 text-gray-600">
        Voulez-vous vraiment annuler la commande{" "}
        <strong className="text-[#010101]">{order.reference}</strong> de{" "}
        {order.customerName} ? Son statut actuel est «{" "}
        {statuses[order.status]} ». Le statut « Annulée » sera appliqué après
        confirmation.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}
        >
          Conserver la commande
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`${buttonClass} bg-[#010101] text-white hover:bg-gray-800`}
        >
          Confirmer l’annulation
        </button>
      </div>
    </Modal>
  );
}

export function updateOrderStatus(id: number, status: Status) {
  return fetch("/api/orders/" + id + "/status", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).then(readResponse<OrderDetail>);
}
