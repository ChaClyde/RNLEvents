<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $table = 'tbl_conversations';

    protected $primaryKey = 'conversation_id';

    protected $fillable = [
        'user_low_id',
        'user_high_id',
        'last_message_at',
    ];

    protected $casts = [
        'user_low_id' => 'integer',
        'user_high_id' => 'integer',
        'last_message_at' => 'datetime',
    ];

    public function lowUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_low_id', 'user_id');
    }

    public function highUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_high_id', 'user_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'conversation_id', 'conversation_id');
    }

    public function includes(int $userId): bool
    {
        return $this->user_low_id === $userId || $this->user_high_id === $userId;
    }

    public function otherUserId(int $userId): int
    {
        return $this->user_low_id === $userId ? $this->user_high_id : $this->user_low_id;
    }
}
