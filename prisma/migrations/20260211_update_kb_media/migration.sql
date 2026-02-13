-- AlterTable: Make articleId optional (nullable)
DO $$
BEGIN
  ALTER TABLE "kb_media" ALTER COLUMN "articleId" DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    NULL; -- Игнорируем ошибку, если уже nullable
END $$;

-- AlterTable: Add url field (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_media' AND column_name = 'url'
  ) THEN
    ALTER TABLE "kb_media" ADD COLUMN "url" TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Update existing records to have url based on filename
UPDATE "kb_media"
SET "url" = '/uploads/kb/' || "filename"
WHERE "url" = '' OR "url" IS NULL;

-- Remove default value for url (idempotent)
DO $$
BEGIN
  ALTER TABLE "kb_media" ALTER COLUMN "url" DROP DEFAULT;
EXCEPTION
  WHEN others THEN
    NULL; -- Игнорируем ошибку, если default уже убран
END $$;
