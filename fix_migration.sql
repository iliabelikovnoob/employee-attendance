-- Удалить запись о дубликате миграции
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20260210_add_knowledge_base';
