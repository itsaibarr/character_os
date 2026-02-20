ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS str_weight smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS int_weight smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dis_weight smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cha_weight smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cre_weight smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spi_weight smallint DEFAULT 0;
