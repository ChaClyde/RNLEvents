<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $table = 'tbl_messages';

    protected $primaryKey = 'message_id';

    protected $fillable = [
        'conversation_id',
        'sender_user_id',
        'body',
        'read_at',
    ];

    protected $casts = [
        'conversation_id' => 'integer',
        'sender_user_id' => 'integer',
        'read_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'conversation_id', 'conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id', 'user_id');
    }
}
