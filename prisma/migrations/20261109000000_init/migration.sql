-- CreateEnum
CREATE TYPE "role" AS ENUM ('retailer', 'desk', 'salesman');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CREDIT_HOLD', 'CONFIRMED', 'REJECTED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "order_source" AS ENUM ('app', 'ai_text', 'repeat');

-- CreateEnum
CREATE TYPE "scheme_kind" AS ENUM ('FREE_GOODS', 'SLAB_DISCOUNT', 'NONE');

-- CreateEnum
CREATE TYPE "capture_unit" AS ENUM ('case', 'piece', 'unknown');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role" "role" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "retailer_id" TEXT,
    "preferred_lang" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailers" (
    "id" TEXT NOT NULL,
    "shop_name" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Jabalpur',
    "credit_limit_paise" INTEGER NOT NULL,
    "outstanding_paise" INTEGER NOT NULL DEFAULT 0,
    "salesman_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retailers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skus" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "pieces_per_case" INTEGER NOT NULL,
    "dealer_price_per_piece_paise" INTEGER NOT NULL,
    "gst_rate_bp" INTEGER NOT NULL DEFAULT 1800,
    "stock_cases" INTEGER NOT NULL,
    "image_key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku_keywords" (
    "id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "keyword_normalised" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'hi',

    CONSTRAINT "sku_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schemes" (
    "id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "kind" "scheme_kind" NOT NULL,
    "config_json" JSONB NOT NULL,
    "active_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_to" TIMESTAMP(3),
    "label_en" TEXT NOT NULL,
    "label_hi" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailer_prices" (
    "id" TEXT NOT NULL,
    "retailer_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "price_per_piece_paise" INTEGER NOT NULL,

    CONSTRAINT "retailer_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "retailer_id" TEXT NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "source" "order_source" NOT NULL DEFAULT 'app',
    "idempotency_key" TEXT NOT NULL,
    "subtotal_paise" INTEGER NOT NULL,
    "discount_paise" INTEGER NOT NULL DEFAULT 0,
    "gst_paise" INTEGER NOT NULL,
    "total_paise" INTEGER NOT NULL,
    "hold_reason" TEXT,
    "reject_reason" TEXT,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" TEXT,
    "exported_at" TIMESTAMP(3),
    "export_batch_id" TEXT,
    "capture_id" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "ordered_qty" INTEGER NOT NULL,
    "free_qty" INTEGER NOT NULL DEFAULT 0,
    "case_price_paise_snapshot" INTEGER NOT NULL,
    "gross_paise" INTEGER NOT NULL,
    "discount_paise" INTEGER NOT NULL DEFAULT 0,
    "gst_paise" INTEGER NOT NULL,
    "net_paise" INTEGER NOT NULL,
    "scheme_snapshot_json" JSONB NOT NULL,
    "original_text" TEXT,
    "ai_confidence" TEXT,
    "edited_by_desk" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "type" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailer_aliases" (
    "id" TEXT NOT NULL,
    "retailer_id" TEXT NOT NULL,
    "phrase_normalised" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "times_confirmed" INTEGER NOT NULL DEFAULT 1,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retailer_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capture_logs" (
    "id" TEXT NOT NULL,
    "retailer_id" TEXT NOT NULL,
    "input_text" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "latency_ms" INTEGER NOT NULL,
    "fallback_reason" TEXT,
    "draft_json" JSONB NOT NULL,
    "final_json" JSONB,
    "accepted_unchanged_lines" INTEGER,
    "total_lines" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capture_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_batches" (
    "id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "format" TEXT NOT NULL,
    "order_count" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "total_paise" BIGINT NOT NULL,

    CONSTRAINT "export_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_counters" (
    "date" TEXT NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_counters_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "retailers_phone_key" ON "retailers"("phone");

-- CreateIndex
CREATE INDEX "otp_challenges_phone_expires_at_idx" ON "otp_challenges"("phone", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "skus_code_key" ON "skus"("code");

-- CreateIndex
CREATE INDEX "sku_keywords_keyword_normalised_idx" ON "sku_keywords"("keyword_normalised");

-- CreateIndex
CREATE INDEX "schemes_sku_id_active_from_idx" ON "schemes"("sku_id", "active_from");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_prices_retailer_id_sku_id_key" ON "retailer_prices"("retailer_id", "sku_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_retailer_id_status_idx" ON "orders"("retailer_id", "status");

-- CreateIndex
CREATE INDEX "orders_placed_at_idx" ON "orders"("placed_at");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_lines_order_id_idx" ON "order_lines"("order_id");

-- CreateIndex
CREATE INDEX "order_events_order_id_at_idx" ON "order_events"("order_id", "at");

-- CreateIndex
CREATE INDEX "retailer_aliases_retailer_id_idx" ON "retailer_aliases"("retailer_id");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_aliases_retailer_id_phrase_normalised_key" ON "retailer_aliases"("retailer_id", "phrase_normalised");

-- CreateIndex
CREATE INDEX "capture_logs_retailer_id_created_at_idx" ON "capture_logs"("retailer_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailers" ADD CONSTRAINT "retailers_salesman_user_id_fkey" FOREIGN KEY ("salesman_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku_keywords" ADD CONSTRAINT "sku_keywords_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schemes" ADD CONSTRAINT "schemes_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_prices" ADD CONSTRAINT "retailer_prices_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_prices" ADD CONSTRAINT "retailer_prices_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_export_batch_id_fkey" FOREIGN KEY ("export_batch_id") REFERENCES "export_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_capture_id_fkey" FOREIGN KEY ("capture_id") REFERENCES "capture_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_aliases" ADD CONSTRAINT "retailer_aliases_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_aliases" ADD CONSTRAINT "retailer_aliases_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capture_logs" ADD CONSTRAINT "capture_logs_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_batches" ADD CONSTRAINT "export_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

