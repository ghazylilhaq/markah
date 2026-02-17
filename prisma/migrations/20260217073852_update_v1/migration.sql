/*
  Warnings:

  - You are about to drop the column `search_vector` on the `Bookmark` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Bookmark_search_vector_idx";

-- AlterTable
ALTER TABLE "Bookmark" DROP COLUMN "search_vector";
