<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tbl_conversations')) {
            Schema::create('tbl_conversations', function (Blueprint $table) {
                $table->id('conversation_id');
                $table->foreignId('user_low_id')
                    ->constrained('tbl_users', 'user_id')
                    ->cascadeOnDelete();
                $table->foreignId('user_high_id')
                    ->constrained('tbl_users', 'user_id')
                    ->cascadeOnDelete();
                $table->timestamp('last_message_at')->nullable();
                $table->timestamps();
                $table->unique(['user_low_id', 'user_high_id'], 'conversations_pair_unique');
            });
        }

        if (!Schema::hasTable('tbl_messages')) {
            Schema::create('tbl_messages', function (Blueprint $table) {
                $table->id('message_id');
                $table->foreignId('conversation_id')
                    ->constrained('tbl_conversations', 'conversation_id')
                    ->cascadeOnDelete();
                $table->foreignId('sender_user_id')
                    ->constrained('tbl_users', 'user_id')
                    ->cascadeOnDelete();
                $table->text('body');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
                $table->index(['conversation_id', 'message_id'], 'messages_conversation_index');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_messages');
        Schema::dropIfExists('tbl_conversations');
    }
};
