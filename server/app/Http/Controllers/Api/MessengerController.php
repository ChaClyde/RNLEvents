<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MessengerController extends Controller
{
    public function users(Request $request)
    {
        $actor = $request->user();
        $search = trim((string) $request->query('search', ''));

        $query = User::query()
            ->with(['office:office_id,office_name', 'role:role_id,name'])
            ->where('is_deleted', false)
            ->where('account_status', 'Active')
            ->where('user_id', '!=', $actor->user_id)
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($search !== '') {
            $terms = preg_split('/\s+/', $search) ?: [];
            foreach ($terms as $term) {
                $like = '%'.$this->escapeLike($term).'%';
                $query->where(function ($inner) use ($like) {
                    $inner->where('first_name', 'like', $like)
                        ->orWhere('middle_name', 'like', $like)
                        ->orWhere('last_name', 'like', $like)
                        ->orWhere('suffix_name', 'like', $like)
                        ->orWhere('username', 'like', $like)
                        ->orWhereHas('office', function ($office) use ($like) {
                            $office->where('office_name', 'like', $like);
                        })
                        ->orWhereHas('role', function ($role) use ($like) {
                            $role->where('name', 'like', $like);
                        });
                });
            }
        }

        return response()->json([
            'message' => 'Messenger directory loaded.',
            'data' => $query->limit(20)->get()->map(fn (User $user) => $this->person($user))->values(),
        ]);
    }

    public function conversations(Request $request)
    {
        $actorId = (int) $request->user()->user_id;

        $conversations = Conversation::query()
            ->with(['lowUser.office', 'lowUser.role', 'highUser.office', 'highUser.role'])
            ->where(function ($query) use ($actorId) {
                $query->where('user_low_id', $actorId)
                    ->orWhere('user_high_id', $actorId);
            })
            ->orderByDesc('last_message_at')
            ->orderByDesc('conversation_id')
            ->get();

        if ($conversations->isEmpty()) {
            return response()->json([
                'message' => 'Conversations loaded.',
                'data' => [],
            ]);
        }

        $unread = Message::query()
            ->selectRaw('conversation_id, COUNT(*) as unread_count')
            ->whereIn('conversation_id', $conversations->pluck('conversation_id'))
            ->where('sender_user_id', '!=', $actorId)
            ->whereNull('read_at')
            ->groupBy('conversation_id')
            ->pluck('unread_count', 'conversation_id');

        $latest = Message::query()
            ->whereIn('message_id', function ($query) use ($conversations) {
                $query->selectRaw('MAX(message_id)')
                    ->from('tbl_messages')
                    ->whereIn('conversation_id', $conversations->pluck('conversation_id'))
                    ->groupBy('conversation_id');
            })
            ->get()
            ->keyBy('conversation_id');

        return response()->json([
            'message' => 'Conversations loaded.',
            'data' => $conversations->map(function (Conversation $conversation) use ($actorId, $unread, $latest) {
                $other = $conversation->user_low_id === $actorId
                    ? $conversation->highUser
                    : $conversation->lowUser;
                $last = $latest->get($conversation->conversation_id);

                return [
                    'conversation_id' => $conversation->conversation_id,
                    'person' => $other ? $this->person($other) : null,
                    'last_message' => $last?->body,
                    'last_message_at' => $this->stamp($conversation->last_message_at),
                    'unread_count' => (int) ($unread[$conversation->conversation_id] ?? 0),
                ];
            })->values(),
        ]);
    }

    public function open(Request $request)
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer'],
        ]);

        $actor = $request->user();
        $other = $this->activeUser((int) $validated['user_id']);

        if ((int) $other->user_id === (int) $actor->user_id) {
            throw ValidationException::withMessages([
                'user_id' => ['Choose another person to message.'],
            ]);
        }

        $low = min((int) $actor->user_id, (int) $other->user_id);
        $high = max((int) $actor->user_id, (int) $other->user_id);

        $conversation = Conversation::query()->firstOrCreate(
            ['user_low_id' => $low, 'user_high_id' => $high]
        );

        return response()->json([
            'message' => 'Conversation ready.',
            'data' => [
                'conversation_id' => $conversation->conversation_id,
                'person' => $this->person($other),
            ],
        ]);
    }

    public function messages(Request $request, int $conversation)
    {
        $conversation = $this->conversationFor($request->user(), $conversation);
        $actorId = (int) $request->user()->user_id;

        Message::query()
            ->where('conversation_id', $conversation->conversation_id)
            ->where('sender_user_id', '!=', $actorId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $messages = $conversation->messages()
            ->orderByDesc('message_id')
            ->limit(100)
            ->get()
            ->sortBy('message_id')
            ->values();

        $other = User::query()->with(['office', 'role'])->find($conversation->otherUserId($actorId));

        return response()->json([
            'message' => 'Messages loaded.',
            'data' => [
                'conversation_id' => $conversation->conversation_id,
                'person' => $other ? $this->person($other) : null,
                'messages' => $messages->map(fn (Message $message) => [
                    'message_id' => $message->message_id,
                    'sender_user_id' => $message->sender_user_id,
                    'body' => $message->body,
                    'mine' => $message->sender_user_id === $actorId,
                    'read_at' => $this->stamp($message->read_at),
                    'created_at' => $this->stamp($message->created_at),
                ])->all(),
            ],
        ]);
    }

    public function send(Request $request, int $conversation)
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $body = trim($validated['body']);
        if ($body === '') {
            throw ValidationException::withMessages([
                'body' => ['Write a message before sending.'],
            ]);
        }

        $thread = $this->conversationFor($request->user(), $conversation);

        $message = DB::transaction(function () use ($thread, $request, $body) {
            $message = Message::query()->create([
                'conversation_id' => $thread->conversation_id,
                'sender_user_id' => $request->user()->user_id,
                'body' => $body,
            ]);
            $thread->update(['last_message_at' => $message->created_at]);

            return $message;
        });

        return response()->json([
            'message' => 'Message sent.',
            'data' => [
                'message_id' => $message->message_id,
                'sender_user_id' => $message->sender_user_id,
                'body' => $message->body,
                'mine' => true,
                'read_at' => null,
                'created_at' => $this->stamp($message->created_at),
            ],
        ], 201);
    }

    private function conversationFor(User $actor, int $conversationId): Conversation
    {
        $conversation = Conversation::query()->find($conversationId);

        if (!$conversation || !$conversation->includes((int) $actor->user_id)) {
            abort(404, 'Conversation not found.');
        }

        return $conversation;
    }

    private function activeUser(int $userId): User
    {
        $user = User::query()
            ->with(['office', 'role'])
            ->where('is_deleted', false)
            ->where('account_status', 'Active')
            ->find($userId);

        if (!$user) {
            throw ValidationException::withMessages([
                'user_id' => ['That person cannot receive messages.'],
            ]);
        }

        return $user;
    }

    private function person(User $user): array
    {
        return [
            'user_id' => $user->user_id,
            'full_name' => $user->full_name,
            'position' => $user->position,
            'office' => $user->office?->office_name,
            'role' => $user->role?->name,
        ];
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    private function stamp(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i');
        }

        return $value !== null ? (string) $value : null;
    }
}
