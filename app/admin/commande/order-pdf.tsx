import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { dateLabel, millimes, money, type OrderDetail } from "./order-ui";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.35, color: "#17211b",
    paddingTop: 38, paddingHorizontal: 40, paddingBottom: 58,
  },
  header: { borderTopWidth: 4, borderTopColor: "#306900", paddingTop: 14, marginBottom: 20 },
  brand: { fontSize: 10, color: "#306900", fontFamily: "Helvetica-Bold" },
  title: { fontSize: 25, lineHeight: 1.2, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 8 },
  meta: { color: "#45534a", marginTop: 2 },
  cancelled: { color: "#991b1b", fontFamily: "Helvetica-Bold", marginTop: 6 },
  box: { backgroundColor: "#f2f5f2", padding: 12, marginBottom: 14 },
  label: { fontFamily: "Helvetica-Bold" },
  note: { marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "flex-start", padding: 8, borderBottomWidth: 1, borderBottomColor: "#dde4de" },
  tableHead: { backgroundColor: "#e9efe9", fontFamily: "Helvetica-Bold" },
  item: { flex: 1, paddingRight: 8 },
  qty: { width: 54, textAlign: "right" },
  amount: { width: 111, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: 270, paddingTop: 12 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 3 },
  total: { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#859489", fontFamily: "Helvetica-Bold" },
  signOff: { flexDirection: "row", gap: 16, marginTop: 20 },
  signOffBox: { flex: 1, padding: 12, borderWidth: 1, borderColor: "#dde4de" },
  signOffTitle: { fontFamily: "Helvetica-Bold", color: "#306900", marginBottom: 8 },
  writingLine: { height: 16, borderBottomWidth: 1, borderBottomColor: "#859489", marginBottom: 8 },
  signatureSpace: { height: 36 },
  footer: {
    position: "absolute", bottom: 28, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: "#dde4de", paddingTop: 5, color: "#45534a", fontSize: 9,
  },
});

export function createOrderPdf(
  order: OrderDetail,
  document: { code: "BC" | "BL"; title: string; reference: string },
) {
  const priced = document.code === "BC";
  const location = [order.ville, order.gouvernorat].filter(Boolean).join(", ");
  const rows = order.items.map(item => (
    <View key={item.id} style={styles.row} wrap={false}>
      <Text style={styles.item}>{item.productName}</Text>
      <Text style={styles.qty}>{item.quantity}</Text>
      {priced && <Text style={styles.amount}>{money(item.unitPrice)}</Text>}
      {priced && <Text style={styles.amount}>{money(millimes(item.unitPrice) * BigInt(item.quantity))}</Text>}
    </View>
  ));

  return pdf(
    <Document title={document.title + " " + document.reference} author="Animalerie Khalil" language="fr-TN">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <Text style={styles.brand}>ANIMALERIE KHALIL</Text>
          <Text style={styles.title}>{document.title}</Text>
          <Text style={styles.label}>{document.reference}</Text>
          <Text style={styles.meta}>Commande {order.reference}</Text>
          <Text style={styles.meta}>Passée le {dateLabel(order.createdAt)}</Text>
          {order.status === "ANNULEE" && <Text style={styles.cancelled}>Commande annulée</Text>}
        </View>
        <View style={styles.box} wrap={false}>
          <Text style={styles.label}>Client et livraison</Text>
          <Text>{order.customerName} · {order.customerPhone}</Text>
          {priced && order.customerEmail && <Text>{order.customerEmail}</Text>}
          <Text>{order.deliveryAddress}</Text>
          {location && <Text>{location}</Text>}
        </View>
        {order.note && <Text style={styles.note}>Note de la commande · {order.note}</Text>}
        <View style={[styles.row, styles.tableHead]} minPresenceAhead={30}>
          <Text style={styles.item}>Article</Text>
          <Text style={styles.qty}>Quantité</Text>
          {priced && <Text style={styles.amount}>Prix unitaire</Text>}
          {priced && <Text style={styles.amount}>Sous-total</Text>}
        </View>
        {rows.slice(0, -1)}
        <View wrap={false}>
          {rows.at(-1)}
          {priced ? (
            <View style={styles.totals}>
              <View style={styles.totalLine}><Text>Sous-total des articles</Text><Text>{money(order.subtotal)}</Text></View>
              <View style={styles.totalLine}><Text>Frais de livraison</Text><Text>{money(order.deliveryFee)}</Text></View>
              <View style={[styles.totalLine, styles.total]}><Text>Montant total</Text><Text>{money(order.total)}</Text></View>
            </View>
          ) : (
            <View style={styles.signOff}>
              {["Livreur", "Destinataire"].map(role => (
                <View key={role} style={styles.signOffBox}>
                  <Text style={styles.signOffTitle}>{role}</Text>
                  <Text>Nom et prénom</Text>
                  <View style={styles.writingLine} />
                  <Text>Date</Text>
                  <View style={styles.writingLine} />
                  <Text>Signature</Text>
                  <View style={styles.signatureSpace} />
                </View>
              ))}
            </View>
          )}
        </View>
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => document.reference + "  ·  " + pageNumber + " / " + totalPages}
        />
      </Page>
    </Document>
  ).toBlob();
}
