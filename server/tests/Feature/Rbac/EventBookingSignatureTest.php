<?php

namespace Tests\Feature\Rbac;

use App\EventBookings\EventBookingSlip;
use App\Models\EventBooking;
use App\Models\EventBookingApproval;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Permissions\ApprovalStage;
use App\Signatures\SignatureStorage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\Support\ProvidesUserSignature;
use Tests\TestCase;

class EventBookingSignatureTest extends TestCase
{
    use ProvidesUserSignature;
    use RefreshDatabase;

    private static bool $failureListener = false;

    private static bool $failNextCreate = false;

    private Office $officeA;

    private Office $officeB;

    private Venue $venue;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RoleSeeder::class);
        Storage::fake(SignatureStorage::USER_DISK);
        Storage::fake(SignatureStorage::APPROVAL_DISK);

        $this->officeA = Office::create([
            'office_code' => 'SIG-A',
            'office_name' => 'Signature Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->officeB = Office::create([
            'office_code' => 'SIG-B',
            'office_name' => 'Signature Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->venue = Venue::create([
            'venue' => 'Signature Hall',
            'capacity' => 30,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        foreach ([Role::FACULTY_STAFF, Role::DEAN_OFFICE_HEAD, Role::EVENT_ADMIN, Role::VEHICLE_ADMIN] as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }
        $this->users['faculty-b'] = $this->userFor(Role::FACULTY_STAFF, $this->officeB, 'faculty-b');

        if (!self::$failureListener) {
            self::$failureListener = true;
            EventBookingApproval::created(function () {
                if (!self::$failNextCreate) {
                    return;
                }
                self::$failNextCreate = false;
                throw new RuntimeException('forced failure');
            });
        }
    }

    public function test_user_can_save_upload_replace_and_remove_only_their_own_signature(): void
    {
        $owner = $this->users[Role::FACULTY_STAFF];
        $other = $this->users['faculty-b'];
        $drawn = UploadedFile::fake()->image('drawn.png', 80, 30);
        $uploaded = UploadedFile::fake()->image('uploaded.jpg', 90, 30);
        $replacement = UploadedFile::fake()->image('replacement.png', 70, 30);

        $this->actingAs($owner, 'web')
            ->post('/api/account/signature', [
                'signature' => $drawn,
                'user_id' => $other->user_id,
            ])
            ->assertOk()
            ->assertJsonPath('data.has_signature', true);

        $ownerPath = $owner->fresh()->signature_path;
        $this->assertNotEmpty($ownerPath);
        $this->assertNull($other->fresh()->signature_path);

        $this->actingAs($owner, 'web')
            ->get('/api/account/signature/image')
            ->assertOk()
            ->assertHeader('content-type', 'image/png');

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $this->actingAs($other, 'web')
            ->get('/api/account/signature/image')
            ->assertNotFound();

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $this->actingAs($owner, 'web')
            ->post('/api/account/signature', ['signature' => $uploaded])
            ->assertOk()
            ->assertJsonPath('data.mime_type', 'image/jpeg');

        $this->assertNotSame($ownerPath, $owner->fresh()->signature_path);
        Storage::disk(SignatureStorage::USER_DISK)->assertMissing($ownerPath);

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $this->actingAs($other, 'web')
            ->delete('/api/account/signature')
            ->assertOk();

        $this->assertNotNull($owner->fresh()->signature_path);

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $this->actingAs($owner, 'web')
            ->post('/api/account/signature', ['signature' => $replacement])
            ->assertOk();
        $this->actingAs($owner, 'web')
            ->delete('/api/account/signature')
            ->assertOk()
            ->assertJsonPath('data.has_signature', false);
        $this->assertNull($owner->fresh()->signature_path);
    }

    public function test_invalid_and_oversized_signatures_are_rejected(): void
    {
        $owner = $this->users[Role::FACULTY_STAFF];

        $this->actingAs($owner, 'web')
            ->postJson('/api/account/signature', [
                'signature' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain'),
            ])
            ->assertUnprocessable();

        $this->actingAs($owner, 'web')
            ->postJson('/api/account/signature', [
                'signature' => UploadedFile::fake()->image('huge.png')->size(2048),
            ])
            ->assertUnprocessable();

        $this->assertNull($owner->fresh()->signature_path);
    }

    public function test_approval_requires_a_signature_and_rejection_does_not_snapshot_one(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/'.$booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('signature');

        $this->assertSame('pending', $booking->fresh()->status);
        $this->assertSame(0, EventBookingApproval::count());

        $this->giveSignature($this->users[Role::DEAN_OFFICE_HEAD]);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/'.$booking->event_booking_id, [
                'status' => 'rejected',
                'approval_remarks' => 'Revise the request',
            ])
            ->assertOk();

        $decision = EventBookingApproval::firstOrFail();
        $this->assertSame(EventBookingApproval::ACTION_REJECTED, $decision->action);
        $this->assertNull($decision->signature_path);
        $this->assertFalse($decision->has_signature);
        Storage::disk(SignatureStorage::APPROVAL_DISK)->assertDirectoryEmpty('approvals');
    }

    public function test_snapshot_stays_immutable_and_the_slip_uses_that_historical_signature(): void
    {
        $dean = $this->users[Role::DEAN_OFFICE_HEAD];
        $dean->forceFill(['position' => 'Dean of College'])->save();
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $original = UploadedFile::fake()->image('original.png', 50, 20);
        $this->giveSignature($dean, $original);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/'.$booking->event_booking_id, [
                'status' => 'approved',
                'approval_remarks' => 'Endorsed',
            ])
            ->assertOk()
            ->assertJsonMissingPath('data.approvals.0.signature_path');

        $decision = EventBookingApproval::firstOrFail();
        $snapshot = Storage::disk(SignatureStorage::APPROVAL_DISK)->get($decision->signature_path);
        $this->assertNotSame('', $snapshot);

        $this->giveSignature($dean, UploadedFile::fake()->image('new.png', 60, 24));

        $decision->refresh();
        $this->assertSame(
            $snapshot,
            Storage::disk(SignatureStorage::APPROVAL_DISK)->get($decision->signature_path),
        );
        $this->assertNotSame(
            $snapshot,
            Storage::disk(SignatureStorage::USER_DISK)->get($dean->fresh()->signature_path),
        );

        $html = view('event-bookings.slip', [
            'slip' => EventBookingSlip::data($booking->fresh()),
        ])->render();

        $this->assertStringContainsString(base64_encode($snapshot), $html);
        $this->assertStringContainsString('Dean of College', $html);
        $this->assertStringContainsString('Endorsed', $html);
        $this->assertStringContainsString('Office Head', $html);
        $this->assertStringNotContainsString(
            base64_encode(Storage::disk(SignatureStorage::USER_DISK)->get($dean->fresh()->signature_path)),
            $html,
        );

        $this->asRole(Role::FACULTY_STAFF)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/approvals/'.$decision->event_booking_approval_id.'/signature')
            ->assertOk()
            ->assertHeader('content-type', 'image/png');

        $this->asRole('faculty-b')
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/approvals/'.$decision->event_booking_approval_id.'/signature')
            ->assertForbidden();

        $this->asRole(Role::VEHICLE_ADMIN)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/approvals/'.$decision->event_booking_approval_id.'/signature')
            ->assertForbidden();
    }

    public function test_historical_approval_without_a_signature_stays_valid(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $decision = EventBookingApproval::create([
            'event_booking_id' => $booking->event_booking_id,
            'approver_user_id' => $this->users[Role::DEAN_OFFICE_HEAD]->user_id,
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'action' => EventBookingApproval::ACTION_APPROVED,
            'remarks' => 'Recorded before e-signatures',
        ]);

        $html = view('event-bookings.slip', [
            'slip' => EventBookingSlip::data($booking->fresh()),
        ])->render();

        $this->assertStringContainsString('No signature was recorded for this approval.', $html);
        $this->assertStringContainsString('Recorded before e-signatures', $html);
        $this->assertSame('pending', $booking->fresh()->status);

        $this->asRole(Role::FACULTY_STAFF)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/approvals/'.$decision->event_booking_approval_id.'/signature')
            ->assertNotFound();
    }

    public function test_failed_approval_transaction_removes_the_snapshot_file(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $this->giveSignature($this->users[Role::DEAN_OFFICE_HEAD]);
        self::$failNextCreate = true;
        EventBookingApproval::created(function () {
            if (!self::$failNextCreate) {
                return;
            }
            self::$failNextCreate = false;
            throw new RuntimeException('forced failure');
        });

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/'.$booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertStatus(500);

        $this->assertSame(0, EventBookingApproval::count());
        $this->assertSame('pending', $booking->fresh()->status);
        Storage::disk(SignatureStorage::APPROVAL_DISK)->assertDirectoryEmpty('approvals');
    }

    private function makeBooking(User $owner): EventBooking
    {
        return EventBooking::create([
            'venue_id' => $this->venue->venue_id,
            'purpose' => 'Signed assembly',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '10:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 12,
            'requested_by' => $owner->full_name,
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ]);
    }

    public function test_faculty_booking_copies_the_profile_signature_onto_the_slip(): void
    {
        $this->giveSignature($this->users[Role::FACULTY_STAFF]);

        $created = $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/storeEventBooking', [
                'venue_id' => $this->venue->venue_id,
                'purpose' => 'Signed faculty booking',
                'schedule_type' => 'range',
                'date_start' => now()->addDays(2)->toDateString(),
                'date_end' => now()->addDays(2)->toDateString(),
                'time_start' => '09:00',
                'time_end' => '10:00',
                'expected_attendees' => 8,
                'requested_by' => 'Faculty User',
                'office_id' => $this->officeA->office_id,
                'email' => $this->users[Role::FACULTY_STAFF]->email,
                'tel_number' => '1234567',
            ])
            ->assertCreated()
            ->assertJsonPath('data.has_requester_signature', true)
            ->assertJsonMissingPath('data.requester_signature_path');

        $booking = EventBooking::findOrFail($created->json('data.event_booking_id'));
        $html = view('event-bookings.slip', [
            'slip' => EventBookingSlip::data($booking),
        ])->render();

        $this->assertStringContainsString('Requester e-signature', $html);
        $this->assertStringContainsString('data:image/png;base64,', $html);

        $this->asRole(Role::FACULTY_STAFF)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/requester-signature')
            ->assertOk();
    }

    private function asRole(string $slug)
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        return $this->actingAs($this->users[$slug], 'web');
    }

    private function userFor(string $slug, ?Office $office = null, ?string $key = null): User
    {
        $role = Role::where('slug', $slug)->firstOrFail();
        $office ??= $this->officeA;
        $suffix = $key ?? $slug.'-'.uniqid();

        return User::create([
            'first_name' => 'Sign',
            'last_name' => $slug,
            'email' => $suffix.'@example.com',
            'username' => $suffix,
            'password' => Hash::make('password'),
            'office_id' => $office->office_id,
            'role_id' => $role->role_id,
            'account_status' => 'Active',
            'is_deleted' => false,
        ])->load('role');
    }
}
