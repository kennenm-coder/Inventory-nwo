import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
      plan: "business",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@scanvault.app" },
    update: {},
    create: {
      email: "demo@scanvault.app",
      name: "Demo User",
      passwordHash,
      organizationId: org.id,
      role: "owner",
    },
  });

  const sheet = await prisma.sheet.create({
    data: {
      name: "Inventory",
      description: "Default inventory tracking sheet",
      icon: "📦",
      organizationId: org.id,
      createdById: user.id,
    },
  });

  const fields = [
    { key: "barcode_field", title: "Barcode", type: "barcode" as const, position: 0 },
    { key: "item_name", title: "Item Name", type: "text" as const, position: 1, settings: { required: true } },
    { key: "quantity", title: "Quantity", type: "number" as const, position: 2, settings: { default_value: "0" } },
    { key: "price", title: "Price", type: "currency" as const, position: 3, settings: { currency_code: "USD" } },
    { key: "location", title: "Location", type: "text" as const, position: 4 },
    { key: "category", title: "Category", type: "drop_down" as const, position: 5, settings: { dropdown_options: ["Electronics", "Furniture", "Office Supplies", "Food & Beverage", "Other"] } },
    { key: "in_stock", title: "In Stock", type: "true_false" as const, position: 6 },
    { key: "last_counted", title: "Last Counted", type: "date" as const, position: 7 },
    { key: "notes", title: "Notes", type: "text" as const, position: 8 },
  ];

  for (const field of fields) {
    await prisma.field.create({
      data: {
        sheetId: sheet.id,
        key: field.key,
        title: field.title,
        type: field.type,
        position: field.position,
        settings: field.settings || {},
      },
    });
  }

  const sampleRows = [
    { barcode: "ABC-001", data: { item_name: "Wireless Mouse", quantity: 25, price: 29.99, location: "Warehouse A", category: "Electronics", in_stock: true, notes: "Bluetooth 5.0" } },
    { barcode: "ABC-002", data: { item_name: "USB-C Cable", quantity: 150, price: 9.99, location: "Warehouse A", category: "Electronics", in_stock: true } },
    { barcode: "ABC-003", data: { item_name: "Standing Desk", quantity: 3, price: 449.00, location: "Showroom", category: "Furniture", in_stock: true } },
    { barcode: "ABC-004", data: { item_name: "Notebook (A4)", quantity: 0, price: 4.50, location: "Storage B", category: "Office Supplies", in_stock: false, notes: "Reorder needed" } },
    { barcode: "ABC-005", data: { item_name: "Coffee Beans (1kg)", quantity: 12, price: 18.50, location: "Kitchen", category: "Food & Beverage", in_stock: true } },
  ];

  for (const row of sampleRows) {
    await prisma.row.create({
      data: {
        sheetId: sheet.id,
        barcode: row.barcode,
        data: row.data,
        createdById: user.id,
        lastModifiedById: user.id,
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Organization: ${org.name} (${org.slug})`);
  console.log(`  User: ${user.email} / password123`);
  console.log(`  Sheet: ${sheet.name} with ${fields.length} fields and ${sampleRows.length} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
