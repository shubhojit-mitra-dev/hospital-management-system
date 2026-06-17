# Module 8: Pharmacy Management

> **Build Order**: Eighth — depends on Consultations/Prescriptions (Module 6).
> **Estimated Effort**: 3–4 days

---

## 1. Module Overview

The Pharmacy Management module handles the complete pharmaceutical operations of the hospital. It covers:
- Medicine inventory management (stock levels, expiry, suppliers)
- Prescription receipt and verification by pharmacist
- Medicine dispensing with tracking
- Stock alerts for low inventory and expiring medicines
- Supplier management
- Integration with billing (medicine charges)
- Integration with AI for prescription explanation

---

## 2. Prescription Fulfillment Lifecycle

```
Doctor Creates Prescription
    ↓
Pharmacy Queue (status: PENDING)
    ↓
Pharmacist Verifies Prescription
    ↓
Checks Inventory Availability
    ↓
Medicines Dispensed to Patient
    ↓
Prescription status → DISPENSED
    ↓
Inventory Updated (stock reduced)
    ↓
Billing updated (medicine charges added)
```

---

## 3. Database Schema

### `medicines` Table (Master Catalog)

```sql
CREATE TABLE medicines (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  
  brand_name      TEXT NOT NULL,           -- e.g., "Crocin"
  generic_name    TEXT NOT NULL,           -- e.g., "Paracetamol"
  composition     TEXT,                    -- e.g., "Paracetamol 500mg"
  category        TEXT NOT NULL,           -- TABLET | SYRUP | INJECTION | CAPSULE | CREAM | DROPS | INHALER | OINTMENT
  
  manufacturer    TEXT,
  drug_schedule   TEXT,                    -- H | H1 | X | OTC (for prescription requirement)
  is_prescription_required BOOLEAN DEFAULT TRUE,
  
  unit_of_measure TEXT DEFAULT 'Tablet',   -- Tablet | mL | Vial | Strip
  
  -- Pricing
  mrp             DECIMAL(10,2),           -- Maximum Retail Price
  selling_price   DECIMAL(10,2) NOT NULL,  -- Hospital selling price
  
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `medicine_inventory` Table

```sql
CREATE TABLE medicine_inventory (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  medicine_id     TEXT NOT NULL REFERENCES medicines(id),
  
  batch_number    TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 0,
  reorder_level   INTEGER DEFAULT 50,       -- alert when stock falls below this
  
  manufacture_date DATE,
  expiry_date     DATE NOT NULL,
  purchase_price  DECIMAL(10,2),
  
  supplier_id     TEXT REFERENCES suppliers(id),
  received_date   DATE DEFAULT CURRENT_DATE,
  
  location        TEXT,                    -- shelf/rack location in pharmacy
  
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(medicine_id, batch_number)
);
```

### `suppliers` Table

```sql
CREATE TABLE suppliers (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  
  drug_license_no TEXT,
  gst_no          TEXT,
  
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `inventory_transactions` Table (Audit trail for stock movements)

```sql
CREATE TABLE inventory_transactions (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  medicine_id     TEXT NOT NULL REFERENCES medicines(id),
  inventory_id    TEXT NOT NULL REFERENCES medicine_inventory(id),
  
  transaction_type TEXT NOT NULL,          -- PURCHASE | DISPENSE | ADJUSTMENT | RETURN | EXPIRE_WRITE_OFF
  quantity_change INTEGER NOT NULL,        -- positive = stock in, negative = stock out
  quantity_before INTEGER NOT NULL,
  quantity_after  INTEGER NOT NULL,
  
  prescription_id TEXT REFERENCES prescriptions(id),
  reference_id    TEXT,                    -- linked entity ID
  notes           TEXT,
  
  performed_by    TEXT NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `dispense_records` Table

```sql
CREATE TABLE dispense_records (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id),
  
  dispensed_by    TEXT NOT NULL REFERENCES users(id),  -- pharmacist
  dispensed_at    TIMESTAMPTZ DEFAULT NOW(),
  
  total_amount    DECIMAL(10,2),
  notes           TEXT,
  
  -- Dispense items stored in prescription_items.dispensed_qty
  
  patient_signature_url TEXT                           -- S3 URL of digital signature
);
```

---

## 4. API Endpoints

### Medicine Catalog
**Base Path:** `/api/v1/medicines`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Authenticated | Search medicine catalog |
| POST | `/` | Hospital Admin, Pharmacist | Add medicine |
| GET | `/:id` | Authenticated | Get medicine details |
| PATCH | `/:id` | Hospital Admin, Pharmacist | Update medicine |
| DELETE | `/:id` | Hospital Admin | Deactivate medicine |

### Inventory
**Base Path:** `/api/v1/pharmacy/inventory`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Pharmacist, Admin | List inventory with stock levels |
| POST | `/` | Pharmacist, Admin | Add inventory batch (stock received) |
| GET | `/:id` | Pharmacist, Admin | Get batch details |
| PATCH | `/:id` | Pharmacist, Admin | Update batch (quantity adjustment) |
| GET | `/alerts/low-stock` | Pharmacist, Admin | Medicines below reorder level |
| GET | `/alerts/expiring` | Pharmacist, Admin | Medicines expiring soon |
| GET | `/transactions` | Pharmacist, Admin | Stock movement history |

### Prescription Fulfillment
**Base Path:** `/api/v1/pharmacy/prescriptions`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Pharmacist | Pending prescriptions queue |
| GET | `/:id` | Pharmacist, Doctor, Patient (own) | Prescription details |
| POST | `/:id/verify` | Pharmacist | Verify prescription |
| POST | `/:id/dispense` | Pharmacist | Dispense medicines |
| POST | `/:id/partial-dispense` | Pharmacist | Partial dispense if some out of stock |

### Suppliers
**Base Path:** `/api/v1/pharmacy/suppliers`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Pharmacist, Admin | List suppliers |
| POST | `/` | Admin | Add supplier |
| PATCH | `/:id` | Admin | Update supplier |

---

## 5. Request / Response Contracts

### GET `/api/v1/pharmacy/prescriptions` — Pending Queue

**Response (200):**
```json
{
  "success": true,
  "data": {
    "prescriptions": [
      {
        "id": "01HXY...",
        "prescriptionNo": "RX-2026-001234",
        "patient": {
          "id": "...",
          "name": "Ananya Kapoor",
          "patientNumber": "PAT-00000001",
          "allergies": [{ "substance": "Penicillin", "severity": "SEVERE" }]
        },
        "doctor": { "name": "Dr. Priya Nair", "department": "Cardiology" },
        "diagnosis": "Hypertension",
        "items": [
          {
            "id": "01HXY...",
            "medicineName": "Amlodipine",
            "dosage": "5mg",
            "form": "TABLET",
            "frequency": "Once daily",
            "durationDays": 30,
            "quantity": 30,
            "availableStock": 145,
            "isAvailable": true
          },
          {
            "id": "01HXY...",
            "medicineName": "Aspirin",
            "dosage": "75mg",
            "form": "TABLET",
            "frequency": "Once daily",
            "durationDays": 30,
            "quantity": 30,
            "availableStock": 0,
            "isAvailable": false
          }
        ],
        "status": "PENDING",
        "createdAt": "2026-06-25T11:30:00Z"
      }
    ]
  }
}
```

---

### POST `/api/v1/pharmacy/prescriptions/:id/dispense`

**Request Body:**
```json
{
  "items": [
    {
      "prescriptionItemId": "01HXY...",
      "quantityDispensed": 30,
      "inventoryId": "01HXY...",      -- batch to draw from
      "batchNumber": "B2024-001"
    },
    {
      "prescriptionItemId": "01HXY...",
      "quantityDispensed": 0,          -- out of stock, skip
      "reason": "OUT_OF_STOCK"
    }
  ],
  "notes": "Aspirin not available, patient advised to purchase from outside."
}
```

**What happens on dispense:**
1. `prescription_items.dispensed_qty` updated
2. `medicine_inventory.quantity` decremented
3. `inventory_transactions` record created (DISPENSE type)
4. If all items dispensed → `prescription.status = DISPENSED`
5. If some items skipped → `prescription.status = PARTIAL`
6. `dispense_records` record created
7. Patient notified: "Your prescription is ready for pickup"
8. Billing service called to add medicine charges to invoice

---

### GET `/api/v1/pharmacy/inventory/alerts/low-stock`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "medicine": { "id": "...", "brandName": "Metformin 500mg", "genericName": "Metformin" },
        "currentStock": 12,
        "reorderLevel": 50,
        "urgency": "CRITICAL",
        "suggestedOrderQuantity": 200,
        "lastSupplier": { "id": "...", "name": "Sun Pharma Distributors" }
      }
    ],
    "total": 8
  }
}
```

---

### GET `/api/v1/pharmacy/inventory/alerts/expiring`

Returns medicines expiring in the next 90 days:

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "medicine": { "brandName": "Amoxicillin 250mg Syrup" },
        "batchNumber": "B2024-022",
        "expiryDate": "2026-08-31",
        "daysUntilExpiry": 67,
        "currentStock": 24,
        "urgency": "WARNING"
      }
    ]
  }
}
```

---

## 6. Inventory Management Logic

### Stock Deduction on Dispense (FIFO)

```typescript
// When dispensing, always use earliest-expiry batch first (FEFO — First Expired, First Out)
async function deductInventory(medicineId: string, quantity: number) {
  const batches = await prisma.medicineInventory.findMany({
    where: { medicineId, quantity: { gt: 0 }, isActive: true },
    orderBy: { expiryDate: 'asc' }  // Earliest expiry first
  });
  
  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const deduct = Math.min(batch.quantity, remaining);
    await prisma.medicineInventory.update({
      where: { id: batch.id },
      data: { quantity: { decrement: deduct } }
    });
    await createInventoryTransaction(batch, -deduct, 'DISPENSE');
    remaining -= deduct;
  }
}
```

### Low Stock Alert Trigger

A BullMQ job runs every hour:
```typescript
// Check all medicines against reorder level
// If currentStock < reorderLevel → create notification for Pharmacist + Admin
// Don't spam — only alert once per 24 hours per medicine
```

### Expiry Alert Trigger

A BullMQ job runs daily at 7 AM:
```typescript
// Check medicines expiring in next 30, 60, 90 days
// Create tiered notifications: CRITICAL (30d) | WARNING (60d) | INFO (90d)
```

---

## 7. Medicine Search for Prescription

When doctor types in prescription builder:
```
GET /api/v1/medicines?search=amlo&includeStock=true
```
Returns medicines with real-time stock availability so doctors know what's in stock.

---

## 8. Frontend Pages & Components

### Pharmacist Pages

| Route | Component | Description |
|---|---|---|
| `/pharmacy` | `PharmacyDashboard` | Overview: pending Rx, alerts, stats |
| `/pharmacy/prescriptions` | `PrescriptionQueuePage` | All pending prescriptions |
| `/pharmacy/prescriptions/:id` | `PrescriptionDetailPage` | Verify + dispense workflow |
| `/pharmacy/inventory` | `InventoryPage` | Full stock list with search |
| `/pharmacy/inventory/add` | `AddInventoryPage` | Receive new stock batch |
| `/pharmacy/alerts` | `InventoryAlertsPage` | Low stock + expiry alerts |
| `/pharmacy/suppliers` | `SuppliersPage` | Supplier management |
| `/pharmacy/transactions` | `TransactionsPage` | Full stock movement audit log |

### Admin Pages

| Route | Component | Description |
|---|---|---|
| `/admin/pharmacy` | `PharmacyAdminDashboard` | Revenue, inventory value, alerts |
| `/admin/medicines` | `MedicineCatalogPage` | Manage hospital medicine catalog |

### Components

- `PrescriptionDispenseForm` — Line-by-line dispense with stock check
- `InventoryTable` — Filterable table with stock level indicators
- `StockLevelBar` — Progress bar: green (OK) → orange (low) → red (critical)
- `ExpiryBadge` — Shows days until expiry with color coding
- `MedicineSearchDropdown` — Autocomplete for medicine name + stock level
- `BatchSelector` — Dropdown to select which inventory batch to draw from
- `InventoryAlertCard` — Alert card showing medicine, stock, reorder level
- `StockMovementChart` — Recharts line chart for stock trends

---

## 9. Pharmacy Dashboard Metrics

| Metric | Description |
|---|---|
| Pending Prescriptions | Count of Rx awaiting dispensing |
| Today Dispensed | Revenue from medicines today |
| Low Stock Alerts | Count of items below reorder level |
| Expiring Soon | Medicines expiring within 30 days |
| Inventory Value | Total value of current stock |
| Out of Stock Items | Count of medicines with 0 stock |

---

## 10. Implementation Checklist

### Backend
- [ ] Create `medicines`, `medicine_inventory`, `suppliers`, `inventory_transactions`, `dispense_records` tables
- [ ] Implement medicine catalog CRUD
- [ ] Implement inventory batch management
- [ ] Implement FEFO stock deduction algorithm
- [ ] Implement prescription dispensing endpoint
- [ ] Implement partial dispense handling
- [ ] Implement low stock alert job (BullMQ)
- [ ] Implement expiry alert job (BullMQ)
- [ ] Implement inventory transaction audit trail
- [ ] Integrate with billing (add medicine charges)
- [ ] Implement medicine search with stock level
- [ ] Add Swagger docs

### Frontend
- [ ] Pharmacy dashboard
- [ ] Prescription queue with patient allergy warnings
- [ ] Dispense form with per-item batch selection
- [ ] Inventory management with CRUD
- [ ] Alerts page (low stock + expiry)
- [ ] Stock movement history
- [ ] Supplier management
- [ ] Medicine catalog admin page
