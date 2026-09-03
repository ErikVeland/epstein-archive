/* @name getTransactions */
SELECT
  id,
  from_entity,
  to_entity,
  amount,
  currency,
  transaction_date,
  transaction_type,
  method,
  risk_level,
  description,
  investigation_id,
  source_document_id,
  metadata_json,
  created_at
FROM financial_transactions
ORDER BY transaction_date DESC, id DESC
LIMIT :limit! OFFSET :offset!;

/* @name getTransactionsByInvestigation */
SELECT
  id,
  from_entity,
  to_entity,
  amount,
  currency,
  transaction_date,
  transaction_type,
  method,
  risk_level,
  description,
  investigation_id,
  source_document_id,
  metadata_json,
  created_at
FROM financial_transactions
WHERE investigation_id = :investigationId!::bigint
ORDER BY transaction_date DESC;

/* @name getTransactionsByEntity */
SELECT
  id,
  from_entity,
  to_entity,
  amount,
  currency,
  transaction_date,
  transaction_type,
  method,
  risk_level,
  description,
  investigation_id,
  source_document_id,
  metadata_json,
  created_at
FROM financial_transactions
WHERE from_entity = :entityName! OR to_entity = :entityName!
ORDER BY transaction_date DESC;

/* @name saveTransaction */
INSERT INTO financial_transactions (
  from_entity, to_entity, amount, currency, transaction_date, 
  transaction_type, method, risk_level, description, 
  investigation_id, source_document_id, metadata_json
) VALUES (
  :fromEntity!, :toEntity!, :amount!, :currency!, :transactionDate!,
  :transactionType!, :method!, :riskLevel!, :description!,
  :investigationId, :sourceDocumentId, :metadataJson
)
RETURNING id;

/* @name getFinancialSummary */
SELECT
  (SELECT SUM(amount) FROM financial_transactions) as "totalValue",
  (SELECT COUNT(*)::integer FROM financial_transactions WHERE risk_level IN ('high', 'critical')) as "highRiskCount",
  (SELECT COUNT(*)::integer FROM financial_transactions) as "totalTransactions";

/* @name getTopFinancialEntities */
SELECT entity, SUM(amount) as "totalVolume" FROM (
  SELECT from_entity as entity, amount FROM financial_transactions
  UNION ALL
  SELECT to_entity as entity, amount FROM financial_transactions
) t 
GROUP BY entity 
ORDER BY "totalVolume" DESC 
LIMIT :limit!;
