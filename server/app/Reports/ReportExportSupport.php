<?php

namespace App\Reports;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportExportSupport
{
    public const LIMIT = 5000;

    public const NAVY = '1E3A5F';

    public const BLUE = '0095D9';

    public const TEAL = '0F766E';

    /**
     * @param  array<string, mixed>  $filters
     */
    public static function dateRangeLabel(array $filters): string
    {
        $start = $filters['start_date'] ?? null;
        $end = $filters['end_date'] ?? null;

        if ($start && $end) {
            return $start.' to '.$end;
        }

        if ($start) {
            return 'From '.$start;
        }

        if ($end) {
            return 'Until '.$end;
        }

        return 'All dates';
    }

    public static function filename(string $module, string $extension): string
    {
        $stamp = now()->format('Y-m-d');

        return "FilSched-{$module}-Report-{$stamp}.{$extension}";
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function pdf(string $view, array $payload, string $filename): Response
    {
        $pdf = Pdf::loadView($view, ['report' => $payload])
            ->setPaper('a4', 'landscape')
            ->setOption('isRemoteEnabled', false)
            ->setOption('isPhpEnabled', false)
            ->setOption('defaultFont', 'DejaVu Sans');

        $pdf->render();
        $dompdf = $pdf->getDomPDF();
        $canvas = $dompdf->getCanvas();
        $font = $dompdf->getFontMetrics()->getFont('DejaVu Sans');
        $width = $canvas->get_width();
        $height = $canvas->get_height();
        $navy = [0.118, 0.227, 0.373];

        $canvas->page_script(function ($pageNumber, $pageCount, $canvas) use ($font, $width, $height, $navy) {
            $canvas->text(36, 22, 'FilSched', $font, 9, $navy);
            $canvas->text($width - 210, 22, 'Filamer Christian University Inc.', $font, 8, $navy);
            $canvas->text(36, $height - 24, 'Confidential — authorized FilSched users only', $font, 7, $navy);
            $canvas->text($width - 120, $height - 24, 'Page '.$pageNumber.' of '.$pageCount, $font, 8, $navy);
        });

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<array{name: string, headers: list<string>, rows: list<list<mixed>>, widths?: list<int>}>  $sheets
     */
    public static function excel(array $payload, array $sheets, string $filename): BinaryFileResponse
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('FilSched')
            ->setTitle($payload['title'] ?? 'FilSched Report')
            ->setCompany('Filamer Christian University Inc.');

        $info = $spreadsheet->getActiveSheet();
        $info->setTitle('Report Information');
        self::writeInfoSheet($info, $payload);

        $summary = $spreadsheet->createSheet();
        $summary->setTitle('Summary');
        self::writeSummarySheet($summary, $payload);

        foreach ($sheets as $sheetDef) {
            $sheet = $spreadsheet->createSheet();
            $sheet->setTitle(substr($sheetDef['name'], 0, 31));
            self::writeTableSheet(
                $sheet,
                $sheetDef['headers'],
                $sheetDef['rows'],
                $sheetDef['widths'] ?? []
            );
        }

        $spreadsheet->setActiveSheetIndex(0);

        $path = tempnam(sys_get_temp_dir(), 'filsched-xlsx-');
        $writer = new Xlsx($spreadsheet);
        $writer->setPreCalculateFormulas(false);
        $writer->save($path);
        $spreadsheet->disconnectWorksheets();

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private static function writeInfoSheet(Worksheet $sheet, array $payload): void
    {
        $sheet->setCellValue('A1', 'FilSched');
        $sheet->setCellValue('A2', 'Filamer Christian University Inc.');
        $sheet->setCellValue('A3', $payload['report_type'] ?? 'Report');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(18)->getColor()->setRGB(self::NAVY);
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(12)->getColor()->setRGB(self::BLUE);
        $sheet->getStyle('A3')->getFont()->setSize(11)->getColor()->setRGB(self::TEAL);

        $meta = [
            ['Date generated', $payload['generated_at'] ?? ''],
            ['Date range', $payload['date_range'] ?? 'All dates'],
            ['Matching records', $payload['total_matching'] ?? 0],
            ['Exported records', $payload['exported_count'] ?? 0],
            ['Truncated', !empty($payload['truncated']) ? 'Yes — export limited to '.self::LIMIT.' rows' : 'No'],
        ];

        $row = 5;
        $sheet->setCellValue('A'.$row, 'Report details');
        self::headerRow($sheet, $row, 2);
        $row++;

        foreach ($meta as $item) {
            $sheet->setCellValue('A'.$row, $item[0]);
            $sheet->setCellValue('B'.$row, $item[1]);
            $row++;
        }

        $row++;
        $sheet->setCellValue('A'.$row, 'Applied filters');
        self::headerRow($sheet, $row, 2);
        $row++;

        foreach ($payload['filters'] ?? [] as $filter) {
            $sheet->setCellValue('A'.$row, $filter['label'] ?? '');
            $sheet->setCellValue('B'.$row, $filter['value'] ?? '');
            $row++;
        }

        $sheet->getColumnDimension('A')->setWidth(28);
        $sheet->getColumnDimension('B')->setWidth(60);
        $sheet->freezePane('A5');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private static function writeSummarySheet(Worksheet $sheet, array $payload): void
    {
        $sheet->setCellValue('A1', 'Summary statistics');
        self::headerRow($sheet, 1, 2);

        $row = 2;
        foreach ($payload['cards'] ?? [] as $card) {
            $sheet->setCellValue('A'.$row, $card['label'] ?? '');
            $sheet->setCellValue('B'.$row, (int) ($card['value'] ?? 0));
            $sheet->getStyle('B'.$row)->getNumberFormat()->setFormatCode('#,##0');
            $row++;
        }

        $sheet->getColumnDimension('A')->setWidth(40);
        $sheet->getColumnDimension('B')->setWidth(16);
        $sheet->freezePane('A2');
        $sheet->setAutoFilter('A1:B1');
    }

    /**
     * @param  list<string>  $headers
     * @param  list<list<mixed>>  $rows
     * @param  list<int>  $widths
     */
    private static function writeTableSheet(Worksheet $sheet, array $headers, array $rows, array $widths): void
    {
        $columnCount = max(count($headers), 1);

        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 1], $header);
        }

        self::headerRow($sheet, 1, $columnCount);

        foreach ($rows as $rowIndex => $values) {
            foreach ($values as $columnIndex => $value) {
                $sheet->setCellValue([$columnIndex + 1, $rowIndex + 2], $value);
            }
        }

        $lastColumn = Coordinate::stringFromColumnIndex($columnCount);
        $lastRow = max(count($rows) + 1, 1);
        $sheet->setAutoFilter("A1:{$lastColumn}{$lastRow}");
        $sheet->freezePane('A2');
        $sheet->getStyle("A2:{$lastColumn}{$lastRow}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

        for ($i = 1; $i <= $columnCount; $i++) {
            $dimension = $sheet->getColumnDimensionByColumn($i);
            if (isset($widths[$i - 1])) {
                $dimension->setWidth($widths[$i - 1]);
            } else {
                $dimension->setAutoSize(true);
            }
        }
    }

    private static function headerRow(Worksheet $sheet, int $row, int $columnCount): void
    {
        $lastColumn = Coordinate::stringFromColumnIndex($columnCount);
        $range = "A{$row}:{$lastColumn}{$row}";
        $sheet->getStyle($range)->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => self::NAVY],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => self::NAVY],
                ],
            ],
        ]);
    }
}
