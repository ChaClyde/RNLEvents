<?php

namespace Tests\Support;

use App\Models\User;
use Illuminate\Http\UploadedFile;

trait ProvidesUserSignature
{
    protected function giveSignature(User $user, ?UploadedFile $file = null): void
    {
        $upload = $file ?? UploadedFile::fake()->image('signature.png', 40, 20);

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        $this->actingAs($user, 'web')
            ->post('/api/account/signature', ['signature' => $upload])
            ->assertOk();

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
    }
}
