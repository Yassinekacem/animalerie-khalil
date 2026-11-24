"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Eye, Loader2, MapPin, Package, Printer } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import {
  Badge, CancelOrderDialog, OrderDetailSkeleton, StatusSelect, buttonClass,
  dateLabel, errorMessage, millimes, money, notificationLabels, readResponse,
  statuses, updateOrderStatus, type NotificationDetails, type OrderDetail, type Status,
} from "../order-ui";

const tabs = { details: "Détails", documents: "Documents" } as const;
const documents = [
  { code: "BC", title: "Bon de commande" },
  { code: "BL", title: "Bon de livraison" },
] as const;

type Tab = keyof typeof tabs;
type OrderDocument = (typeof documents)[number];
type DocumentCode = OrderDocument["code"];
const actions = [
  { label: "Consulter", icon: Eye },
  { label: "Télécharger", icon: Download },
  { label: "Imprimer", icon: Printer },
] as const;
type DocumentAction = (typeof actions)[number]["label"];

function unavailableReason(code: DocumentCode, status: Status) {
  if (code === "BC") return "";
  if (status === "ANNULEE") return "La commande est annulée.";
  if (status === "EN_LIVRAISON" || status === "LIVREE") return "";
  return "Disponible dès le passage au statut « En livraison ».";
}

function loadOrder(id: string | number, signal?: AbortSignal) {
  return fetch("/api/orders/" + id, { cache: "no-store", signal }).then(readResponse<OrderDetail>);
}

function openPdf(blob: Blob, filename: string, viewer: Window | null, print: boolean) {
  const url = URL.createObjectURL(blob);
  if (!viewer) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const cleanup = window.setInterval(() => {
    if (!viewer.closed) return;
    window.clearInterval(cleanup);
    URL.revokeObjectURL(url);
  }, 2_000);
  if (!print) {
    viewer.location.replace(url);
    return;
  }

  const frame = viewer.document.createElement("iframe");
  const hint = viewer.document.createElement("p");
  const directLink = viewer.document.createElement("a");
  directLink.href = url;
  directLink.textContent = "Ouvrir le PDF";
  hint.append("Imprimez depuis la barre d’outils du PDF ou ", directLink, ".");
  frame.title = filename;
  frame.style.cssText = "display:block;border:0;width:100%;height:90vh";
  frame.addEventListener("load", () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      // Some native PDF viewers only expose printing through their own toolbar.
    }
  }, { once: true });
  frame.src = url;
  viewer.document.body.replaceChildren(hint, frame);
}

export default function OrderPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 text-[#010101]">
      <Link href="/admin/commande" className="inline-flex items-center gap-2 rounded text-sm font-semibold text-[#306900] hover:underline focus-visible:outline-2">
        <ArrowLeft size={16} aria-hidden="true" />
        Retour aux commandes
      </Link>
      <Suspense fallback={<OrderDetailSkeleton />}>
        <OrderRoute />
      </Suspense>
    </div>
  );
}

function OrderRoute() {
  const { id } = useParams<{ id: string }>();
  if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647) {
    return <p role="alert" className="text-sm text-red-700">Identifiant de commande invalide.</p>;
  }
  return <OrderPageContent key={id} id={id} />;
}

function OrderPageContent({ id }: { id: string }) {
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [tab, setTab] = useState<Tab>("details");
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [statusError, setStatusError] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [pending, setPending] = useState<"status" | "notification" | DocumentCode | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const issueRequest = useRef<AbortController | null>(null);
  const setNotice = useToast();

  useEffect(() => {
    const controller = new AbortController();
    loadOrder(id, controller.signal)
      .then(order => { if (!controller.signal.aborted) setSelected(order); })
      .catch(error => { if (!controller.signal.aborted) setLoadError(errorMessage(error)); });
    return () => {
      controller.abort();
      issueRequest.current?.abort();
    };
  }, [id, loadAttempt]);

  async function changeStatus(status: Status) {
    if (!selected || pending || status === selected.status) return;
    setPending("status");
    setStatusError("");
    setNotice("");
    try {
      const updated = await updateOrderStatus(selected.id, status);
      setSelected(updated);
      setNotice("Statut « " + statuses[updated.status] + " » enregistré.");
    } catch (error) {
      setStatusError(errorMessage(error));
      try { setSelected(await loadOrder(id)); } catch { /* Keep the visible order on refresh failure. */ }
    } finally {
      setPending(null);
    }
  }

  async function retryNotification() {
    if (pending) return;
    setPending("notification");
    setNotificationError("");
    try {
      const response = await fetch("/api/orders/" + id, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-notification" }),
      });
      const update = await readResponse<NotificationDetails>(response);
      setSelected(previous => previous && { ...previous, ...update });
      if (update.adminNotificationStatus === "SENT") setNotice("Notification acceptée par Brevo.");
    } catch (error) {
      setNotificationError(errorMessage(error));
    } finally {
      setPending(null);
    }
  }

  async function issueDocument(order: OrderDetail, entry: OrderDocument, action: DocumentAction) {
    if (pending || issueRequest.current || unavailableReason(entry.code, order.status)) return;
    setDocumentError("");
    const viewer = action === "Télécharger" ? null : window.open("about:blank", "_blank");
    if (action !== "Télécharger" && !viewer) {
      setDocumentError("Autorisez l’ouverture des fenêtres pour consulter ou imprimer le document.");
      return;
    }
    if (viewer) {
      viewer.opener = null;
      viewer.document.title = entry.title;
      viewer.document.body.textContent = "Préparation du PDF…";
    }

    const controller = new AbortController();
    issueRequest.current = controller;
    setPending(entry.code);
    try {
      const { createOrderPdf } = await import("../order-pdf");
      if (controller.signal.aborted) throw controller.signal.reason;

      const reference = entry.code + "-" + order.id;
      const blob = await createOrderPdf(order, { ...entry, reference });
      if (controller.signal.aborted || viewer?.closed) return;

      // Check the current status before handing over the delivery note.
      if (entry.code === "BL") {
        const current = await loadOrder(order.id, controller.signal);
        if (controller.signal.aborted || viewer?.closed) return;
        const reason = unavailableReason(entry.code, current.status);
        setSelected(previous => previous && { ...previous, status: current.status, updatedAt: current.updatedAt });
        if (reason) throw new Error(reason);
      }
      openPdf(blob, reference + ".pdf", viewer, action === "Imprimer");
    } catch (error) {
      viewer?.close();
      if (!controller.signal.aborted) setDocumentError(
        "Impossible de préparer le document. " + errorMessage(error)
      );
    } finally {
      if (controller.signal.aborted) viewer?.close();
      issueRequest.current = null;
      setPending(null);
    }
  }

  if (!selected) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        {loadError ? (
          <>
            <p role="alert" className="whitespace-pre-line text-sm text-red-700">{loadError}</p>
            <button type="button" onClick={() => { setLoadError(""); setLoadAttempt(value => value + 1); }}
              className={buttonClass + " mt-4 bg-gray-100 hover:bg-gray-200"}>
              Réessayer
            </button>
          </>
        ) : <OrderDetailSkeleton />}
      </section>
    );
  }

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">Commande {selected.reference}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Passée le <time dateTime={selected.createdAt}>{dateLabel(selected.createdAt)}</time>
          </p>
        </div>
        <Badge status={selected.status} />
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div role="tablist" aria-label="Commande" className="flex gap-3 border-b border-gray-200 px-4 sm:px-6">
          {(Object.keys(tabs) as Tab[]).map(key => (
            <button key={key} type="button" role="tab" id={key + "-tab"}
              aria-selected={tab === key} aria-controls={key + "-panel"} tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
              onKeyDown={event => {
                const next = event.key === "Home" ? "details" : event.key === "End" ? "documents"
                  : ["ArrowLeft", "ArrowRight"].includes(event.key) ? key === "details" ? "documents" : "details" : null;
                if (!next) return;
                event.preventDefault();
                setTab(next);
                event.currentTarget.parentElement?.querySelector<HTMLButtonElement>("#" + next + "-tab")?.focus();
              }}
              className={"border-b-2 px-2 py-4 text-sm font-semibold focus-visible:outline-2 " +
                (tab === key ? "border-[#306900] text-[#306900]" : "border-transparent text-gray-600 hover:text-black")}>
              {tabs[key]}
            </button>
          ))}
        </div>

        <div role="tabpanel" id="details-panel" aria-labelledby="details-tab" hidden={tab !== "details"} className="p-4 sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Statut de la commande</h2>
              <p className="mt-1 text-xs text-gray-600">
                Dernière modification le <time dateTime={selected.updatedAt}>{dateLabel(selected.updatedAt)}</time>
              </p>
            </div>
            <StatusSelect order={selected} pending={pending !== null} onChange={status => {
              if (status === "ANNULEE") setCancelOpen(true);
              else void changeStatus(status);
            }} />
            {statusError && <p role="alert" className="w-full whitespace-pre-line text-sm text-red-700">{statusError}</p>}
          </div>
          <OrderInformation selected={selected} pending={pending !== null} notificationPending={pending === "notification"}
            notificationError={notificationError} retryNotification={retryNotification} />
        </div>

        <div role="tabpanel" id="documents-panel" aria-labelledby="documents-tab" hidden={tab !== "documents"} className="p-4 sm:p-6">
          {documentError && <p role="alert" className="mb-4 text-sm text-red-700">{documentError}</p>}
          <ul className="space-y-3">
            {documents.map(entry => {
              const reason = unavailableReason(entry.code, selected.status);
              return (
                <li key={entry.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
                  <div>
                    <h2 className="text-sm font-bold">{entry.title}</h2>
                    <p className="mt-1 text-xs text-gray-600">{reason || entry.code + "-" + selected.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2" aria-busy={pending === entry.code}>
                    {actions.map(({ label, icon: Icon }) => (
                      <button key={label} type="button" disabled={Boolean(reason) || pending !== null}
                        aria-label={label + " le " + entry.title.toLowerCase()}
                        onClick={() => void issueDocument(selected, entry, label)}
                        className={buttonClass + " bg-gray-100 hover:bg-gray-200"}>
                        <Icon size={16} aria-hidden="true" />{label}
                      </button>
                    ))}
                  </div>
                  {pending === entry.code && <p role="status" className="w-full text-xs text-gray-600">Préparation du PDF…</p>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      {cancelOpen && <CancelOrderDialog order={selected} onClose={() => setCancelOpen(false)} onConfirm={() => {
        setCancelOpen(false);
        void changeStatus("ANNULEE");
      }} />}
    </>
  );
}

function OrderInformation({ selected, pending, notificationPending, notificationError, retryNotification }: {
  selected: OrderDetail;
  pending: boolean;
  notificationPending: boolean;
  notificationError: string;
  retryNotification: () => Promise<void>;
}) {
  return (
    <>
      <section
        aria-labelledby="notification-title"
        className="mb-6 rounded-xl border border-gray-200 p-4"
      >
        <h2 id="notification-title" className="text-sm font-bold">Notification email administrateur</h2>
        <p role="status" className="mt-2 text-sm leading-6 text-gray-700">{notificationLabels[selected.adminNotificationStatus]}</p>
        {selected.adminNotificationSentAt && <p className="mt-1 text-xs text-gray-600">Le {dateLabel(selected.adminNotificationSentAt)}</p>}
        {notificationError && <p role="alert" className="mt-3 text-sm text-red-700">{notificationError}</p>}
        {!["SENT", "SKIPPED"].includes(selected.adminNotificationStatus) && <button type="button" disabled={pending} onClick={() => void retryNotification()} className={`${buttonClass} mt-3 bg-[#65D900] text-black hover:bg-[#55BD00]`}>
          {notificationPending ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" />Traitement…</> : "Actualiser / réessayer l’envoi"}
        </button>}
      </section>

      <section
        aria-labelledby="customer-title"
        className="mb-6 rounded-xl bg-gray-50 p-4"
      >
        <h2
          id="customer-title"
          className="mb-3 flex items-center gap-2 text-sm font-bold"
        >
          <MapPin size={17} aria-hidden="true" />
          Client et livraison
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Nom du client</dt>
            <dd className="mt-1 font-medium">{selected.customerName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Téléphone</dt>
            <dd className="mt-1">{selected.customerPhone}</dd>
          </div>
          {selected.customerEmail && (
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="mt-1 break-words">{selected.customerEmail}</dd>
            </div>
          )}
          {selected.note && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Note</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">{selected.note}</dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Adresse de livraison</dt>
            <dd className="mt-1 break-words">{selected.deliveryAddress}</dd>
          </div>
          {selected.gouvernorat && <div>
            <dt className="text-gray-500">Gouvernorat</dt>
            <dd className="mt-1">{selected.gouvernorat}</dd>
          </div>}
          {selected.ville && <div>
            <dt className="text-gray-500">Ville</dt>
            <dd className="mt-1">{selected.ville}</dd>
          </div>}
        </dl>
      </section>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Package size={17} aria-hidden="true" />
        Articles commandés
      </h2>
      <div
        className="overflow-x-auto rounded-xl border border-gray-200"
        role="region"
        aria-label="Articles de la commande, tableau défilant horizontalement"
        tabIndex={0}
      >
        <table className="w-full min-w-[550px] text-left text-sm">
          <caption className="sr-only">
            Articles et calcul des sous-totaux en TND
          </caption>
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3">
                Article
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Quantité
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Prix unitaire
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Sous-total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {selected.items.map(item => (
              <tr key={item.id}>
                <th scope="row" className="px-4 py-4 font-medium">
                  {item.productName}
                </th>
                <td className="px-4 py-4 text-right tabular-nums">{item.quantity}</td>
                <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                  {money(item.unitPrice)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums">
                  {money(millimes(item.unitPrice) * BigInt(item.quantity))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-6 max-w-sm space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-600">Sous-total des articles</dt>
          <dd className="whitespace-nowrap font-medium tabular-nums">
            {money(selected.subtotal)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-600">Frais de livraison</dt>
          <dd className="whitespace-nowrap font-medium tabular-nums">
            {money(selected.deliveryFee)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-base font-bold">
          <dt>Montant total</dt>
          <dd className="whitespace-nowrap tabular-nums">{money(selected.total)}</dd>
        </div>
      </dl>
    </>
  );
}
