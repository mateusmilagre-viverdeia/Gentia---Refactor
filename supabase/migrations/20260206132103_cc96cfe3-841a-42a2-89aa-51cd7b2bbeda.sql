-- Limpar drivers culture_pulse duplicados, mantendo apenas o mais antigo por account_id (por created_at)
DELETE FROM pulse_drivers 
WHERE key = 'culture_pulse' 
AND id NOT IN (
  SELECT DISTINCT ON (account_id) id 
  FROM pulse_drivers 
  WHERE key = 'culture_pulse' 
  ORDER BY account_id, created_at ASC
);