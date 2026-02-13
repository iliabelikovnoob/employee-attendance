-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "kb_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "categoryId" TEXT,
    "authorId" TEXT NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_article_tags" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "kb_article_tags_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "kb_article_links" (
    "sourceArticleId" TEXT NOT NULL,
    "targetArticleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_article_links_pkey" PRIMARY KEY ("sourceArticleId","targetArticleId")
);

-- CreateTable
CREATE TABLE "kb_article_versions" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_article_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_comments" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_favorites" (
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_favorites_pkey" PRIMARY KEY ("userId","articleId")
);

-- CreateTable
CREATE TABLE "kb_media" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kb_categories_parentId_idx" ON "kb_categories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "kb_articles_slug_key" ON "kb_articles"("slug");

-- CreateIndex
CREATE INDEX "kb_articles_categoryId_idx" ON "kb_articles"("categoryId");

-- CreateIndex
CREATE INDEX "kb_articles_authorId_idx" ON "kb_articles"("authorId");

-- CreateIndex
CREATE INDEX "kb_articles_status_idx" ON "kb_articles"("status");

-- CreateIndex
CREATE INDEX "kb_articles_slug_idx" ON "kb_articles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "kb_tags_name_key" ON "kb_tags"("name");

-- CreateIndex
CREATE INDEX "kb_article_tags_articleId_idx" ON "kb_article_tags"("articleId");

-- CreateIndex
CREATE INDEX "kb_article_tags_tagId_idx" ON "kb_article_tags"("tagId");

-- CreateIndex
CREATE INDEX "kb_article_links_sourceArticleId_idx" ON "kb_article_links"("sourceArticleId");

-- CreateIndex
CREATE INDEX "kb_article_links_targetArticleId_idx" ON "kb_article_links"("targetArticleId");

-- CreateIndex
CREATE INDEX "kb_article_versions_articleId_idx" ON "kb_article_versions"("articleId");

-- CreateIndex
CREATE INDEX "kb_article_versions_editedBy_idx" ON "kb_article_versions"("editedBy");

-- CreateIndex
CREATE INDEX "kb_comments_articleId_idx" ON "kb_comments"("articleId");

-- CreateIndex
CREATE INDEX "kb_comments_userId_idx" ON "kb_comments"("userId");

-- CreateIndex
CREATE INDEX "kb_favorites_userId_idx" ON "kb_favorites"("userId");

-- CreateIndex
CREATE INDEX "kb_favorites_articleId_idx" ON "kb_favorites"("articleId");

-- CreateIndex
CREATE INDEX "kb_media_articleId_idx" ON "kb_media"("articleId");

-- CreateIndex
CREATE INDEX "kb_media_uploadedBy_idx" ON "kb_media"("uploadedBy");

-- AddForeignKey
ALTER TABLE "kb_categories" ADD CONSTRAINT "kb_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "kb_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "kb_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_article_tags" ADD CONSTRAINT "kb_article_tags_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "kb_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_article_tags" ADD CONSTRAINT "kb_article_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "kb_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_article_links" ADD CONSTRAINT "kb_article_links_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "kb_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_article_links" ADD CONSTRAINT "kb_article_links_targetArticleId_fkey" FOREIGN KEY ("targetArticleId") REFERENCES "kb_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_article_versions" ADD CONSTRAINT "kb_article_versions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "kb_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_article_versions" ADD CONSTRAINT "kb_article_versions_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_comments" ADD CONSTRAINT "kb_comments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "kb_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_comments" ADD CONSTRAINT "kb_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_favorites" ADD CONSTRAINT "kb_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_favorites" ADD CONSTRAINT "kb_favorites_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "kb_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_media" ADD CONSTRAINT "kb_media_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "kb_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_media" ADD CONSTRAINT "kb_media_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
