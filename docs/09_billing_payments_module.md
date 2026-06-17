# Module 9: Billing & Payments

> **Build Order**: Ninth — aggregates charges from Consultation, Lab, Pharmacy, and Admission.
> **Estimated Effort**: 4–5 days

---

## 1. Module Overview

The Billing & Payments module handles the complete financial workflow of the hospital. It covers:
- Automated invoice generation aggregating all service charges
- Multiple payment methods (UPI, Card, Cash, Insurance)
- Insurance claim management
- Invoice PDF generation
- Payment reconciliation
- Financial reporting for hospital admin
- Refund handling

---

## 2. Invoice Types & Charge Categories

| Charge Type | Triggered By |
|---|---|
| Consultation Fee | Appointment completed |
| Lab Test Charges | Lab order created |
| Medicine Charges | Prescription dispensed |
| Room/Bed Charges | Inpatient admission (daily) |
| Procedure Charges | Surgical/procedure charges |
| Emergency Charges | Emergency registration |
| Miscellaneous | Manual addition by billing team |

---

## 3. Invoice Status Lifecycle

```
DRAFT → PENDING → PARTIALLY_PAID → PAID
                      ↓
                  INSURANCE_CLAIM_SUBMITTED → SETTLED
                      ↓
                  CANCELLED
                      ↓
                  REFUNDED
```

---

## 4. Database Schema

### `invoices` Table

```sql
CREATE TABLE invoices (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  
  invoice_number  TEXT UNIQUE NOT NULL,     -- e.g., INV-2026-001234
  invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  
  appointment_id  TEXT REFERENCES appointments(id),
  admission_id    TEXT REFERENCES admissions(id),
  
  -- Amounts
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount      DECIMAL(12,2) DEFAULT 0,  -- GST if applicable
  tax_percent     DECIMAL(5,2) DEFAULT 0,
  total_amount    DECIMAL(12,2) NOT NULL,
  amount_paid     DECIMAL(12,2) DEFAULT 0,
  balance_amount  DECIMAL(12,2),            -- computed: total - paid
  
  -- Insurance
  insurance_covered_amount DECIMAL(12,2) DEFAULT 0,
  insurance_provider TEXT,
  insurance_policy_no TEXT,
  insurance_claim_no  TEXT,
  insurance_status    TEXT,                 -- NONE | SUBMITTED | APPROVED | REJECTED | SETTLED
  
  status          TEXT NOT NULL DEFAULT 'DRAFT',
  notes           TEXT,
  
  created_by      TEXT REFERENCES users(id),
  finalized_at    TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `invoice_items` Table

```sql
CREATE TABLE invoice_items (
  id              TEXT PRIMARY KEY,
  invoice_id      TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  
  item_type       TEXT NOT NULL,            -- CONSULTATION | LAB_TEST | MEDICINE | ROOM | PROCEDURE | EMERGENCY | MISC
  description     TEXT NOT NULL,
  
  quantity        INTEGER DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_price     DECIMAL(10,2) NOT NULL,
  
  -- Reference to source
  reference_type  TEXT,                     -- 'appointment' | 'lab_order_item' | 'prescription_item'
  reference_id    TEXT,
  
  is_insurance_covered BOOLEAN DEFAULT FALSE,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `payments` Table

```sql
CREATE TABLE payments (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  invoice_id      TEXT NOT NULL REFERENCES invoices(id),
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  
  payment_number  TEXT UNIQUE NOT NULL,     -- e.g., PAY-2026-001234
  
  amount          DECIMAL(12,2) NOT NULL,
  payment_method  TEXT NOT NULL,            -- CASH | CARD | UPI | INSURANCE | CHEQUE | NEFT
  
  -- UPI
  upi_transaction_id TEXT,
  upi_vpa         TEXT,                     -- patient's UPI ID
  
  -- Card
  card_last_four  TEXT,
  card_type       TEXT,                     -- VISA | MASTERCARD | AMEX | RUPAY
  
  -- Payment Gateway
  gateway_name    TEXT,                     -- RAZORPAY | STRIPE | PAYTM
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  
  status          TEXT DEFAULT 'PENDING',   -- PENDING | COMPLETED | FAILED | REFUNDED
  failure_reason  TEXT,
  
  collected_by    TEXT REFERENCES users(id),
  paid_at         TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `refunds` Table

```sql
CREATE TABLE refunds (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  payment_id      TEXT NOT NULL REFERENCES payments(id),
  invoice_id      TEXT NOT NULL REFERENCES invoices(id),
  
  refund_amount   DECIMAL(12,2) NOT NULL,
  reason          TEXT NOT NULL,
  
  gateway_refund_id TEXT,
  status          TEXT DEFAULT 'PENDING',   -- PENDING | PROCESSED | FAILED
  
  initiated_by    TEXT REFERENCES users(id),
  processed_at    TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. API Endpoints

### Invoices
**Base Path:** `/api/v1/billing/invoices`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Billing Executive, Admin | Create draft invoice |
| GET | `/` | Billing Executive, Admin | List invoices |
| GET | `/:id` | Billing, Admin, Patient (own) | Get invoice details |
| PATCH | `/:id` | Billing Executive, Admin | Update invoice (draft only) |
| POST | `/:id/finalize` | Billing Executive, Admin | Finalize invoice (PENDING) |
| POST | `/:id/items` | Billing Executive, Admin | Add item to invoice |
| DELETE | `/:id/items/:itemId` | Billing Executive, Admin | Remove item (draft only) |
| GET | `/:id/pdf` | All (own) | Download invoice PDF |
| POST | `/:id/cancel` | Hospital Admin | Cancel invoice |
| GET | `/patient/:patientId` | Billing, Admin, Patient (own) | Patient invoice history |

### Payments
**Base Path:** `/api/v1/billing/payments`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/initiate` | Billing Executive, Patient | Initiate payment |
| POST | `/verify` | Billing Executive, Patient | Verify payment (gateway webhook) |
| POST | `/cash` | Billing Executive | Record cash payment |
| GET | `/:id` | Billing, Admin | Payment details |
| GET | `/invoice/:invoiceId` | Billing, Admin, Patient (own) | Invoice's payments |
| POST | `/refund` | Hospital Admin | Initiate refund |

### Webhooks (Payment Gateway)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/v1/webhooks/razorpay` | Razorpay (HMAC verified) | Payment event webhook |

---

## 6. Request / Response Contracts

### POST `/api/v1/billing/invoices` — Create Invoice

**Auto-triggered approach:** Invoice is auto-created when an appointment is completed.

**Manual creation:**
```json
{
  "patientId": "01HXY...",
  "appointmentId": "01HXY...",
  "notes": "Includes consultation and lab tests",
  "items": [
    {
      "itemType": "CONSULTATION",
      "description": "Consultation with Dr. Priya Nair",
      "quantity": 1,
      "unitPrice": 1500,
      "referenceType": "appointment",
      "referenceId": "01HXY..."
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "01HXY...",
      "invoiceNumber": "INV-2026-001234",
      "invoiceDate": "2026-06-25",
      "patient": { "name": "Ananya Kapoor", "patientNumber": "PAT-00000001" },
      "items": [
        {
          "itemType": "CONSULTATION",
          "description": "Consultation with Dr. Priya Nair (Cardiology)",
          "quantity": 1,
          "unitPrice": 1500,
          "totalPrice": 1500
        }
      ],
      "subtotal": 1500,
      "taxAmount": 0,
      "discountAmount": 0,
      "totalAmount": 1500,
      "status": "DRAFT"
    }
  }
}
```

---

### POST `/api/v1/billing/payments/initiate` — Razorpay Payment

**Request:**
```json
{
  "invoiceId": "01HXY...",
  "amount": 3750,
  "paymentMethod": "UPI",
  "gatewayName": "RAZORPAY"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "gatewayOrderId": "order_NzMxNTk3NTEx",
    "amount": 375000,
    "currency": "INR",
    "keyId": "rzp_live_XXXXXXXXXX",
    "prefill": {
      "name": "Ananya Kapoor",
      "email": "ananya@example.com",
      "contact": "+919876543210"
    }
  }
}
```

**Razorpay Integration Flow:**
```
1. Backend creates Razorpay order
2. Frontend opens Razorpay checkout with orderId
3. Patient completes payment
4. Razorpay sends webhook to /api/v1/webhooks/razorpay
5. Backend verifies HMAC signature
6. Payment record created: status = COMPLETED
7. Invoice amount_paid updated
8. If fully paid: invoice status = PAID
9. Patient notified with payment receipt
```

---

### POST `/api/v1/billing/payments/cash` — Cash Payment

```json
{
  "invoiceId": "01HXY...",
  "amount": 1500,
  "paymentMethod": "CASH",
  "collectedBy": "01HXY..."
}
```

---

## 7. Invoice Auto-Generation Logic

When different events happen, invoice items are auto-added:

```typescript
// Event: Appointment COMPLETED
async function onAppointmentCompleted(appointmentId: string) {
  const appointment = await getAppointment(appointmentId);
  const doctor = await getDoctor(appointment.doctorId);
  
  // Find or create draft invoice for this appointment
  let invoice = await findOrCreateDraftInvoice(appointment);
  
  await addInvoiceItem(invoice.id, {
    itemType: 'CONSULTATION',
    description: `Consultation with ${doctor.user.firstName} ${doctor.user.lastName}`,
    quantity: 1,
    unitPrice: appointment.appointmentType === 'FOLLOWUP' 
      ? doctor.followUpFee 
      : doctor.consultationFee,
    referenceType: 'appointment',
    referenceId: appointmentId
  });
}

// Event: Lab Order COMPLETED
async function onLabOrderCompleted(labOrderId: string) {
  const labOrder = await getLabOrder(labOrderId);
  for (const item of labOrder.items) {
    await addInvoiceItem(invoice.id, {
      itemType: 'LAB_TEST',
      description: item.testName,
      quantity: 1,
      unitPrice: item.price,
      referenceType: 'lab_order_item',
      referenceId: item.id
    });
  }
}

// Event: Prescription DISPENSED
async function onPrescriptionDispensed(prescriptionId: string) {
  // Add each dispensed medicine to invoice
}
```

---

## 8. Invoice PDF Template

```
[HOSPITAL LOGO]                    TAX INVOICE
APOLLO HOSPITALS DELHI             Invoice No: INV-2026-001234
123 Hospital Road, New Delhi       Date: 25-Jun-2026
Tel: +91-11-40000000               GSTIN: 07AABCA1234R1Z5

BILL TO:
Ananya Kapoor (PAT-00000001)
12, Park Street, Mumbai - 400001
Ph: +91-9876543210

┌─────────────────────────────────────────────────────────────┐
│ # │ Description                    │ Qty │ Rate   │ Amount  │
├───┼────────────────────────────────┼─────┼────────┼─────────┤
│ 1 │ Consultation - Dr. Priya Nair  │  1  │ 1,500  │  1,500  │
│   │   (Cardiology) - New           │     │        │         │
├───┼────────────────────────────────┼─────┼────────┼─────────┤
│ 2 │ Lab Test - CBC                 │  1  │   350  │    350  │
│ 3 │ Lab Test - Serum Iron          │  1  │   200  │    200  │
│ 4 │ Lab Test - Vitamin B12         │  1  │   500  │    500  │
├───┼────────────────────────────────┼─────┼────────┼─────────┤
│ 5 │ Amlodipine 5mg (30 Tab)        │  1  │   180  │    180  │
│ 6 │ Aspirin 75mg (30 Tab)          │  1  │    90  │     90  │
└───┴────────────────────────────────┴─────┴────────┴─────────┘

                             Subtotal:          ₹2,820
                             Discount:             ₹0
                             GST (0%):              ₹0
                             TOTAL:             ₹2,820

Payment Mode: UPI (PhonePe) | Txn: UPI123456789 | ₹2,820

Status: PAID ✓                    Authorized Signatory

This is a computer-generated invoice.
```

---

## 9. GST Configuration

- Consultation and Lab Tests: typically GST exempt in India (healthcare)
- Medicines sold: may attract GST (depends on drug schedule)
- Hospital configures GST applicability per item type in settings

---

## 10. Insurance Claim Flow

```
1. Billing team verifies patient's insurance details
2. Mark relevant invoice items as insurance-covered
3. Submit claim: insurance_status → SUBMITTED
4. Insurance company processes claim
5. Payment received from insurer: insurance_status → SETTLED
6. Remaining balance billed to patient
```

---

## 11. Frontend Pages & Components

| Route | Component | Description |
|---|---|---|
| `/billing` | `BillingDashboard` | Today's revenue, pending invoices |
| `/billing/invoices` | `InvoiceListPage` | All invoices with status filter |
| `/billing/invoices/new` | `CreateInvoicePage` | Manual invoice creation |
| `/billing/invoices/:id` | `InvoiceDetailPage` | View + add items + payment |
| `/billing/payments` | `PaymentsPage` | All payment records |
| `/my-bills` | `PatientBillingPage` | Patient's own invoices |
| `/my-bills/:id` | `PatientInvoicePage` | View + pay online |

### Components

- `InvoiceItemsTable` — Editable line items with CRUD
- `PaymentMethodSelector` — Cash | Card | UPI tabs with respective fields
- `RazorpayCheckout` — Embedded Razorpay payment button
- `InvoicePDFPreview` — PDF preview before download
- `InsuranceClaimPanel` — Insurance submission workflow
- `PaymentStatusBadge` — PAID | PENDING | PARTIAL color badges
- `RevenueSummaryCard` — Daily/weekly/monthly revenue breakdown
- `DiscountApplicator` — Apply discount (requires Hospital Admin approval above X%)

---

## 12. Implementation Checklist

### Backend
- [ ] Create `invoices`, `invoice_items`, `payments`, `refunds` tables
- [ ] Implement auto invoice creation on appointment completion
- [ ] Implement lab charge auto-addition
- [ ] Implement medicine charge auto-addition
- [ ] Implement invoice CRUD with item management
- [ ] Implement Razorpay payment initiation
- [ ] Implement Razorpay webhook with HMAC verification
- [ ] Implement cash payment recording
- [ ] Implement balance computation on every payment
- [ ] Implement invoice PDF generation
- [ ] Implement refund flow
- [ ] Implement insurance claim status tracking
- [ ] Add Swagger docs

### Frontend
- [ ] Billing dashboard with revenue metrics
- [ ] Invoice list with filters
- [ ] Invoice detail with item editing
- [ ] Online payment with Razorpay checkout
- [ ] Cash payment recording form
- [ ] Invoice PDF download
- [ ] Patient billing portal
- [ ] Insurance claim management UI
