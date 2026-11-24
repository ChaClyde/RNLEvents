<?php

namespace Tests\Feature\Rbac;

use App\Models\EventBooking;
use App\Models\EventBookingAttachment;
use App\Models\Office;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Permissions\ApprovalStage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use App\Signatures\SignatureStorage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\Support\ProvidesUserSignature;
use Tests\TestCase;

class EventBookingAttachmentTest extends TestCase
{
    use ProvidesUserSignature;
    use RefreshDatabase;

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
        Storage::fake('event_booking_attachments');
        Storage::fake(SignatureStorage::USER_DISK);
        Storage::fake(SignatureStorage::APPROVAL_DISK);

        $this->officeA = Office::create([
            'office_code' => 'AT-A',
            'office_name' => 'Attachment Office A',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->officeB = Office::create([
            'office_code' => 'AT-B',
            'office_name' => 'Attachment Office B',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $this->venue = Venue::create([
            'venue' => 'Attachment Hall',
            'capacity' => 40,
            'location' => 'Campus',
            'status' => 'available',
            'is_deleted' => false,
        ]);

        foreach ([
            Role::FACULTY_STAFF,
            Role::STUDENT_REPUBLIC,
            Role::DEAN_OFFICE_HEAD,
            Role::EVENT_ADMIN,
            Role::ADMIN_APPROVALS,
            Role::SUPER_ADMIN,
            Role::VEHICLE_ADMIN,
        ] as $slug) {
            $this->users[$slug] = $this->userFor($slug);
        }

        $this->users['faculty-b'] = $this->userFor(Role::FACULTY_STAFF, $this->officeB, 'faculty-b');
        $this->users['dean-b'] = $this->userFor(Role::DEAN_OFFICE_HEAD, $this->officeB, 'dean-b');
    }

    public function test_faculty_can_upload_preview_and_download_a_letter(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $created = $this->asRole(Role::FACULTY_STAFF)
            ->post('/api/event-bookings/'.$booking->event_booking_id.'/attachments', [
                'file' => UploadedFile::fake()->create('request-letter.pdf', 120, 'application/pdf'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.original_filename', 'request-letter.pdf')
            ->assertJsonMissingPath('data.stored_path');

        $attachmentId = $created->json('data.attachment_id');
        $this->assertSame(1, EventBookingAttachment::count());
        Storage::disk('event_booking_attachments')->assertExists(
            EventBookingAttachment::first()->stored_path
        );

        $preview = $this->asRole(Role::FACULTY_STAFF)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachmentId.'/preview');
        $preview->assertOk();
        $this->assertStringContainsString('application/pdf', (string) $preview->headers->get('content-type'));
        $this->assertStringContainsString('inline', (string) $preview->headers->get('content-disposition'));

        $download = $this->asRole(Role::FACULTY_STAFF)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachmentId.'/download');
        $download->assertOk();
        $this->assertStringContainsString('attachment', (string) $download->headers->get('content-disposition'));
    }

    public function test_student_republic_can_upload_a_letter(): void
    {
        $booking = $this->makeBooking($this->users[Role::STUDENT_REPUBLIC]);

        $this->asRole(Role::STUDENT_REPUBLIC)
            ->post('/api/event-bookings/'.$booking->event_booking_id.'/attachments', [
                'file' => UploadedFile::fake()->create('student-letter.jpg', 80, 'image/jpeg'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.mime_type', 'image/jpeg');
    }

    public function test_invalid_and_oversized_files_are_rejected(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/'.$booking->event_booking_id.'/attachments', [
                'file' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);

        $this->asRole(Role::FACULTY_STAFF)
            ->postJson('/api/event-bookings/'.$booking->event_booking_id.'/attachments', [
                'file' => UploadedFile::fake()->create('huge.pdf', 6000, 'application/pdf'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);

        $this->assertSame(0, EventBookingAttachment::count());
    }

    public function test_other_offices_and_unauthorized_roles_cannot_read_the_letter(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $attachment = $this->storeLetter($booking, Role::FACULTY_STAFF);

        $this->asRole('faculty-b')
            ->getJson('/api/event-bookings/'.$booking->event_booking_id.'/attachments')
            ->assertForbidden();

        $this->asRole('faculty-b')
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id.'/download')
            ->assertForbidden();

        $this->asRole(Role::VEHICLE_ADMIN)
            ->getJson('/api/event-bookings/'.$booking->event_booking_id.'/attachments')
            ->assertForbidden();
    }

    public function test_attachment_remains_available_to_approvers_and_cannot_be_changed_after_review_starts(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $attachment = $this->storeLetter($booking, Role::FACULTY_STAFF);
        $this->giveSignature($this->users[Role::DEAN_OFFICE_HEAD]);

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->putJson('/api/event-bookings/updateStatus/'.$booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertOk();

        $this->assertSame(1, $booking->fresh()->attachments()->count());

        $this->asRole(Role::DEAN_OFFICE_HEAD)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id.'/preview')
            ->assertOk();

        $this->asRole(Role::FACULTY_STAFF)
            ->post('/api/event-bookings/'.$booking->event_booking_id.'/attachments', [
                'file' => UploadedFile::fake()->create('replacement.pdf', 40, 'application/pdf'),
            ])
            ->assertForbidden();

        $this->asRole(Role::FACULTY_STAFF)
            ->deleteJson('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id)
            ->assertForbidden();

        $this->asRole('faculty-b')
            ->deleteJson('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id)
            ->assertNotFound();

        $this->assertNotNull(EventBookingAttachment::find($attachment->attachment_id));
    }

    public function test_each_approval_stage_can_preview_download_and_print_the_original_letter(): void
    {
        $booking = $this->makeBooking($this->users[Role::FACULTY_STAFF]);
        $attachment = $this->storeLetter($booking, Role::FACULTY_STAFF);
        $originalPath = $attachment->stored_path;

        $stages = [
            Role::DEAN_OFFICE_HEAD,
            Role::EVENT_ADMIN,
            Role::ADMIN_APPROVALS,
            Role::SUPER_ADMIN,
        ];

        foreach ($stages as $slug) {
            $this->giveSignature($this->users[$slug]);

            $preview = $this->asRole($slug)
                ->get('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id.'/preview');

            $preview->assertOk();
            $preview->assertHeader('content-type', 'application/pdf');
            $this->assertStringContainsString('inline', (string) $preview->headers->get('content-disposition'));

            $download = $this->asRole($slug)
                ->get('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id.'/download');

            $download->assertOk();
            $this->assertStringContainsString('attachment', (string) $download->headers->get('content-disposition'));
            $this->assertStringContainsString('request-letter.pdf', (string) $download->headers->get('content-disposition'));
            $this->assertStringNotContainsString($originalPath, $download->getContent());

            $this->asRole($slug)
                ->post('/api/event-bookings/'.$booking->event_booking_id.'/attachments', [
                    'file' => UploadedFile::fake()->create('changed.pdf', 20, 'application/pdf'),
                ])
                ->assertForbidden();

            $this->asRole($slug)
                ->deleteJson('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id)
                ->assertForbidden();

            if ($slug !== Role::SUPER_ADMIN) {
                $this->asRole($slug)
                    ->putJson('/api/event-bookings/updateStatus/'.$booking->event_booking_id, [
                        'status' => 'approved',
                    ])
                    ->assertOk();
            }
        }

        $this->asRole(Role::ADMIN_APPROVALS)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id.'/preview')
            ->assertOk();

        $this->asRole(Role::ADMIN_APPROVALS)
            ->putJson('/api/event-bookings/updateStatus/'.$booking->event_booking_id, [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $this->assertSame($originalPath, $attachment->fresh()->stored_path);
        $this->assertSame(1, $booking->fresh()->attachments()->count());

        $this->asRole('dean-b')
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id.'/preview')
            ->assertForbidden();

        $this->asRole('faculty-b')
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id.'/download')
            ->assertForbidden();

        $this->asRole(Role::VEHICLE_ADMIN)
            ->get('/api/event-bookings/'.$booking->event_booking_id.'/attachments/'.$attachment->attachment_id.'/preview')
            ->assertForbidden();
    }

    private function storeLetter(EventBooking $booking, string $slug): EventBookingAttachment
    {
        $this->asRole($slug)
            ->post('/api/event-bookings/'.$booking->event_booking_id.'/attachments', [
                'file' => UploadedFile::fake()->create('request-letter.pdf', 90, 'application/pdf'),
            ])
            ->assertCreated();

        return EventBookingAttachment::where('event_booking_id', $booking->event_booking_id)->firstOrFail();
    }

    private function makeBooking(User $owner): EventBooking
    {
        return EventBooking::create([
            'venue_id' => $this->venue->venue_id,
            'purpose' => 'Attachment booking',
            'date_start' => now()->toDateString(),
            'date_end' => now()->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '10:00:00',
            'number_of_days' => 1,
            'expected_attendees' => 8,
            'requested_by' => $owner->first_name.' '.$owner->last_name,
            'requested_by_user_id' => $owner->user_id,
            'office_id' => $owner->office_id,
            'email' => $owner->email,
            'tel_number' => '1234567',
            'status' => 'pending',
            'approval_stage' => ApprovalStage::OFFICE_HEAD,
            'is_deleted' => false,
        ]);
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
            'first_name' => 'Attach',
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
