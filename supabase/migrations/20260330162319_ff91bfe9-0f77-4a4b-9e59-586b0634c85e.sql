
-- Step 1: Consolidate all credit balances into a single 'universal' type per account
-- Insert universal record summing all existing balances, or update if it already exists
INSERT INTO recruitment_usage_credits (account_id, credit_type, balance, monthly_included, monthly_used, total_purchased, total_used)
SELECT 
  account_id,
  'universal' as credit_type,
  COALESCE(SUM(balance), 0) as balance,
  COALESCE(SUM(monthly_included), 0) as monthly_included,
  COALESCE(SUM(monthly_used), 0) as monthly_used,
  COALESCE(SUM(total_purchased), 0) as total_purchased,
  COALESCE(SUM(total_used), 0) as total_used
FROM recruitment_usage_credits
WHERE credit_type != 'universal'
GROUP BY account_id
ON CONFLICT (account_id, credit_type) 
DO UPDATE SET 
  balance = EXCLUDED.balance,
  monthly_included = EXCLUDED.monthly_included,
  monthly_used = EXCLUDED.monthly_used,
  total_purchased = EXCLUDED.total_purchased,
  total_used = EXCLUDED.total_used;

-- Step 2: Remove old credit type records (keep only universal)
DELETE FROM recruitment_usage_credits WHERE credit_type != 'universal';

-- Step 3: Update all credit costs to point to universal
UPDATE recruitment_credit_costs SET credit_type = 'universal' WHERE credit_type != 'universal';

-- Step 4: Update all credit packages to universal
UPDATE recruitment_credit_packages SET credit_type = 'universal' WHERE credit_type != 'universal';
