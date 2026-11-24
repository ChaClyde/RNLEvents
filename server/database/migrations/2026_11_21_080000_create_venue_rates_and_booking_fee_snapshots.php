<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_event_booking_fee_lines') && !Schema::hasTable('tbl_event_booking_fee_rates')) {
            Schema::dropIfExists('tbl_event_booking_fee_lines');
        }

        if (!Schema::hasTable('tbl_venue_rates')) {
            Schema::create('tbl_venue_rates', function (Blueprint $table) {
                $table->id('venue_rate_id');
                $table->foreignId('venue_id')
                    ->constrained('tbl_venues', 'venue_id')
                    ->cascadeOnDelete();
                $table->string('pricing_basis', 20);
                $table->decimal('hourly_rate', 10, 2)->nullable();
                $table->decimal('daily_rate', 10, 2)->nullable();
                $table->decimal('overtime_rate', 10, 2)->default(0);
                $table->text('overtime_policy')->nullable();
                $table->decimal('included_hours', 8, 2)->nullable();
                $table->date('effective_from');
                $table->date('effective_to')->nullable();
                $table->boolean('is_active')->default(true);
                $table->text('notes')->nullable();
                $table->foreignId('created_by')
                    ->nullable()
                    ->constrained('tbl_users', 'user_id')
                    ->nullOnDelete();
                $table->timestamps();

                $table->index(['venue_id', 'is_active', 'effective_from'], 'venue_rates_lookup');
            });
        }

        if (!Schema::hasTable('tbl_venue_rate_charges')) {
            Schema::create('tbl_venue_rate_charges', function (Blueprint $table) {
                $table->id('venue_rate_charge_id');
                $table->foreignId('venue_rate_id')
                    ->constrained('tbl_venue_rates', 'venue_rate_id')
                    ->cascadeOnDelete();
                $table->foreignId('venue_resource_id')
                    ->nullable()
                    ->constrained('tbl_venue_resources', 'resource_id')
                    ->nullOnDelete();
                $table->string('charge_name', 100);
                $table->string('charge_type', 20);
                $table->decimal('amount', 10, 2);
                $table->string('unit', 20);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('tbl_event_booking_fee_snapshots')) {
            Schema::create('tbl_event_booking_fee_snapshots', function (Blueprint $table) {
                $table->id('event_booking_fee_snapshot_id');
                $table->foreignId('event_booking_id')
                    ->unique()
                    ->constrained('tbl_event_bookings', 'event_booking_id')
                    ->cascadeOnDelete();
                $table->foreignId('venue_rate_id')
                    ->nullable()
                    ->constrained('tbl_venue_rates', 'venue_rate_id')
                    ->restrictOnDelete();
                $table->string('pricing_basis', 20)->nullable();
                $table->decimal('venue_amount', 12, 2)->nullable();
                $table->decimal('overtime_amount', 12, 2)->nullable();
                $table->decimal('additional_amount', 12, 2)->nullable();
                $table->decimal('total_amount', 12, 2)->nullable();
                $table->text('calculation_note')->nullable();
                $table->json('rate_snapshot')->nullable();
                $table->timestamp('calculated_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('tbl_event_booking_fee_lines')) {
            Schema::create('tbl_event_booking_fee_lines', function (Blueprint $table) {
                $table->id('event_booking_fee_line_id');
                $table->unsignedBigInteger('event_booking_fee_snapshot_id');
                $table->foreign('event_booking_fee_snapshot_id', 'fee_lines_snapshot_fk')
                    ->references('event_booking_fee_snapshot_id')
                    ->on('tbl_event_booking_fee_snapshots')
                    ->cascadeOnDelete();
                $table->date('schedule_date')->nullable();
                $table->string('line_type', 20);
                $table->string('label', 150);
                $table->decimal('quantity', 10, 2);
                $table->string('unit', 20);
                $table->decimal('unit_amount', 10, 2);
                $table->decimal('line_amount', 12, 2);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('tbl_event_booking_fee_rates')) {
            Schema::create('tbl_event_booking_fee_rates', function (Blueprint $table) {
                $table->id('event_booking_fee_rate_id');
                $table->unsignedBigInteger('event_booking_fee_snapshot_id');
                $table->foreign('event_booking_fee_snapshot_id', 'fee_rates_snapshot_fk')
                    ->references('event_booking_fee_snapshot_id')
                    ->on('tbl_event_booking_fee_snapshots')
                    ->cascadeOnDelete();
                $table->unsignedBigInteger('venue_rate_id');
                $table->foreign('venue_rate_id', 'fee_rates_rate_fk')
                    ->references('venue_rate_id')
                    ->on('tbl_venue_rates')
                    ->restrictOnDelete();
                $table->timestamps();

                $table->unique(
                    ['event_booking_fee_snapshot_id', 'venue_rate_id'],
                    'booking_fee_rate_unique'
                );
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_event_booking_fee_rates');
        Schema::dropIfExists('tbl_event_booking_fee_lines');
        Schema::dropIfExists('tbl_event_booking_fee_snapshots');
        Schema::dropIfExists('tbl_venue_rate_charges');
        Schema::dropIfExists('tbl_venue_rates');
    }
};
