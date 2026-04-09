# Invoicely — Romanian Invoicing SaaS

Production-ready invoicing app for Romanian businesses. Integrates ANAF CUI lookup, live BNR exchange rates, and PDF generation.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 App Router + TypeScript + TailwindCSS |
| Backend | Next.js API Routes (Node.js) |
| Database | PostgreSQL + Prisma ORM |
| PDF | Puppeteer (HTML → PDF) |
| State | React hooks + Zustand-ready |

## Quick Start

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env
# Edit DATABASE_URL

# 3. Create DB schema
npm run db:push

# 4. Run dev server
npm run dev
```

Open http://localhost:3000

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── invoices/
│   │   ├── page.tsx                # Invoice list
│   │   ├── new/page.tsx            # Create invoice
│   │   └── [id]/page.tsx           # Invoice detail
│   ├── clients/page.tsx            # Client list
│   ├── companies/page.tsx          # Supplier setup
│   └── api/
│       ├── company/[cui]/          # ANAF CUI lookup
│       ├── invoices/               # Invoice CRUD
│       ├── invoices/[id]/pdf/      # PDF download
│       ├── invoices/[id]/duplicate/# Duplicate invoice
│       ├── exchange-rate/          # BNR EUR rate
│       ├── clients/                # Client CRUD
│       └── companies/              # Company CRUD
├── components/
│   ├── layout/Sidebar.tsx
│   ├── invoice/
│   │   ├── InvoiceEditor.tsx       # Main creation form
│   │   ├── InvoicePreview.tsx      # Live HTML preview
│   │   └── LineItemRow.tsx         # Editable line item
│   └── CompanyForm.tsx
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── anaf.ts                     # ANAF API integration
│   ├── bnr.ts                      # BNR XML rate fetcher
│   ├── pdf.ts                      # Puppeteer PDF builder
│   └── calculations.ts             # Invoice math
└── types/invoice.ts                # Shared TypeScript types
```

## Key Design Decisions

### ANAF CUI Lookup
- Results cached in `AnafCache` table for 24h to reduce API calls
- Stale cache returned as fallback when ANAF is down
- CUI validation via check digit algorithm before any API call

### Exchange Rate (BNR)
- Fetched from BNR XML feed at invoice creation time
- Rate is **locked into the invoice** — never recalculated later
- Displayed as: `Curs EUR din ziua precedentă facturării: 1 EUR = X RON`

### Invoice Calculation
```
subtotal_eur = quantity × price_eur
subtotal_ron = subtotal_eur × exchange_rate
total_ron    = Σ(subtotal_ron)
```

### PDF Generation
- `buildInvoiceHtml()` → pure HTML string (testable without Puppeteer)
- `generateInvoicePdf()` → launches Chromium, renders HTML, exports A4 PDF
- Template config (column visibility, labels, accent color) is stored as JSON

### Template System
Each invoice can reference an `InvoiceTemplate` with a `TemplateConfig` JSON:
- Enable/disable/rename columns
- Custom footer text
- Accent color override

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/company/:cui` | GET | ANAF lookup with DB cache |
| `/api/exchange-rate` | GET | Current EUR→RON from BNR |
| `/api/invoices` | GET | List invoices |
| `/api/invoices` | POST | Create invoice |
| `/api/invoices/:id` | GET | Get invoice |
| `/api/invoices/:id` | PATCH | Update invoice |
| `/api/invoices/:id` | DELETE | Delete invoice |
| `/api/invoices/:id/pdf` | GET | Download PDF |
| `/api/invoices/:id/duplicate` | POST | Duplicate as draft |
| `/api/clients` | GET/POST | List/create clients |
| `/api/companies` | POST | Create supplier company |
| `/api/companies/:id` | PATCH | Update supplier company |

## Adding Authentication

The app uses `DEMO_USER_ID = "demo-user"` as a placeholder.
To add real auth, replace this with `session.user.id` from NextAuth.js or Clerk.

```bash
npm install next-auth
# or
npm install @clerk/nextjs
```

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/invoicely"
```