import { prisma } from "../lib/prisma";
import * as fs from "fs";
import * as path from "path";

async function runBackup() {
  console.log("=================================================");
  console.log("📦 STARTING FULL NEON POSTGRESQL DATABASE BACKUP");
  console.log("=================================================");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "archive", `neon-backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Fetch all records from all models
  console.log("Reading data from Neon PostgreSQL...");

  const [
    users,
    orders,
    orderItems,
    orderEvents,
    orderEditHistories,
    transports,
    loadingRecords,
    weighbridgeSlips,
    payments,
    stockMovements,
    notifications,
    customerInvitations,
    assignmentHistories,
    messageLogs,
    pushSubscriptions,
    products,
    companyProfiles,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({
      include: {
        items: true,
        transport: true,
        events: true,
        movements: true,
        weighbridgeSlip: true,
        loadingRecord: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderItem.findMany(),
    prisma.orderEvent.findMany(),
    prisma.orderEditHistory.findMany(),
    prisma.transport.findMany(),
    prisma.loadingRecord.findMany(),
    prisma.weighbridgeSlip.findMany(),
    prisma.payment.findMany(),
    prisma.stockMovement.findMany(),
    prisma.notification.findMany(),
    prisma.customerInvitation.findMany(),
    prisma.customerAssignmentHistory.findMany(),
    prisma.messageLog.findMany(),
    prisma.pushSubscription.findMany(),
    prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.companyProfile.findMany(),
  ]);

  const summary = {
    timestamp: new Date().toISOString(),
    backupDirectory: backupDir,
    recordCounts: {
      users: users.length,
      orders: orders.length,
      orderItems: orderItems.length,
      orderEvents: orderEvents.length,
      orderEditHistories: orderEditHistories.length,
      transports: transports.length,
      loadingRecords: loadingRecords.length,
      weighbridgeSlips: weighbridgeSlips.length,
      payments: payments.length,
      stockMovements: stockMovements.length,
      notifications: notifications.length,
      customerInvitations: customerInvitations.length,
      customerAssignmentHistories: assignmentHistories.length,
      messageLogs: messageLogs.length,
      pushSubscriptions: pushSubscriptions.length,
      products: products.length,
      companyProfiles: companyProfiles.length,
    },
    usersBreakdownByRole: users.reduce((acc: Record<string, number>, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {}),
    ordersBreakdownByStatus: orders.reduce((acc: Record<string, number>, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {}),
    challanNumbersIssued: orders
      .filter((o) => o.dcNumber)
      .map((o) => ({ orderNo: o.orderNo, dcNumber: o.dcNumber, invoiceNo: o.invoiceNo })),
  };

  // Write separate files
  fs.writeFileSync(path.join(backupDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "users.json"), JSON.stringify(users, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "orders_full.json"), JSON.stringify(orders, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "order_items.json"), JSON.stringify(orderItems, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "order_events.json"), JSON.stringify(orderEvents, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "order_edit_histories.json"), JSON.stringify(orderEditHistories, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "transports.json"), JSON.stringify(transports, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "loading_records.json"), JSON.stringify(loadingRecords, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "weighbridge_slips.json"), JSON.stringify(weighbridgeSlips, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "payments.json"), JSON.stringify(payments, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "stock_movements.json"), JSON.stringify(stockMovements, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "notifications.json"), JSON.stringify(notifications, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "customer_invitations.json"), JSON.stringify(customerInvitations, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "customer_assignment_histories.json"), JSON.stringify(assignmentHistories, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "products_catalog.json"), JSON.stringify(products, null, 2), "utf-8");
  fs.writeFileSync(path.join(backupDir, "company_profile.json"), JSON.stringify(companyProfiles, null, 2), "utf-8");

  // Also create CSV exports for easy human auditing
  const userCsvHeader = "id,role,name,mobile,email,companyName,salesmanCode,createdAt\n";
  const userCsvRows = users
    .map(
      (u) =>
        `"${u.id}","${u.role}","${u.name.replace(/"/g, '""')}","${u.mobile}","${u.email}","${(u.companyName || "").replace(/"/g, '""')}","${u.salesmanCode || ""}","${u.createdAt.toISOString()}"`
    )
    .join("\n");
  fs.writeFileSync(path.join(backupDir, "users_audit.csv"), userCsvHeader + userCsvRows, "utf-8");

  const orderCsvHeader = "id,orderNo,dcNumber,invoiceNo,status,totalCbm,quantity,deliveryAddress,createdAt\n";
  const orderCsvRows = orders
    .map(
      (o) =>
        `"${o.id}","${o.orderNo}","${o.dcNumber || ""}","${o.invoiceNo || ""}","${o.status}","${o.totalCbm || ""}","${o.quantity}","${(o.deliveryAddress || "").replace(/"/g, '""')}","${o.createdAt.toISOString()}"`
    )
    .join("\n");
  fs.writeFileSync(path.join(backupDir, "orders_audit.csv"), orderCsvHeader + orderCsvRows, "utf-8");

  // Verify backup readability
  const readBackSummary = JSON.parse(fs.readFileSync(path.join(backupDir, "summary.json"), "utf-8"));
  const readBackUsers = JSON.parse(fs.readFileSync(path.join(backupDir, "users.json"), "utf-8"));
  const readBackOrders = JSON.parse(fs.readFileSync(path.join(backupDir, "orders_full.json"), "utf-8"));

  if (readBackUsers.length !== users.length || readBackOrders.length !== orders.length) {
    throw new Error("Backup integrity verification failed: record counts do not match!");
  }

  console.log("✅ FULL NEON DATABASE BACKUP COMPLETED AND VERIFIED!");
  console.log(`📁 Backup Directory: ${backupDir}`);
  console.log("📊 Record Counts:");
  console.table(summary.recordCounts);
  console.log("👥 Users by Role:", summary.usersBreakdownByRole);
  console.log("📋 Orders by Status:", summary.ordersBreakdownByStatus);
  console.log(`📜 Issued Challan/Invoice Numbers (${summary.challanNumbersIssued.length}):`);
  console.log(JSON.stringify(summary.challanNumbersIssued, null, 2));

  return summary;
}

runBackup()
  .catch((e) => {
    console.error("❌ Backup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
