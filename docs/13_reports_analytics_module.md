# Module 13: Reports & Analytics Dashboard

> **Build Order**: Thirteenth — consumes data from all previous modules.
> **Estimated Effort**: 3–4 days

---

## 1. Module Overview

The Reports & Analytics module provides data-driven insights to Hospital Administrators and Super Admins. It covers:
- Hospital-level operational dashboard with KPIs
- Revenue analytics and financial reports
- Patient volume and demographic analytics
- Doctor utilization and performance metrics
- Lab workload analysis
- Bed occupancy tracking
- Department performance metrics
- Exportable reports (PDF, Excel)

---

## 2. Dashboard Audience & Access

| Dashboard | Audience | Scope |
|---|---|---|
| **Super Admin Dashboard** | Super Admin | All hospitals, cross-hospital comparison |
| **Hospital Admin Dashboard** | Hospital Admin | Own hospital, all departments |
| **Doctor Dashboard** | Doctor | Own patients, appointments, consultations |
| **Department Dashboard** | Hospital Admin | Single department KPIs |

---

## 3. Core Metrics

### Financial Metrics

| Metric | Description | Calculation |
|---|---|---|
| Total Revenue | Gross revenue for period | SUM(payments.amount) WHERE status=COMPLETED |
| Outstanding Balance | Unpaid invoices | SUM(invoices.balance_amount) WHERE status=PENDING |
| Revenue by Department | Per-department revenue | JOIN appointments + invoices + departments |
| Revenue by Month | Monthly trend | GROUP BY DATE_TRUNC('month', paid_at) |
| Insurance Collected | Insurance payments | SUM WHERE payment_method='INSURANCE' |
| Average Invoice Value | Mean invoice size | AVG(invoices.total_amount) |

### Patient Metrics

| Metric | Description |
|---|---|
| Total Patients | COUNT(patients) in hospital |
| New Patients | COUNT where created_at in period |
| Repeat Patients | Patients with >1 completed appointment |
| Patients by Department | Department visit distribution |
| Patients by Gender | Gender breakdown |
| Patients by Age Group | Age bucket distribution |
| Average Waiting Time | AVG(appointment start - arrival time) |

### Doctor Metrics

| Metric | Description |
|---|---|
| Doctor Utilization | (Appointments completed / Max capacity) × 100% |
| Appointments per Doctor | Count per doctor in period |
| Revenue per Doctor | Consultation fees collected |
| Consultation Duration | Average consultation time |
| No-Show Rate | % appointments marked NO_SHOW |
| Follow-up Rate | % appointments that generated follow-up |

### Lab Metrics

| Metric | Description |
|---|---|
| Total Tests Ordered | COUNT(lab_order_items) |
| Tests by Category | Distribution by test category |
| Average TAT | Time from order to result |
| Abnormal Rate | % tests with ABNORMAL result |
| Lab Revenue | SUM of lab test charges |

### Bed Metrics

| Metric | Description |
|---|---|
| Bed Occupancy Rate | Occupied / Total beds × 100% |
| Average Length of Stay | AVG(discharge_date - admission_date) |
| Admissions per Month | COUNT(admissions) per month |
| Ward-wise Occupancy | Per-ward occupancy breakdown |
| ICU Occupancy | ICU bed utilization |

---

## 4. Database Analytics Views

Create PostgreSQL views for efficient dashboard queries:

```sql
-- Daily revenue summary view
CREATE MATERIALIZED VIEW daily_revenue_summary AS
SELECT
  hospital_id,
  DATE(paid_at) AS date,
  SUM(amount) AS total_revenue,
  COUNT(DISTINCT invoice_id) AS invoices_paid,
  SUM(amount) FILTER (WHERE payment_method = 'CASH') AS cash_revenue,
  SUM(amount) FILTER (WHERE payment_method IN ('UPI', 'CARD')) AS digital_revenue,
  SUM(amount) FILTER (WHERE payment_method = 'INSURANCE') AS insurance_revenue
FROM payments
WHERE status = 'COMPLETED'
GROUP BY hospital_id, DATE(paid_at);
-- Refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue_summary;

-- Monthly appointment stats
CREATE MATERIALIZED VIEW monthly_appointment_stats AS
SELECT
  hospital_id,
  department_id,
  DATE_TRUNC('month', appointment_date) AS month,
  COUNT(*) AS total_appointments,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
  COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
  COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_show,
  COUNT(DISTINCT patient_id) AS unique_patients
FROM appointments
GROUP BY hospital_id, department_id, DATE_TRUNC('month', appointment_date);
```

---

## 5. API Endpoints

**Base Path:** `/api/v1/reports`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/dashboard/overview` | Admin | Hospital KPI summary |
| GET | `/revenue` | Admin | Revenue breakdown |
| GET | `/revenue/trend` | Admin | Revenue over time |
| GET | `/patients/summary` | Admin | Patient analytics |
| GET | `/patients/demographics` | Admin | Age, gender, blood group breakdown |
| GET | `/doctors/utilization` | Admin | Doctor performance metrics |
| GET | `/departments/performance` | Admin | Dept-wise KPIs |
| GET | `/lab/summary` | Admin, Lab Tech | Lab workload analytics |
| GET | `/pharmacy/summary` | Admin, Pharmacist | Inventory + dispensing analytics |
| GET | `/beds/occupancy` | Admin | Bed occupancy stats |
| GET | `/emergency/summary` | Admin | Emergency case analytics |
| GET | `/export/revenue` | Admin | Export revenue report as Excel/PDF |
| GET | `/export/patients` | Admin | Export patient list as Excel |
| GET | `/export/appointments` | Admin | Export appointment list as Excel |
| GET | `/super-admin/overview` | Super Admin | Cross-hospital comparison |

---

## 6. Request / Response Contracts

### GET `/api/v1/reports/dashboard/overview`

**Query Parameters:**
```
?period=today|week|month|year|custom
?startDate=2026-06-01
?endDate=2026-06-30
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "dateRange": { "start": "2026-06-01", "end": "2026-06-30" },
    "kpis": {
      "totalRevenue": { "value": 1250000, "change": 8.5, "changeDirection": "UP" },
      "totalPatients": { "value": 1847, "change": 12.3, "changeDirection": "UP" },
      "appointmentsCompleted": { "value": 2143, "change": 5.2, "changeDirection": "UP" },
      "bedOccupancyRate": { "value": 74.5, "change": -2.1, "changeDirection": "DOWN" },
      "avgWaitingTime": { "value": 18, "unit": "minutes", "change": -3.2, "changeDirection": "UP" },
      "outstandingBalance": { "value": 87500, "change": 15.0, "changeDirection": "DOWN" }
    }
  }
}
```

---

### GET `/api/v1/reports/revenue/trend`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trend": [
      { "period": "Jan 2026", "revenue": 980000, "consultations": 180000, "lab": 220000, "pharmacy": 350000, "room": 230000 },
      { "period": "Feb 2026", "revenue": 1050000, "consultations": 195000, "lab": 235000, "pharmacy": 380000, "room": 240000 },
      { "period": "Mar 2026", "revenue": 1120000, "consultations": 210000, "lab": 250000, "pharmacy": 400000, "room": 260000 },
      { "period": "Apr 2026", "revenue": 1080000, "consultations": 200000, "lab": 240000, "pharmacy": 390000, "room": 250000 },
      { "period": "May 2026", "revenue": 1180000, "consultations": 220000, "lab": 270000, "pharmacy": 420000, "room": 270000 },
      { "period": "Jun 2026", "revenue": 1250000, "consultations": 235000, "lab": 285000, "pharmacy": 445000, "room": 285000 }
    ]
  }
}
```

---

### GET `/api/v1/reports/doctors/utilization`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "doctor": { "id": "...", "name": "Dr. Priya Nair", "department": "Cardiology" },
        "appointmentsScheduled": 80,
        "appointmentsCompleted": 72,
        "appointmentsCancelled": 5,
        "noShows": 3,
        "utilizationRate": 90,
        "revenue": 108000,
        "avgConsultationTime": 22,
        "followUpRate": 35
      }
    ]
  }
}
```

---

### GET `/api/v1/reports/beds/occupancy`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalBeds": 200,
      "occupiedBeds": 149,
      "availableBeds": 46,
      "maintenanceBeds": 5,
      "occupancyRate": 74.5,
      "avgLengthOfStay": 4.2
    },
    "byWard": [
      {
        "ward": "ICU", "totalBeds": 10, "occupiedBeds": 9, "occupancyRate": 90
      },
      {
        "ward": "General Ward A", "totalBeds": 40, "occupiedBeds": 28, "occupancyRate": 70
      }
    ],
    "trend": [
      { "date": "2026-06-24", "occupancyRate": 72 },
      { "date": "2026-06-25", "occupancyRate": 74.5 }
    ]
  }
}
```

---

## 7. Charts and Visualizations

### Revenue Dashboard Charts
- **Revenue Trend** — Multi-line chart (Recharts): Total, Consultation, Lab, Pharmacy, Room
- **Revenue by Department** — Bar chart: Department vs revenue
- **Payment Methods** — Donut chart: Cash, UPI, Card, Insurance
- **Revenue vs Target** — Gauge chart

### Patient Dashboard Charts
- **Patient Volume Trend** — Line chart: Daily/weekly/monthly patients
- **Age Distribution** — Histogram: Patients by age group
- **Gender Breakdown** — Donut chart
- **New vs Returning** — Stacked bar: per month
- **Top Departments by Patients** — Horizontal bar chart

### Doctor Dashboard Charts
- **Utilization Heatmap** — Calendar heatmap of appointment density
- **Doctor Performance Table** — Sortable table with all metrics

### Bed Occupancy Charts
- **Occupancy Gauge** — Circular gauge per ward
- **Occupancy Trend** — Area chart: 30-day occupancy trend
- **Length of Stay Distribution** — Histogram

---

## 8. Report Export

### Excel Export (using `exceljs`)

```typescript
async function exportRevenueExcel(params) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Revenue Report');
  
  sheet.addRow(['Apollo Hospitals Delhi - Revenue Report']);
  sheet.addRow([`Period: ${params.startDate} to ${params.endDate}`]);
  sheet.addRow([]);
  sheet.addRow(['Date', 'Consultations', 'Lab Tests', 'Medicines', 'Room Charges', 'Total', 'Payment Method']);
  
  for (const row of data) {
    sheet.addRow([...]);
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
```

### PDF Report Export

- Hospital letterhead
- Date range and filter info
- Summary KPI table
- Charts rendered server-side (using `chart.js` + `canvas` or pre-rendered images)
- Detailed data table
- Generated using `@react-pdf/renderer`

---

## 9. Doctor's Own Dashboard

When a doctor logs in, they see their personal dashboard:

```json
{
  "today": {
    "appointmentsScheduled": 20,
    "appointmentsCompleted": 8,
    "appointmentsRemaining": 12,
    "nextPatient": { "name": "Ananya Kapoor", "tokenNo": 9, "time": "10:30 AM" }
  },
  "thisMonth": {
    "totalPatients": 180,
    "totalRevenue": 270000,
    "avgRating": 4.8
  },
  "pendingActions": {
    "labResultsToReview": 3,
    "prescriptionsToSign": 0,
    "emergenciesAssigned": 0
  }
}
```

---

## 10. Frontend Pages & Components

| Route | Component | Description |
|---|---|---|
| `/admin/dashboard` | `HospitalDashboard` | Main admin overview |
| `/admin/reports/revenue` | `RevenueReportPage` | Revenue analytics + export |
| `/admin/reports/patients` | `PatientAnalyticsPage` | Patient demographics + trends |
| `/admin/reports/doctors` | `DoctorUtilizationPage` | Doctor performance table |
| `/admin/reports/departments` | `DepartmentPerformancePage` | Dept-wise KPIs |
| `/admin/reports/beds` | `BedOccupancyPage` | Bed analytics + ward breakdown |
| `/admin/reports/lab` | `LabAnalyticsPage` | Lab workload + TAT |
| `/admin/reports/pharmacy` | `PharmacyAnalyticsPage` | Inventory + dispensing |
| `/admin/reports/emergency` | `EmergencyAnalyticsPage` | Emergency case stats |
| `/super-admin/dashboard` | `SuperAdminDashboard` | Cross-hospital overview |
| `/doctor/dashboard` | `DoctorDashboard` | Doctor's personal stats |

### Shared Components

- `KPICard` — Metric card with value, change %, direction arrow
- `RevenueLineChart` — Multi-dataset line chart (Recharts)
- `DepartmentBarChart` — Horizontal bar chart
- `OccupancyGauge` — Circular gauge component
- `DataTable` — Sortable, filterable table with export button
- `DateRangePicker` — Period selector (Today/Week/Month/Year/Custom)
- `ExportButton` — Dropdown: Download PDF | Download Excel
- `MetricChangeIndicator` — Green/red arrows with % change
- `ChartSkeleton` — Loading state for charts

---

## 11. Caching Strategy

Analytics queries can be expensive. Cache at multiple levels:

```typescript
// Redis cache keys
// Key: `report:${hospitalId}:dashboard:overview:${period}`
// TTL: 5 minutes for real-time, 1 hour for historical

// Materialized Views refreshed:
// - daily_revenue_summary: every 15 minutes
// - monthly_appointment_stats: every 1 hour
// - Via BullMQ scheduled jobs
```

---

## 12. Implementation Checklist

### Backend
- [ ] Create PostgreSQL materialized views for heavy aggregations
- [ ] Implement dashboard overview endpoint
- [ ] Implement revenue trend endpoint
- [ ] Implement patient analytics endpoints
- [ ] Implement doctor utilization endpoint
- [ ] Implement department performance endpoint
- [ ] Implement bed occupancy endpoint
- [ ] Implement lab analytics endpoint
- [ ] Implement pharmacy analytics endpoint
- [ ] Implement emergency analytics endpoint
- [ ] Implement Excel export (exceljs)
- [ ] Implement PDF report export
- [ ] Implement Redis caching for all analytics endpoints
- [ ] Set up materialized view refresh jobs (BullMQ cron)
- [ ] Add Swagger docs

### Frontend
- [ ] Hospital admin dashboard with all KPI cards
- [ ] Revenue analytics page with charts
- [ ] Patient analytics with demographics
- [ ] Doctor utilization table
- [ ] Bed occupancy visualization
- [ ] Department performance page
- [ ] Date range picker (connected to all reports)
- [ ] Export buttons (Excel + PDF)
- [ ] Doctor personal dashboard
- [ ] Super admin cross-hospital dashboard
