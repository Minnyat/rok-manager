-- Formula Plugin: cho phép mỗi KVK chọn formula type riêng
-- Thêm formula_type và formula_params vào kvks table

-- 1. Thêm columns vào kvks
ALTER TABLE kvks ADD COLUMN formula_type TEXT NOT NULL DEFAULT 'dkp';
ALTER TABLE kvks ADD COLUMN formula_params TEXT NOT NULL DEFAULT '{}';

-- 2. Backfill từ kvk_scoring_config → kvks.formula_params (JSON object)
-- Chuyển key-value rows thành JSON object cho các KVK đã có config
UPDATE kvks SET
    formula_params = (
        SELECT
            COALESCE(
                JSON_GROUP_OBJECT(
                    kvk_scoring_config.key, kvk_scoring_config.value
                ),
                '{}'
            )
        FROM kvk_scoring_config
        WHERE kvk_scoring_config.kvk_id = kvks.id
    )
WHERE EXISTS (
    SELECT 1 FROM kvk_scoring_config
    WHERE kvk_scoring_config.kvk_id = kvks.id
);

-- 3. Set formula_type = 'dkp' cho tất cả KVK hiện tại (default)
-- (Đã được set bởi DEFAULT 'dkp' ở trên, nhưng ghi rõ để documentation)
-- UPDATE kvks SET formula_type = 'dkp' WHERE formula_type IS NULL OR formula_type = '';
