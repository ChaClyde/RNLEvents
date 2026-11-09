<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_users', function (Blueprint $table) {
            $table->id('user_id');

            // Profile
            $table->string('profile_photo', 255)->nullable();

            // Personal Information
            $table->string('first_name', 55);
            $table->string('middle_name', 55)->nullable();
            $table->string('last_name', 55);
            $table->string('suffix_name', 10)->nullable();

            // Account Credentials
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('username')->unique();
            $table->string('password');

            // Additional Information
            $table->string('position', 100)->nullable();
            $table->string('contact_number', 30)->nullable();

            // Role and Office Assignment
            $table->unsignedBigInteger('office_id');
            $table->unsignedBigInteger('role_id');

            // Account Status
            $table->enum('account_status', ['Active', 'Inactive'])
                ->default('Active');

            $table->boolean('must_change_password')
                ->default(false);

            // Login and Activity Tracking
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('last_activity_at')->nullable();

            // Soft Delete
            $table->boolean('is_deleted')->default(false);

            // Remember Token
            $table->rememberToken();

            // Timestamps
            $table->timestamps();

            // Foreign Keys
            $table->foreign('office_id')
                ->references('office_id')
                ->on('tbl_offices')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->foreign('role_id')
                ->references('role_id')
                ->on('tbl_roles')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // Indexes
            $table->index('is_deleted');
            $table->index('account_status');
            $table->index('office_id');
            $table->index('role_id');
            $table->index('last_activity_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_users');
    }
};