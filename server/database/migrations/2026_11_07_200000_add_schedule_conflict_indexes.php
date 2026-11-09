<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (
            Schema::hasTable('tbl_event_bookings')
            && !$this->hasIndexNamedOrColumns(
                'tbl_event_bookings',
                'event_bookings_venue_status_idx',
                ['venue_id', 'status', 'is_deleted'],
            )
        ) {
            Schema::table('tbl_event_bookings', function (Blueprint $table) {
                $table->index(
                    ['venue_id', 'status', 'is_deleted'],
                    'event_bookings_venue_status_idx'
                );
            });
        }

        if (!Schema::hasTable('tbl_vehicle_bookings')) {
            return;
        }

        Schema::table('tbl_vehicle_bookings', function (Blueprint $table) {
            if (!$this->hasIndexNamedOrColumns(
                'tbl_vehicle_bookings',
                'vehicle_bookings_status_vehicle_idx',
                ['status', 'is_deleted', 'vehicle_id'],
            )) {
                $table->index(
                    ['status', 'is_deleted', 'vehicle_id'],
                    'vehicle_bookings_status_vehicle_idx'
                );
            }

            if (!$this->hasIndexNamedOrColumns(
                'tbl_vehicle_bookings',
                'vehicle_bookings_status_driver_idx',
                ['status', 'is_deleted', 'driver_id'],
            )) {
                $table->index(
                    ['status', 'is_deleted', 'driver_id'],
                    'vehicle_bookings_status_driver_idx'
                );
            }
        });
    }

    public function down(): void
    {
        if (
            Schema::hasTable('tbl_event_bookings')
            && $this->hasIndexNamedOrColumns(
                'tbl_event_bookings',
                'event_bookings_venue_status_idx',
                ['venue_id', 'status', 'is_deleted'],
            )
        ) {
            Schema::table('tbl_event_bookings', function (Blueprint $table) {
                $table->dropIndex('event_bookings_venue_status_idx');
            });
        }

        if (!Schema::hasTable('tbl_vehicle_bookings')) {
            return;
        }

        Schema::table('tbl_vehicle_bookings', function (Blueprint $table) {
            if ($this->hasIndexNamedOrColumns(
                'tbl_vehicle_bookings',
                'vehicle_bookings_status_vehicle_idx',
                ['status', 'is_deleted', 'vehicle_id'],
            )) {
                $table->dropIndex('vehicle_bookings_status_vehicle_idx');
            }

            if ($this->hasIndexNamedOrColumns(
                'tbl_vehicle_bookings',
                'vehicle_bookings_status_driver_idx',
                ['status', 'is_deleted', 'driver_id'],
            )) {
                $table->dropIndex('vehicle_bookings_status_driver_idx');
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
};
