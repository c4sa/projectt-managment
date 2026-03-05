-- Add missing 'vat' column to vendor_invoices
-- The application sends vat (calculated VAT amount) when creating/updating vendor invoices

ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS vat NUMERIC;
