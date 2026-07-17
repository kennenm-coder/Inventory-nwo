import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const g = globalThis as unknown as {
  __devTables?: Record<string, Map<string, Record<string, unknown>>>;
  __devSeedPromise?: Promise<void>;
};

if (!g.__devTables) {
  g.__devTables = {
    users: new Map(),
    organizations: new Map(),
    sheets: new Map(),
    fields: new Map(),
    rows: new Map(),
    sheetUsers: new Map(),
    auditLogs: new Map(),
    triggers: new Map(),
    webhooks: new Map(),
    webhookLogs: new Map(),
    fileUploads: new Map(),
  };
}

const tables = g.__devTables;

const DEMO_ORG_ID = "00000000-0000-4000-a000-000000000001";
const DEMO_USER_ID = "00000000-0000-4000-a000-000000000002";
const DEMO_SHEET_ID = "00000000-0000-4000-a000-000000000003";

async function doSeed() {
  const passwordHash = await bcrypt.hash("password123", 4);

  tables.organizations.set(DEMO_ORG_ID, {
    id: DEMO_ORG_ID, name: "Demo Organization", slug: "demo-org",
    customDomain: null, branding: {}, plan: "business",
    apiKeyHash: null, createdAt: new Date(), updatedAt: new Date(),
  });

  tables.users.set(DEMO_USER_ID, {
    id: DEMO_USER_ID, email: "demo@scanvault.app", name: "Demo User",
    passwordHash, avatarUrl: null, organizationId: DEMO_ORG_ID,
    role: "owner", createdAt: new Date(), updatedAt: new Date(),
  });

  tables.sheets.set(DEMO_SHEET_ID, {
    id: DEMO_SHEET_ID, organizationId: DEMO_ORG_ID, name: "Inventory",
    description: "Default inventory tracking sheet", icon: "📦",
    createdById: DEMO_USER_ID, isArchived: false,
    createdAt: new Date(), updatedAt: new Date(),
  });

  const fieldDefs = [
    { key: "barcode_field", title: "Barcode", type: "barcode", position: 0, settings: {} },
    { key: "item_name", title: "Item Name", type: "text", position: 1, settings: { required: true } },
    { key: "quantity", title: "Quantity", type: "number", position: 2, settings: { default_value: "0" } },
    { key: "price", title: "Price", type: "currency", position: 3, settings: { currency_code: "USD" } },
    { key: "location", title: "Location", type: "text", position: 4, settings: {} },
    { key: "category", title: "Category", type: "drop_down", position: 5, settings: { dropdown_options: ["Electronics", "Furniture", "Office Supplies", "Food & Beverage", "Other"] } },
    { key: "in_stock", title: "In Stock", type: "true_false", position: 6, settings: {} },
    { key: "last_counted", title: "Last Counted", type: "date", position: 7, settings: {} },
    { key: "notes", title: "Notes", type: "text", position: 8, settings: {} },
  ];

  for (let i = 0; i < fieldDefs.length; i++) {
    const id = `00000000-0000-4000-b000-00000000010${i}`;
    tables.fields.set(id, { id, sheetId: DEMO_SHEET_ID, ...fieldDefs[i], createdAt: new Date(), updatedAt: new Date() });
  }

  const sampleRows = [
    { barcode: "ABC-001", data: { item_name: "Wireless Mouse", quantity: 25, price: 29.99, location: "Warehouse A", category: "Electronics", in_stock: true, notes: "Bluetooth 5.0" } },
    { barcode: "ABC-002", data: { item_name: "USB-C Cable", quantity: 150, price: 9.99, location: "Warehouse A", category: "Electronics", in_stock: true } },
    { barcode: "ABC-003", data: { item_name: "Standing Desk", quantity: 3, price: 449.00, location: "Showroom", category: "Furniture", in_stock: true } },
    { barcode: "ABC-004", data: { item_name: "Notebook (A4)", quantity: 0, price: 4.50, location: "Storage B", category: "Office Supplies", in_stock: false, notes: "Reorder needed" } },
    { barcode: "ABC-005", data: { item_name: "Coffee Beans (1kg)", quantity: 12, price: 18.50, location: "Kitchen", category: "Food & Beverage", in_stock: true } },
  ];

  for (let i = 0; i < sampleRows.length; i++) {
    const id = `00000000-0000-4000-c000-00000000020${i}`;
    tables.rows.set(id, {
      id, sheetId: DEMO_SHEET_ID, barcode: sampleRows[i].barcode, data: sampleRows[i].data,
      createdById: DEMO_USER_ID, lastModifiedById: DEMO_USER_ID,
      createdAt: new Date(), updatedAt: new Date(),
    });
  }
}

function seed(): Promise<void> {
  if (!g.__devSeedPromise) {
    g.__devSeedPromise = doSeed();
  }
  return g.__devSeedPromise;
}

function matchesWhere(record: Record<string, unknown>, where: Record<string, unknown>): boolean {
  for (const [key, val] of Object.entries(where)) {
    if (key === "AND" || key === "OR" || key === "NOT") continue;
    if (val && typeof val === "object" && "in" in (val as Record<string, unknown>)) {
      const inList = (val as Record<string, unknown>).in as unknown[];
      if (!inList.includes(record[key])) return false;
      continue;
    }
    if (val && typeof val === "object" && "not" in (val as Record<string, unknown>)) {
      if (record[key] === (val as Record<string, unknown>).not) return false;
      continue;
    }
    if (record[key] !== val) return false;
  }
  return true;
}

function resolveIncludes(tableName: string, record: Record<string, unknown>, include?: Record<string, unknown>): Record<string, unknown> {
  const result = { ...record };
  if (!include) return result;

  for (const [key, config] of Object.entries(include)) {
    if (key === "_count") {
      const countConfig = config as { select: Record<string, boolean> };
      const counts: Record<string, number> = {};
      for (const countKey of Object.keys(countConfig.select)) {
        const relTable = countKey === "rows" ? "rows" : countKey === "fields" ? "fields" : countKey;
        const fk = tableName === "sheets" ? "sheetId" : "organizationId";
        let count = 0;
        for (const r of tables[relTable]?.values() || []) {
          if ((r as Record<string, unknown>)[fk] === record.id) count++;
        }
        counts[countKey] = count;
      }
      result._count = counts;
      continue;
    }

    if (key === "createdBy" || key === "lastModifiedBy" || key === "uploadedBy" || key === "user") {
      const fkField = key === "createdBy" ? "createdById" : key === "lastModifiedBy" ? "lastModifiedById" : key === "uploadedBy" ? "uploadedById" : "userId";
      const user = tables.users.get(record[fkField] as string);
      if (user && config && typeof config === "object" && "select" in config) {
        const selected: Record<string, unknown> = {};
        for (const k of Object.keys((config as { select: Record<string, boolean> }).select)) {
          selected[k] = (user as Record<string, unknown>)[k];
        }
        result[key] = selected;
      } else {
        result[key] = user || null;
      }
      continue;
    }

    if (key === "organization") {
      const org = tables.organizations.get(record.organizationId as string);
      if (org && config && typeof config === "object" && "select" in config) {
        const selected: Record<string, unknown> = {};
        for (const k of Object.keys((config as { select: Record<string, boolean> }).select)) {
          selected[k] = (org as Record<string, unknown>)[k];
        }
        result[key] = selected;
      } else {
        result[key] = org || null;
      }
      continue;
    }

    if (key === "sheet") {
      const sheet = tables.sheets.get(record.sheetId as string);
      if (sheet && config && typeof config === "object" && "select" in config) {
        const selected: Record<string, unknown> = {};
        for (const k of Object.keys((config as { select: Record<string, boolean> }).select)) {
          selected[k] = (sheet as Record<string, unknown>)[k];
        }
        result[key] = selected;
      } else {
        result[key] = sheet || null;
      }
      continue;
    }

    if (key === "fields") {
      const fields: Record<string, unknown>[] = [];
      for (const f of tables.fields.values()) {
        if ((f as Record<string, unknown>).sheetId === record.id) fields.push(f as Record<string, unknown>);
      }
      const orderBy = config && typeof config === "object" && "orderBy" in config ? config.orderBy : null;
      if (orderBy && typeof orderBy === "object" && "position" in (orderBy as Record<string, unknown>)) {
        fields.sort((a, b) => (a.position as number) - (b.position as number));
      }
      result[key] = fields;
      continue;
    }
  }

  return result;
}

function applySelect(record: Record<string, unknown>, select?: Record<string, boolean>): Record<string, unknown> {
  if (!select) return record;
  const result: Record<string, unknown> = {};
  for (const [key, include] of Object.entries(select)) {
    if (include) result[key] = record[key];
  }
  return result;
}

function createModel(tableName: string) {
  return {
    findMany: async (args?: { where?: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: Record<string, string> | Record<string, string>[]; select?: Record<string, boolean> }) => {
      await seed();
      const table = tables[tableName];
      let results: Record<string, unknown>[] = [];
      for (const record of table.values()) {
        if (!args?.where || matchesWhere(record as Record<string, unknown>, args.where)) {
          results.push(record as Record<string, unknown>);
        }
      }
      results = results.map((r) => resolveIncludes(tableName, r, args?.include));
      if (args?.select) results = results.map((r) => applySelect(r, args.select));
      return results;
    },

    findFirst: async (args?: { where?: Record<string, unknown>; include?: Record<string, unknown>; select?: Record<string, boolean> }) => {
      await seed();
      for (const record of tables[tableName].values()) {
        if (!args?.where || matchesWhere(record as Record<string, unknown>, args.where)) {
          let result = resolveIncludes(tableName, record as Record<string, unknown>, args?.include);
          if (args?.select) result = applySelect(result, args.select);
          return result;
        }
      }
      return null;
    },

    findUnique: async (args: { where: Record<string, unknown>; include?: Record<string, unknown>; select?: Record<string, boolean> }) => {
      await seed();
      if (args.where.id) {
        const record = tables[tableName].get(args.where.id as string);
        if (!record) return null;
        let result = resolveIncludes(tableName, record as Record<string, unknown>, args?.include);
        if (args?.select) result = applySelect(result, args.select);
        return result;
      }
      // Handle unique field lookups (email, slug, etc.)
      for (const record of tables[tableName].values()) {
        if (matchesWhere(record as Record<string, unknown>, args.where)) {
          let result = resolveIncludes(tableName, record as Record<string, unknown>, args?.include);
          if (args?.select) result = applySelect(result, args.select);
          return result;
        }
      }
      return null;
    },

    create: async (args: { data: Record<string, unknown> }) => {
      await seed();
      const id = (args.data.id as string) || randomUUID();
      const record = { ...args.data, id, createdAt: new Date(), updatedAt: new Date() };
      tables[tableName].set(id, record);
      return record;
    },

    createMany: async (args: { data: Record<string, unknown>[] }) => {
      await seed();
      for (const item of args.data) {
        const id = (item.id as string) || randomUUID();
        tables[tableName].set(id, { ...item, id, createdAt: new Date(), updatedAt: new Date() });
      }
      return { count: args.data.length };
    },

    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      await seed();
      const existing = tables[tableName].get(args.where.id);
      if (!existing) throw new Error("Record not found");
      const updated = { ...existing, ...args.data, updatedAt: new Date() };
      tables[tableName].set(args.where.id, updated);
      return updated;
    },

    upsert: async (args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      await seed();
      for (const record of tables[tableName].values()) {
        if (matchesWhere(record as Record<string, unknown>, args.where)) {
          const updated = { ...record, ...args.update, updatedAt: new Date() };
          tables[tableName].set((record as Record<string, unknown>).id as string, updated);
          return updated;
        }
      }
      const id = randomUUID();
      const created = { ...args.create, id, createdAt: new Date(), updatedAt: new Date() };
      tables[tableName].set(id, created);
      return created;
    },

    delete: async (args: { where: { id: string } }) => {
      await seed();
      const record = tables[tableName].get(args.where.id);
      tables[tableName].delete(args.where.id);
      return record;
    },

    deleteMany: async (args?: { where?: Record<string, unknown> }) => {
      await seed();
      let count = 0;
      for (const [id, record] of tables[tableName].entries()) {
        if (!args?.where || matchesWhere(record as Record<string, unknown>, args.where)) {
          tables[tableName].delete(id);
          count++;
        }
      }
      return { count };
    },

    count: async (args?: { where?: Record<string, unknown> }) => {
      await seed();
      let count = 0;
      for (const record of tables[tableName].values()) {
        if (!args?.where || matchesWhere(record as Record<string, unknown>, args.where)) count++;
      }
      return count;
    },

    aggregate: async (args?: { where?: Record<string, unknown>; _max?: Record<string, boolean> }) => {
      await seed();
      const result: Record<string, Record<string, unknown>> = {};
      if (args?._max) {
        result._max = {};
        for (const field of Object.keys(args._max)) {
          let max: unknown = null;
          for (const record of tables[tableName].values()) {
            if (args?.where && !matchesWhere(record as Record<string, unknown>, args.where)) continue;
            const val = (record as Record<string, unknown>)[field];
            if (val != null && (max == null || (val as number) > (max as number))) max = val;
          }
          result._max[field] = max;
        }
      }
      return result;
    },

    getFirstAsync: async () => null,
    getAllAsync: async () => [],
  };
}

export const devPrisma = {
  user: createModel("users"),
  organization: createModel("organizations"),
  sheet: createModel("sheets"),
  field: createModel("fields"),
  row: createModel("rows"),
  sheetUser: createModel("sheetUsers"),
  auditLog: createModel("auditLogs"),
  trigger: createModel("triggers"),
  webhook: createModel("webhooks"),
  webhookLog: createModel("webhookLogs"),
  fileUpload: createModel("fileUploads"),
};
