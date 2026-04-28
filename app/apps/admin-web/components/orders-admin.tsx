"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AdminSection, Button, Chip, EmptyAdminState, Input, Tab, Tabs, TextArea } from "@/components/admin-ui";
import { queryClient, trpc } from "@/lib/trpc";

const statuses = [
  { key: "to_call", label: "A appeler" },
  { key: "called", label: "Client appele" },
  { key: "processing", label: "En traitement" },
  { key: "processed", label: "Commande traitee" },
  { key: "cancelled", label: "Annulee" },
] as const;

function downloadBase64Pdf(fileName: string, base64: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = Array.from(byteCharacters, (character) => character.charCodeAt(0));
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function OrdersAdminPage() {
  const [status, setStatus] = useState<(typeof statuses)[number]["key"] | undefined>();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [deliveryNote, setDeliveryNote] = useState({ oldBalance: "0", paymentAmount: "0", newBalance: "0" });

  const orders = useQuery(trpc.orders.adminList.queryOptions(status ? { status } : undefined));
  const detail = useQuery({
    ...trpc.orders.adminDetail.queryOptions({ orderId: selectedOrderId ?? "missing" }),
    enabled: !!selectedOrderId,
  });

  const updateStatus = useMutation(
    trpc.orders.adminUpdateStatus.mutationOptions({
      async onSuccess() {
        await queryClient.invalidateQueries();
      },
    }),
  );
  const updateNotes = useMutation(trpc.orders.adminUpdateNotes.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const generatePdf = useMutation(
    trpc.deliveryNotes.adminGeneratePdf.mutationOptions({
      onSuccess(payload) {
        downloadBase64Pdf(payload.fileName, payload.base64);
      },
    }),
  );

  const selectedOrder = detail.data;

  return (
    <main className="module-page">
      <section className="module-hero">
        <Chip color="primary" variant="flat">Order operations</Chip>
        <h2>Orders, status workflow, and BL actions</h2>
        <p>Call customers, move orders through operational statuses, handle stock validation, and generate delivery notes.</p>
      </section>

      <Tabs aria-label="Order status filters" color="primary" selectedKey={status ?? "all"} onSelectionChange={(key) => setStatus(key === "all" ? undefined : (String(key) as (typeof statuses)[number]["key"]))}>
        <Tab key="all" title="All" />
        {statuses.map((entry) => <Tab key={entry.key} title={entry.label} />)}
      </Tabs>

      <div className="split-grid">
        <AdminSection title="Orders" description="New order email and push notifications are sent by the backend when orders are created.">
          <div className="admin-table">
            {(orders.data ?? []).map((order) => (
              <button key={order.id} className={selectedOrderId === order.id ? "admin-row button-row active" : "admin-row button-row"} onClick={() => { setSelectedOrderId(order.id); setNotes(order.internalAdminNotes ?? ""); }}>
                <div>
                  <strong>{order.orderNumber}</strong>
                  <p className="muted">{order.customerFullNameSnapshot} · {order.customerPhoneLocalSnapshot ?? order.customerPhoneSnapshot}</p>
                </div>
                <div className="row-actions">
                  <Chip color="primary" variant="flat">{statuses.find((entry) => entry.key === order.status)?.label}</Chip>
                  <strong>{order.totalAmountSnapshot} DA</strong>
                </div>
              </button>
            ))}
            {orders.data?.length === 0 ? <EmptyAdminState label="No orders for this filter." /> : null}
          </div>
        </AdminSection>

        <AdminSection title="Order detail" description="Status changes follow backend stock and lifecycle rules.">
          {selectedOrder ? (
            <div className="detail-stack">
              <div className="detail-card">
                <h3>{selectedOrder.orderNumber}</h3>
                <p className="muted">{selectedOrder.customerFullNameSnapshot} · {selectedOrder.customerPhoneLocalSnapshot ?? selectedOrder.customerPhoneSnapshot}</p>
                <p className="muted">{selectedOrder.streetAddressSnapshot}, {selectedOrder.communeNameFrSnapshot}, {selectedOrder.wilayaNameFrSnapshot}</p>
                {selectedOrder.latitudeSnapshot && selectedOrder.longitudeSnapshot ? <p className="muted">Map: {selectedOrder.latitudeSnapshot}, {selectedOrder.longitudeSnapshot}</p> : null}
                <Button as="a" href={`tel:${selectedOrder.customerPhoneSnapshot}`} color="primary" variant="flat">Call customer</Button>
              </div>

              <label className="native-select-label">
                <span>Status</span>
                <select value={selectedOrder.status} onChange={(event) => updateStatus.mutate({ orderId: selectedOrder.id, status: event.target.value as (typeof statuses)[number]["key"] })}>
                  {statuses.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
                </select>
              </label>
              {updateStatus.error ? <p className="form-error">{updateStatus.error.message}</p> : null}

              <div className="admin-table">
                {selectedOrder.lines.map((line) => (
                  <div className="admin-row" key={line.id}>
                    <div>
                      <strong>{line.productNameFrSnapshot}</strong>
                      <p className="muted">{line.selectedLots} lots · {line.packagingLabelSnapshot} · {line.effectiveLotPriceSnapshot} DA</p>
                    </div>
                    <strong>{line.lineTotalSnapshot} DA</strong>
                  </div>
                ))}
              </div>

              <TextArea label="Internal admin notes" value={notes} onValueChange={setNotes} rows={3} />
              <Button variant="flat" onPress={() => updateNotes.mutate({ orderId: selectedOrder.id, internalAdminNotes: notes || null })}>Save notes</Button>

              <div className="form-grid">
                <Input label="Old balance" value={deliveryNote.oldBalance} onValueChange={(oldBalance) => setDeliveryNote({ ...deliveryNote, oldBalance })} />
                <Input label="Versement" value={deliveryNote.paymentAmount} onValueChange={(paymentAmount) => setDeliveryNote({ ...deliveryNote, paymentAmount })} />
                <Input label="New balance" value={deliveryNote.newBalance} onValueChange={(newBalance) => setDeliveryNote({ ...deliveryNote, newBalance })} />
              </div>
              <Button color="primary" isLoading={generatePdf.isPending} onPress={() => generatePdf.mutate({ orderId: selectedOrder.id, ...deliveryNote })}>Generate / download BL PDF</Button>
              {generatePdf.error ? <p className="form-error">{generatePdf.error.message}</p> : null}
              {selectedOrder.stockAppliedAt ? <Chip color="success" variant="flat">Stock already applied</Chip> : null}
            </div>
          ) : (
            <EmptyAdminState label="Select an order to view details." />
          )}
        </AdminSection>
      </div>
    </main>
  );
}
