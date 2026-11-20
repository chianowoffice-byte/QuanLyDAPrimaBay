-- Migration: Thêm các column còn thiếu vào bảng loan_files
-- Chạy trong Supabase Dashboard > SQL Editor
-- Các lệnh ALTER TABLE IF NOT EXISTS (an toàn, không lỗi nếu column đã tồn tại)

ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS locked_by          text;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS drive_folder_url   text;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS pca_code           text;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS hdtd_code          text;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS mortgage_code      text;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS htls_agreement     text;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS qlts_agreement     text;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS disbursement_1     bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS equity_amount      bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS collateral_value_ratio bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS vtc_5pct           bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS payment_account    text;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS min_account_balance bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS valuation_1        bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS valuation_2        bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS hdmb_value_with_mgt bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS grace_period_months integer;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS income_salary      bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS income_business    bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS income_rental      bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS income_other       bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS expense_living     bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS expense_debt       bigint;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS area_usable        numeric;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS area_construction  numeric;
ALTER TABLE loan_files ADD COLUMN IF NOT EXISTS last_contact_date  timestamptz;

-- Sau khi chạy xong, vào Supabase > API > Reload schema cache
-- hoặc gọi: SELECT pgrst_reload_config();
