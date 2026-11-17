<?php

namespace App\Scheduling;

use DateTimeInterface;

final class TimeFormat
{
    /** "13:00:00" -> "13:00" */
    public static function hm(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof DateTimeInterface) {
            return $value->format('H:i');
        }

        return substr((string) $value, 0, 5);
    }

    /** "13:00" or "13:00:00" -> "1:00 PM" */
    public static function label(mixed $value): ?string
    {
        $time = self::hm($value);

        if ($time === null) {
            return null;
        }

        [$hour, $minute] = array_map('intval', explode(':', $time));

        return sprintf(
            '%d:%02d %s',
            $hour % 12 === 0 ? 12 : $hour % 12,
            $minute,
            $hour >= 12 ? 'PM' : 'AM'
        );
    }

    /**
     * Accepts "1:00 PM", "1pm", "1 p.m.", "13:00", "13:00:00".
     * Returns 24h "H:i" for the database, or null if it can't be read.
     */
    public static function toDb(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $text = trim($value);

        if ($text === '') {
            return null;
        }

        // 12-hour with AM/PM
        if (preg_match('/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])\.?\s*m\.?$/i', $text, $m)) {
            $hour = (int) $m[1];
            $minute = (int) ($m[2] ?? 0);

            if ($hour < 1 || $hour > 12 || $minute > 59) {
                return null;
            }

            $hour = $hour % 12 + (strtolower($m[3]) === 'p' ? 12 : 0);

            return sprintf('%02d:%02d', $hour, $minute);
        }

        // 24-hour
        if (preg_match('/^(\d{1,2}):(\d{2})(?::\d{2})?$/', $text, $m)) {
            $hour = (int) $m[1];
            $minute = (int) $m[2];

            if ($hour > 23 || $minute > 59) {
                return null;
            }

            return sprintf('%02d:%02d', $hour, $minute);
        }

        return null;
    }
}