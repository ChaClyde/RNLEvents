<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_offices', function (Blueprint $table) {
            $table->id('office_id');

            // Office identification
            $table->string('office_code', 50)->unique();
            $table->string('office_name', 150);

            // Office classification
            $table->string('office_type', 100)->nullable();

            // Office information
            $table->text('description')->nullable();
            $table->string('contact_email', 150)->nullable();
            $table->string('contact_number', 30)->nullable();
            $table->string('location', 255)->nullable();

            // Office status
            $table->enum('status', ['active', 'inactive'])
                ->default('active');

            $table->timestamps();

            // Soft deletion
            $table->boolean('is_deleted')->default(false);

            // Indexes
            $table->index('office_name');
            $table->index('status');
            $table->index('is_deleted');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_offices');
    }
};
