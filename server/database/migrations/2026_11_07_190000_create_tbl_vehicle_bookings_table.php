<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tbl_vehicle_bookings')) {
            $this->createTable();

            return;
        }

        $this->ensureExistingTable();
    }

    public function down(): void
    {
        // Do not drop tbl_vehicle_bookings. The table may have existed
        // (with live records) before this migration was recorded.
    }

    private function createTable(): void
    {
        Schema::create('tbl_vehicle_bookings', function (Blueprint $table) {
            $table->id('vehicle_booking_id');

            $table->foreignId('requested_by_user_id')
                ->constrained('tbl_users', 'user_id')
                ->restrictOnDelete();

            $table->foreignId('office_id')
                ->constrained('tbl_offices', 'office_id')
                ->restrictOnDelete();

            $table->string('requested_by', 150);
            $table->string('email', 150);
            $table->string('tel_number', 30);

            $table->string('destination', 255);
            $table->string('purpose', 200);
            $table->text('remarks')->nullable();

            $table->date('travel_date');
            $table->time('departure_time');
            $table->date('expected_return_date');
            $table->time('expected_return_time');

            $table->unsignedSmallInteger('passenger_count');
            $table->text('passenger_details')->nullable();

            $table->foreignId('vehicle_id')
                ->nullable()
                ->constrained('tbl_vehicles', 'vehicle_id')
                ->nullOnDelete();

            $table->foreignId('driver_id')
                ->nullable()
                ->constrained('tbl_drivers', 'driver_id')
                ->nullOnDelete();

            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
                'cancelled',
            ])->default('pending');

            $table->string('approval_stage', 100)->default('office_head');
            $table->text('approval_remarks')->nullable();
            $table->text('cancellation_reason')->nullable();

            $table->boolean('is_deleted')->default(false);

            $table->timestamps();

            $table->index(['status', 'approval_stage', 'is_deleted']);
            $table->index(['office_id', 'status']);
            $table->index(['requested_by_user_id', 'status']);
            $table->index(
                ['vehicle_id', 'travel_date', 'expected_return_date'],
                'vehicle_bookings_vehicle_schedule_idx'
            );
            $table->index(
                ['driver_id', 'travel_date', 'expected_return_date'],
                'vehicle_bookings_driver_schedule_idx'
            );
        });
    }

    private function ensureExistingTable(): void
    {
        Schema::table('tbl_vehicle_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_vehicle_bookings', 'remarks')) {
                $table->text('remarks')->nullable();
            }
            if (!Schema::hasColumn('tbl_vehicle_bookings', 'passenger_details')) {
                $table->text('passenger_details')->nullable();
            }
            if (!Schema::hasColumn('tbl_vehicle_bookings', 'approval_remarks')) {
                $table->text('approval_remarks')->nullable();
            }
            if (!Schema::hasColumn('tbl_vehicle_bookings', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable();
            }
        });

        Schema::table('tbl_vehicle_bookings', function (Blueprint $table) {
            if (!$this->hasIndexNamedOrColumns(
                'tbl_vehicle_bookings',
                'tbl_vehicle_bookings_status_approval_stage_is_deleted_index',
                ['status', 'approval_stage', 'is_deleted'],
            )) {
                $table->index(['status', 'approval_stage', 'is_deleted']);
            }

            if (!$this->hasIndexNamedOrColumns(
                'tbl_vehicle_bookings',
                'tbl_vehicle_bookings_office_id_status_index',
                ['office_id', 'status'],
            )) {
                $table->index(['office_id', 'status']);
            }

            if (!$this->hasIndexNamedOrColumns(
                'tbl_vehicle_bookings',
                'tbl_vehicle_bookings_requested_by_user_id_status_index',
                ['requested_by_user_id', 'status'],
            )) {
                $table->index(['requested_by_user_id', 'status']);
            }

            if (!$this->hasIndexNamedOrColumns(
                'tbl_vehicle_bookings',
                'vehicle_bookings_vehicle_schedule_idx',
                ['vehicle_id', 'travel_date', 'expected_return_date'],
            )) {
                $table->index(
                    ['vehicle_id', 'travel_date', 'expected_return_date'],
                    'vehicle_bookings_vehicle_schedule_idx'
                );
            }

            if (!$this->hasIndexNamedOrColumns(
                'tbl_vehicle_bookings',
                'vehicle_bookings_driver_schedule_idx',
                ['driver_id', 'travel_date', 'expected_return_date'],
            )) {
                $table->index(
                    ['driver_id', 'travel_date', 'expected_return_date'],
                    'vehicle_bookings_driver_schedule_idx'
                );
            }
        });

        Schema::table('tbl_vehicle_bookings', function (Blueprint $table) {
            if (!$this->hasForeignKeyOn('tbl_vehicle_bookings', ['requested_by_user_id'])) {
                $table->foreign('requested_by_user_id')
                    ->references('user_id')
                    ->on('tbl_users')
                    ->restrictOnDelete();
            }

            if (!$this->hasForeignKeyOn('tbl_vehicle_bookings', ['office_id'])) {
                $table->foreign('office_id')
                    ->references('office_id')
                    ->on('tbl_offices')
                    ->restrictOnDelete();
            }

            if (!$this->hasForeignKeyOn('tbl_vehicle_bookings', ['vehicle_id'])) {
                $table->foreign('vehicle_id')
                    ->references('vehicle_id')
                    ->on('tbl_vehicles')
                    ->nullOnDelete();
            }

            if (!$this->hasForeignKeyOn('tbl_vehicle_bookings', ['driver_id'])) {
                $table->foreign('driver_id')
                    ->references('driver_id')
                    ->on('tbl_drivers')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * @param  list<string>  $columns
     */
    private function hasIndexNamedOrColumns(string $table, string $name, array $columns): bool
    {
        foreach (Schema::getIndexes($table) as $index) {
            $indexName = $index['name'] ?? '';
            $indexColumns = $index['columns'] ?? [];

            if ($indexName === $name || $indexColumns === $columns) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<string>  $columns
     */
    private function hasForeignKeyOn(string $table, array $columns): bool
    {
        foreach (Schema::getForeignKeys($table) as $foreignKey) {
            if (($foreignKey['columns'] ?? []) === $columns) {
                return true;
            }
        }

        return false;
    }
};
