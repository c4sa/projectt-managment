-- Add missing 'total' column to vendor_invoices
-- The application sends total (subtotal + VAT) when creating/updating vendor invoices

ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS total NUMERIC;

-- Backfill existing rows where total is null or zero
UPDATE vendor_invoices
SET total = COALESCE(subtotal, 0) + COALESCE(vat, vat_amount, 0)
WHERE total IS NULL OR total = 0;
