# Invoicely — Translation Strings

All UI strings used in the app. Edit the Romanian (`ro`) column as needed.  
File location: `src/lib/i18n/index.ts`

---

## common

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| save | Save | Salvează |
| cancel | Cancel | Anulează |
| delete | Delete | Șterge |
| edit | Edit | Editează |
| close | Close | Închide |
| search | Search | Caută |
| yes | Yes | DA |
| no | No | NU |
| back | Back | Înapoi |
| addNew | Add new | Adaugă nou |

---

## nav

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| dashboard | Dashboard | Dashboard |
| invoices | Invoices | Facturi |
| clients | Clients | Clienți |
| analytics | Analytics | Analytics |
| companies | Companies | Companii |
| settings | Settings | Setări |
| support | Support & Feedback | Support & Feedback |
| logout | Sign out | Deconectare |
| language | Language | Limbă |

---

## status (invoice badges)

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| DRAFT | Unpaid | Neîncasată |
| SENT | Unpaid | Neîncasată |
| PAID | Paid | Plătită |
| CANCELLED | Cancelled | Anulată |

---

## dashboard

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| title | Dashboard | Dashboard |
| subtitle | Welcome! Manage your company invoices. | Bun venit! Gestionați facturile companiei. |
| totalInvoiced | Total Invoiced (RON) | Total facturi (RON) |
| totalInvoices | Total Invoices | Total facturi |
| unpaid | Unpaid | Neîncasate |
| clients | Clients | Clienți |
| recentInvoices | Recent Invoices | Facturi recente |
| viewAll | View all → | Vezi toate → |
| noInvoices | No invoices. | Nicio factură. |
| createFirst | Create your first invoice | Creați prima factură |
| number | Number | Număr |
| client | Client | Client |
| date | Date | Dată |
| totalRon | Total RON | Total RON |
| status | Status | Status |
| newInvoice | New Invoice | Factură nouă |

---

## invoices

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| title | Invoices | Facturi |
| countLabel | `{n} invoice(s)` | `{n} factură(i)` |
| noInvoices | No invoices created. | Nicio factură creată. |
| createFirst | Create your first invoice | Creați prima factură |
| newInvoice | New Invoice | Factură nouă |
| number | Number | Număr |
| client | Client | Client |
| issueDate | Issue Date | Emitere |
| status | Status | Status |
| actions | Actions | Acțiuni |
| deleteConfirm | `Delete invoice {n}?` | `Ștergeți factura {n}?` |
| deleteError | Error deleting | Eroare la ștergere |
| deleteSuccess | `Invoice {n} deleted` | `Factura {n} a fost ștearsă` |
| editTitle | Edit | Editează |
| downloadPdf | Download PDF | Descarcă PDF |
| duplicateTitle | Duplicate | Duplică |
| deleteTitle | Delete | Șterge |

---

## clients

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| title | Clients | Clienți |
| countLabel | `{n} client(s)` | `{n} clienți înregistrați` |
| noClients | No clients. Add one using the button above. | Niciun client. Adăugați unul cu butonul de mai sus. |
| noClientsShort | No clients. | Niciun client. |
| addNew | New Client | Client nou |
| addTitle | Add client | Adaugă client |
| editTitle | Edit client | Editează client |
| name | Name | Nume |
| cui | CUI | CUI |
| address | Address | Adresă |
| currency | Currency | Monedă |
| vat | VAT | TVA |
| invoicesCol | Invoices | Facturi |
| actions | Actions | Acțiuni |
| vatPayer | VAT Payer | Plătitor TVA |
| invoiceCurrency | Invoice Currency | Monedă facturare |
| nameRequired | Name is required | Numele este obligatoriu |
| saveSuccess | Client updated | Client actualizat |
| saveError | Save error | Eroare la salvare |
| deleteError | Delete error | Eroare la ștergere |
| deleteSuccess | Client deleted | Client șters |
| addSuccess | `Client {n} added` | `Clientul {n} a fost adăugat` |
| cuiLookup | CUI (optional — autofill from ANAF) | CUI (opțional — autofill din ANAF) |
| nameLabel | Name * | Nume * |
| cuiLabel | CUI | CUI |
| addressLabel | Address | Adresă |
| phoneLabel | Phone | Telefon |
| emailLabel | Email | Email |
| cuiPlaceholder | ex. RO12345678 | ex. RO12345678 |
| namePlaceholder | Company SRL | Firma SRL |
| lookupButton | Search | Caută |
| lookupError | Company not found | Firma nu a fost găsită |
| cuiError | CUI lookup error | Eroare la căutarea CUI |
| saveButton | Save | Salvează |
| cancelButton | Cancel | Anulează |

---

## companies

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| title | My Company | Compania mea |
| subtitle | Supplier details that appear on invoices | Datele furnizorului care apar pe facturi |
| cuiLabel | CUI * | CUI * |
| nameLabel | Name * | Denumire * |
| addressLabel | Address | Adresă |
| bankLabel | Bank | Bancă |
| ibanLabel | IBAN | IBAN |
| phoneLabel | Phone | Telefon |
| emailLabel | Email | Email |
| vatPayerLabel | VAT Payer (RO prefix) | Plătitor TVA (RO prefix) |
| vatRateLabel | VAT Rate (%) | Cotă TVA (%) |
| anafButton | ANAF | ANAF |
| anafHint | Enter CUI and press ANAF to auto-fill. | Introdu CUI-ul și apasă ANAF pentru a prelua datele automat. |
| anafSuccess | Data imported from ANAF | Date preluate din ANAF |
| anafNotFound | No data found for this CUI | Nu s-au găsit date pentru acest CUI |
| anafError | CUI lookup error | Eroare la căutare CUI |
| required | CUI and Name are required | CUI și Denumire sunt obligatorii |
| saveSuccess | Company saved | Compania a fost salvată |
| saveError | Save error | Eroare la salvare |
| deleteConfirm | Delete company? Existing invoices will not be affected. | Ștergi compania? Facturile existente nu vor fi afectate. |
| deleteSuccess | Company deleted | Compania a fost ștearsă |
| deleteError | Delete error | Eroare la ștergere |
| deleteButton | Delete company | Șterge compania |
| resetButton | Reset | Resetează |
| saveButton | Save | Salvează |
| saving | Saving... | Se salvează... |

---

## settings

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| title | Settings | Setări |
| subtitle | Configure the application | Configurați aplicația |
| database | Database | Baza de date |
| anafApi | ANAF API | ANAF API |
| bnrXml | BNR XML | BNR XML |
| pdf | PDF | PDF |
| language | Language | Limbă |

---

## invoice (editor)

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| newTitle | New Invoice | Factură nouă |
| editorTab | Editor | Editor |
| previewTab | Preview | Preview |
| clientSection | Client | Client |
| currencySection | Invoice Currency | Monedă factură |
| datesSection | Invoice Details | Date factură |
| itemsSection | Line Items | Articole |
| notesSection | Notes | Mențiuni |
| footerSection | Footer text | Text footer |
| numberLabel | Invoice number | Număr factură |
| issueDateLabel | Issue date | Data emiterii |
| shipDateLabel | Ship date | Data expediției |
| dueDateLabel | Due date | Termen de plată |
| loadExample | Load example | Încarcă exemplu |
| addRow | + Add row | + Adaugă rând |
| saveButton | Save invoice | Salvează factura |
| saveChanges | Save changes | Salvează modificările |
| bnrLabel | BNR | BNR |
| bnrError | Could not fetch BNR rate | Nu s-a putut prelua cursul BNR |
| paidBanner | Invoice is marked as Paid and cannot be edited. Mark as unpaid to edit again. | Factura este marcată ca Plătită și nu mai poate fi editată. Marchează ca neîncasată pentru a o edita din nou. |
| noCompanyBanner | You haven't added your company details (Supplier). | Nu ai adăugat datele companiei tale (Furnizor). |
| addNow | Add now | Adaugă acum |
| unsavedTitle | Unsaved changes | Modificări nesalvate |
| unsavedBody | If you leave this page, your data will be lost. | Dacă părăsiți pagina, datele introduse se vor pierde. |
| stayButton | Stay on page | Rămân pe pagină |
| leaveButton | Leave page | Părăsesc pagina |

---

## support

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| title | Support & Feedback | Support & Feedback |
| typeLabel | Request type | Tip solicitare |
| typeIssue | Technical issue | Problemă tehnică |
| typeFeedback | Feedback | Feedback |
| typeQuestion | Question | Întrebare |
| typeOther | Other | Altele |
| subjectLabel | Subject * | Subiect * |
| subjectPlaceholder | e.g. Cannot generate PDF | Ex: Nu pot genera PDF-ul |
| descLabel | Description * | Descriere * |
| descPlaceholder | Describe your issue or feedback... | Descrie problema sau feedback-ul tău... |
| nameLabel | Name * | Nume * |
| namePlaceholder | Your name | Numele tău |
| phoneLabel | Phone * | Telefon * |
| phonePlaceholder | +40 7xx xxx xxx | Ex: 07xx xxx xxx |
| emailLabel | Email * | Email * |
| emailPlaceholder | your@email.com | adresa@ta.ro |
| sendButton | Send | Trimite |
| sentTitle | Message sent! | Mesaj trimis! |
| sentSubtext | We'll get back to you as soon as possible. | Îți vom răspunde cât mai curând posibil. |
| closeButton | Close | Închide |

---

## markPaid

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| markPaid | Mark as paid | Marchează plătită |
| markUnpaid | Mark as unpaid | Marcează ca neîncasată |
| markedPaid | Marked as paid | Marcată ca plătită |
| markedUnpaid | Marked as unpaid | Marcată ca neîncasată |
| error | Error updating status | Eroare la actualizare status |

---

## newInvoiceFlow (AI)

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| title | New Invoice with AI | Factură nouă cu AI |
| subtitle | Describe the invoice in a few words and we'll fill it in automatically. | Descrie factura în câteva cuvinte și o completăm automat pentru tine. |
| manualButton | Fill in manually | Completează manual |
| dividerOr | or | sau |

---

## login

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| subtitle | Sign in to continue | Autentifică-te pentru a continua |
| error | An error occurred. Please try again. | A apărut o eroare. Încearcă din nou. |
| google | Continue with Google | Continuă cu Google |

---

## onboarding

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| title | Set up your company | Configurează-ți compania |
| subtitle | These details will appear on your invoices. You can change them anytime. | Aceste date vor apărea pe facturile tale. Le poți modifica oricând. |
| searchAnaf | Search ANAF | Caută ANAF |
| continueButton | Continue | Continuă |

---

## invoicePreview

| Key | English (EN) | Romanian (RO) |
|-----|-------------|---------------|
| supplier | Supplier | Furnizor |
| client | Client | Client |
| vatPayer | (VAT Payer) | (Plătitor TVA) |
| nonVatPayer | (Non-VAT Payer) | (Neplătitor TVA) |
| fiscalInvoice | FISCAL INVOICE | FACTURĂ FISCALĂ |
| serviceDescription | Service description | Denumirea serviciilor |
| unitMeasure | Unit | U.M. |
| quantity | Qty | Cantitate |
| subtotalRon | Subtotal RON | Subtotal RON |
| totalVatIncl | Total VAT incl. | Total TVA inclus |
| noItems | No items added | Niciun articol adăugat |
| issueDate | Issue date | Data emiterii |
| shipDate | Ship date | Data expediției |
| dueDate | Due date | Termen de plată |
| bankLabel | Bank | Bancă |
| ibanLabel | IBAN | IBAN |
| nr | No. | Nr. |

---

_To update a translation: edit the corresponding value in `src/lib/i18n/index.ts` under the `ro` object._