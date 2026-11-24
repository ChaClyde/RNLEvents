<?php

namespace App\Venues;

/**
 * Official school facility rates, effective June 2017.
 * Stored as data so the booking screens can show the schedule without the scanned notice.
 */
final class FacilityRateSchedule
{
    /**
     * @return array<string, mixed>
     */
    public static function document(): array
    {
        $eveningNote = 'Love gift to work students on evenings and weekends, and to security guards on duty during the evening, is given directly to them and is not included in this calculation.';

        return [
            'title' => 'New rates for the use of the school facilities',
            'effective' => 'June 2017',
            'currency' => 'PHP',
            'evening_note' => $eveningNote,
            'items' => [
                [
                    'name' => 'Roblee Hall',
                    'rate' => '2000.00',
                    'unit' => 'per hour',
                    'details' => 'Rate includes 4 air-conditioning units. Each additional air-conditioning unit is 500.00 per hour.',
                    'note' => $eveningNote,
                ],
                [
                    'name' => 'Audio Visual Conference Center (AVCC)',
                    'rate' => '400.00',
                    'unit' => 'per hour',
                    'details' => null,
                    'note' => $eveningNote,
                ],
                [
                    'name' => 'Gym',
                    'rate' => '500.00',
                    'unit' => 'per hour',
                    'details' => null,
                    'note' => $eveningNote,
                ],
                [
                    'name' => 'Chapel',
                    'rate' => '1000.00',
                    'unit' => 'per hour',
                    'details' => null,
                    'note' => $eveningNote,
                ],
                [
                    'name' => 'Auditorium / Library Multi-Purpose Room',
                    'rate' => '350.00',
                    'unit' => 'per hour',
                    'details' => 'Auditorium rate covers 3 to 4 industrial fans.',
                    'note' => $eveningNote,
                ],
                [
                    'name' => 'Prayer Garden',
                    'rate' => '300.00',
                    'unit' => 'per day',
                    'details' => null,
                    'note' => null,
                ],
                [
                    'name' => 'Speech Laboratory',
                    'rate' => '500.00',
                    'unit' => 'per hour',
                    'details' => 'Teacher or facilitator is 200.00 per hour.',
                    'note' => null,
                ],
                [
                    'name' => 'Multi-media Projector',
                    'rate' => '500.00',
                    'unit' => 'per hour',
                    'details' => null,
                    'note' => null,
                ],
                [
                    'name' => 'Plastic Chairs (if taken outside)',
                    'rate' => '5.00',
                    'unit' => 'per chair',
                    'details' => null,
                    'note' => null,
                ],
                [
                    'name' => 'Plastic Tables',
                    'rate' => '50.00',
                    'unit' => 'per table',
                    'details' => null,
                    'note' => null,
                ],
            ],
            'prepared_by' => 'Friend Ross B. Belloga, Acting Business Manager',
            'endorsed_by' => 'Mrs. Esther S. Arceño, TIC – VP for Finance',
            'approved_by' => 'Dr. George O. Cortel, President',
        ];
    }
}
