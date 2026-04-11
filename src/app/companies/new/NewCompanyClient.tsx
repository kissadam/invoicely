"use client";

import CompanyForm from "@/components/CompanyForm";

export default function NewCompanyClient() {
  return (
    <CompanyForm
      existing={null}
      onSaved={() => { window.location.href = "/"; }}
    />
  );
}