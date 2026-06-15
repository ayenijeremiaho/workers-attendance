import {Injectable} from '@nestjs/common';
import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {FullEventReport, SessionReport} from '../../service-programme/service/service-session.service';
import {ServiceSessionSlotStatusEnum} from '../../service-programme/enum/service-session-slot-status.enum';
import {TitheRecord} from '../../tithe/entity/tithe-record.entity';
import {Member} from '../../member/entity/member.entity';

const DARK = '#121212';
const MUTED = '#8A817C';
const ACCENT = '#EADCC9';
const LIGHT_GOLD = '#F4EDE4';
const DANGER = '#C0392B';
const SUCCESS = '#2E7D32';
const WHITE = '#FFFFFF';

const PAGE_W = 210;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

@Injectable()
export class PdfService {
    generateSessionReport(report: SessionReport): Promise<Buffer> {
        const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
        this.drawSessionReport(doc, report);
        return Promise.resolve(Buffer.from(doc.output('arraybuffer')));
    }

    generateFullEventReport(report: FullEventReport): Promise<Buffer> {
        const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
        this.drawFullEventReport(doc, report);
        return Promise.resolve(Buffer.from(doc.output('arraybuffer')));
    }

    generateTitheStatement(member: Member, records: TitheRecord[], period?: {from?: string; to?: string}): Promise<Buffer> {
        const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
        this.drawTitheStatement(doc, member, records, period);
        return Promise.resolve(Buffer.from(doc.output('arraybuffer')));
    }

    // ─── Session report ──────────────────────────────────────────────────────

    private drawSessionReport(doc: jsPDF, report: SessionReport): void {
        let y = this.drawPageHeader(doc, 'Service Session Report');

        y = this.drawAccentBand(doc, y, report.programme.serviceSlotName ?? 'Session', this.fmtDate(report.startedAt));

        y = this.drawLabelValueGrid(doc, y + 4, [
            ['Session Code', report.sessionCode],
            ['Started', this.fmtTime(report.startedAt)],
            ['Ended', report.endedAt ? this.fmtTime(report.endedAt) : '—'],
            ['Duration', report.totalDurationMinutes == null ? '—' : `${report.totalDurationMinutes} min`],
            ['Slots Completed', `${report.completedSlots} / ${report.totalSlots}`],
            ['Completion Rate', `${report.completionRate}%`],
            ['Pauses', `${report.pauseCount}`],
            ['Total Pause Time', `${Math.round(report.totalPauseDurationSeconds / 60)} min`],
        ]);

        y += 8;
        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(DARK)
            .text('Slots', MARGIN, y);
        y += 5;

        autoTable(doc, {
            startY: y,
            margin: {left: MARGIN, right: MARGIN},
            head: [['#', 'Type', 'Topic / Speaker', 'Allocated', 'Actual', 'Overrun']],
            body: report.slots.map((slot) => {
                const speaker = [slot.topic, slot.speakerName].filter(Boolean).join(' · ') || '—';
                let overrun = '—';
                if (slot.overrunSeconds != null) {
                    const mins = Math.round(slot.overrunSeconds / 60);
                    overrun = mins > 0 ? `+${mins} min` : `${mins} min`;
                }
                return [
                    String(slot.position + 1),
                    slot.type,
                    speaker,
                    slot.allocatedMinutes == null ? '—' : `${slot.allocatedMinutes} min`,
                    slot.actualSeconds == null ? '—' : `${Math.round(slot.actualSeconds / 60)} min`,
                    overrun,
                ];
            }),

            columnStyles: {
                0: {cellWidth: 10},
                1: {cellWidth: 22},
                2: {cellWidth: 68},
                3: {cellWidth: 22},
                4: {cellWidth: 22},
                5: {cellWidth: 30},
            },
            headStyles: {fillColor: ACCENT, textColor: DARK, fontStyle: 'bold', fontSize: 9},
            bodyStyles: {fontSize: 9, textColor: DARK, fillColor: WHITE},
            alternateRowStyles: {fillColor: LIGHT_GOLD},
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 5
                        && typeof data.cell.raw === 'string' && data.cell.raw.startsWith('+')) {
                    data.cell.styles.textColor = DANGER;
                }
                const rowSlot = report.slots[data.row.index];
                if (data.section === 'body' && rowSlot?.status === ServiceSessionSlotStatusEnum.SKIPPED) {
                    data.cell.styles.textColor = MUTED;
                }
            },
        });

        const afterSlotsY = (doc as any).lastAutoTable.finalY + 8;

        if (report.pauses.length > 0) {
            doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(DARK)
                .text('Pause Log', MARGIN, afterSlotsY);

            autoTable(doc, {
                startY: afterSlotsY + 5,
                margin: {left: MARGIN, right: MARGIN},
                head: [['Slot', 'Reason', 'Duration']],
                body: report.pauses.map((p) => [
                    `Slot ${p.slotPosition + 1}`,
                    p.reason.replaceAll('_', ' '),
                    p.durationSeconds == null ? 'ongoing' : `${Math.round(p.durationSeconds / 60)} min`,
                ]),
                columnStyles: {0: {cellWidth: 24}, 1: {cellWidth: 120}, 2: {cellWidth: 30}},
                headStyles: {fillColor: ACCENT, textColor: DARK, fontStyle: 'bold', fontSize: 9},
                bodyStyles: {fontSize: 9, textColor: MUTED, fillColor: WHITE},
                alternateRowStyles: {fillColor: LIGHT_GOLD},
            });
        }

        const finalY = (doc as any).lastAutoTable.finalY;
        const afterFinal = finalY + 6;
        const summaryY = afterFinal + 14 > 277 ? (() => { doc.addPage(); return MARGIN; })() : afterFinal;
        this.drawTimeSummaryBand(doc, summaryY, report);

        this.drawPageFooter(doc);
    }

    // ─── Tithe statement ─────────────────────────────────────────────────────

    private drawTitheStatement(doc: jsPDF, member: Member, records: TitheRecord[], period?: {from?: string; to?: string}): void {
        let y = this.drawPageHeader(doc, 'Tithe Statement');

        const total = records.reduce((sum, r) => sum + Number(r.amount), 0);

        const generatedText = `Generated: ${new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'long', year: 'numeric'})}`;

        let periodLabel: string | undefined;
        let periodValue: string | undefined;
        if (period?.from && period?.to) {
            periodLabel = 'Period';
            periodValue = `${this.fmtMonthShort(period.from)} – ${this.fmtMonthShort(period.to)}`;
        } else if (period?.from) {
            periodLabel = 'From';
            periodValue = `${this.fmtMonthShort(period.from)} onwards`;
        } else if (period?.to) {
            periodLabel = 'Up to';
            periodValue = this.fmtMonthShort(period.to);
        }

        y = this.drawAccentBand(
            doc, y,
            `${this.cap(member.firstname)} ${this.cap(member.lastname)}`,
            generatedText,
            periodLabel,
            periodValue,
        );

        y = this.drawLabelValueGrid(doc, y + 4, [
            ['Email', member.email],
            ['Phone', member.phoneNumber ?? '—'],
            ['Total Records', `${records.length}`],
            ['Total Paid (NGN)', total.toLocaleString('en-NG', {minimumFractionDigits: 2})],
        ]);

        y += 8;
        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(DARK)
            .text('Payment History', MARGIN, y);
        y += 5;

        autoTable(doc, {
            startY: y,
            margin: {left: MARGIN, right: MARGIN},
            head: [['Month', 'Date', 'Amount (NGN)', 'Bank', 'Reference']],
            body: records.map((r) => {
                const [yr, mo] = r.paymentDate.split('-').map(Number);
                const monthName = new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', {month: 'long', year: 'numeric'});
                return [
                    monthName,
                    r.paymentDate,
                    Number(r.amount).toLocaleString('en-NG', {minimumFractionDigits: 2}),
                    r.bankName ?? '—',
                    r.reference ?? '—',
                ];
            }),
            foot: [['Total', '', `NGN ${total.toLocaleString('en-NG', {minimumFractionDigits: 2})}`, '', '']],

            columnStyles: {
                0: {cellWidth: 30},
                1: {cellWidth: 24},
                2: {cellWidth: 36, halign: 'right'},
                3: {cellWidth: 36},
                4: {cellWidth: 44},
            },
            headStyles: {fillColor: ACCENT, textColor: DARK, fontStyle: 'bold', fontSize: 9},
            bodyStyles: {fontSize: 9, textColor: DARK, fillColor: WHITE},
            alternateRowStyles: {fillColor: LIGHT_GOLD},
            footStyles: {fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 9},
            showFoot: 'lastPage',
            didParseCell: (data) => {
                if (data.section === 'foot' && data.column.index === 2) {
                    data.cell.styles.halign = 'right';
                }
            },
        });

        this.drawPageFooter(doc);
    }

    // ─── Full event report ────────────────────────────────────────────────────

    private drawFullEventReport(doc: jsPDF, report: FullEventReport): void {
        const [yr, mo, dy] = report.eventDate.split('-').map(Number);
        const eventDateFormatted = new Date(yr, mo - 1, dy)
            .toLocaleDateString('en-GB', {day: '2-digit', month: 'long', year: 'numeric'});

        let y = this.drawPageHeader(doc, 'Sunday Service Report');
        y = this.drawAccentBand(doc, y, report.eventName, eventDateFormatted);
        y += 6;

        // ── Event-level variance overview table ──────────────────────────────
        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(DARK)
            .text('Session Overview', MARGIN, y);
        y += 5;

        const overviewBody = report.sessions.map((entry) => {
            const r = entry.report;
            const varMins = r.slotVarianceMinutes ?? 0;
            return [
                entry.serviceSlotName,
                r.totalAllocatedMinutes != null ? `${r.totalAllocatedMinutes} min` : '—',
                r.totalDurationMinutes != null ? `${r.totalDurationMinutes} min` : '—',
                `${Math.round(r.totalPauseDurationSeconds / 60)} min`,
                this.fmtVariance(varMins),
                `${r.completionRate}%`,
            ];
        });

        const s = report.summary;
        const overviewFoot = s
            ? [
                ['Total / Avg',
                    `${s.totalAllocatedMinutes} min`,
                    s.totalDurationMinutes != null ? `${s.totalDurationMinutes} min` : '—',
                    `${s.totalPauseMinutes} min`,
                    this.fmtVariance(s.totalSlotVarianceMinutes),
                    `${s.avgCompletionRate}%`,
                ],
              ]
            : undefined;

        autoTable(doc, {
            startY: y,
            margin: {left: MARGIN, right: MARGIN},
            head: [['Service', 'Allocated', 'Duration', 'Pauses', 'Slot Var.', 'Cmpl.']],
            body: overviewBody,
            foot: overviewFoot,
            columnStyles: {
                0: {cellWidth: 46},
                1: {cellWidth: 24},
                2: {cellWidth: 26},
                3: {cellWidth: 22},
                4: {cellWidth: 28},
                5: {cellWidth: 28},
            },
            headStyles: {fillColor: ACCENT, textColor: DARK, fontStyle: 'bold', fontSize: 9},
            bodyStyles: {fontSize: 9, textColor: DARK, fillColor: WHITE},
            alternateRowStyles: {fillColor: LIGHT_GOLD},
            footStyles: {fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 9},
            showFoot: 'lastPage',
            didParseCell: (data) => {
                if (data.column.index === 4 && data.section === 'body') {
                    const raw = typeof data.cell.raw === 'string' ? data.cell.raw : '';
                    if (raw.startsWith('+')) data.cell.styles.textColor = DANGER;
                    else if (raw.startsWith('-')) data.cell.styles.textColor = SUCCESS;
                }
            },
        });

        y = (doc as any).lastAutoTable.finalY + 10;

        // ── Per-session sections ──────────────────────────────────────────────
        for (const entry of report.sessions) {
            const slotTime = `${this.fmtTime(entry.slotStartTime)} – ${this.fmtTime(entry.slotEndTime)}`;
            const r = entry.report;

            if (y > 220) {
                doc.addPage();
                y = MARGIN;
            }

            y = this.drawSectionDivider(doc, y, entry.serviceSlotName, slotTime);
            y = this.drawLabelValueGrid(doc, y + 4, [
                ['Session Code', r.sessionCode],
                ['Duration', r.totalDurationMinutes == null ? '—' : `${r.totalDurationMinutes} min`],
                ['Allocated', r.totalAllocatedMinutes != null ? `${r.totalAllocatedMinutes} min` : '—'],
                ['Slot Variance', this.fmtVariance(r.slotVarianceMinutes ?? 0)],
                ['Slots Completed', `${r.completedSlots} / ${r.totalSlots}`],
                ['Completion Rate', `${r.completionRate}%`],
                ['Pauses', `${r.pauseCount}`],
                ['Total Pause Time', `${Math.round(r.totalPauseDurationSeconds / 60)} min`],
            ]);

            y += 4;
            autoTable(doc, {
                startY: y,
                margin: {left: MARGIN, right: MARGIN},
                head: [['#', 'Type', 'Topic / Speaker', 'Allocated', 'Actual', 'Overrun']],
                body: r.slots.map((slot) => {
                    const speaker = [slot.topic, slot.speakerName].filter(Boolean).join(' · ') || '—';
                    let overrun = '—';
                    if (slot.overrunSeconds != null) {
                        const mins = Math.round(slot.overrunSeconds / 60);
                        overrun = mins > 0 ? `+${mins} min` : `${mins} min`;
                    }
                    return [
                        String(slot.position + 1),
                        slot.type,
                        speaker,
                        slot.allocatedMinutes == null ? '—' : `${slot.allocatedMinutes} min`,
                        slot.actualSeconds == null ? '—' : `${Math.round(slot.actualSeconds / 60)} min`,
                        overrun,
                    ];
                }),
                columnStyles: {
                    0: {cellWidth: 10},
                    1: {cellWidth: 22},
                    2: {cellWidth: 68},
                    3: {cellWidth: 22},
                    4: {cellWidth: 22},
                    5: {cellWidth: 30},
                },
                headStyles: {fillColor: ACCENT, textColor: DARK, fontStyle: 'bold', fontSize: 9},
                bodyStyles: {fontSize: 9, textColor: DARK, fillColor: WHITE},
                alternateRowStyles: {fillColor: LIGHT_GOLD},
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 5
                            && typeof data.cell.raw === 'string' && data.cell.raw.startsWith('+')) {
                        data.cell.styles.textColor = DANGER;
                    }
                    const rowSlot = r.slots[data.row.index];
                    if (data.section === 'body' && rowSlot?.status === ServiceSessionSlotStatusEnum.SKIPPED) {
                        data.cell.styles.textColor = MUTED;
                    }
                },
            });

            y = (doc as any).lastAutoTable.finalY + 4;

            if (r.pauses.length > 0) {
                doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(DARK)
                    .text('Pauses', MARGIN, y + 4);
                autoTable(doc, {
                    startY: y + 8,
                    margin: {left: MARGIN, right: MARGIN},
                    head: [['Slot', 'Reason', 'Duration']],
                    body: r.pauses.map((p) => [
                        `Slot ${p.slotPosition + 1}`,
                        p.reason.replaceAll('_', ' '),
                        p.durationSeconds == null ? 'ongoing' : `${Math.round(p.durationSeconds / 60)} min`,
                    ]),
                    headStyles: {fillColor: ACCENT, textColor: DARK, fontStyle: 'bold', fontSize: 9},
                    bodyStyles: {fontSize: 9, textColor: MUTED, fillColor: WHITE},
                    alternateRowStyles: {fillColor: LIGHT_GOLD},
                });
                y = (doc as any).lastAutoTable.finalY + 4;
            }

            const bandY = y + 14 > 277 ? (() => { doc.addPage(); return MARGIN; })() : y;
            y = this.drawTimeSummaryBand(doc, bandY, r) + 8;
        }

        this.drawPageFooter(doc);
    }

    private drawSectionDivider(doc: jsPDF, y: number, title: string, subtitle: string): number {
        doc.setFillColor(DARK);
        doc.rect(MARGIN, y, CONTENT_W, 9, 'F');
        doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(WHITE)
            .text(title, MARGIN + 4, y + 6);
        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(ACCENT)
            .text(subtitle, PAGE_W - MARGIN - 4, y + 6, {align: 'right'});
        return y + 9;
    }

    // ─── Shared layout helpers ────────────────────────────────────────────────

    private drawPageHeader(doc: jsPDF, title: string): number {
        doc.setFillColor(DARK);
        doc.rect(0, 0, PAGE_W, 22, 'F');

        doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(WHITE)
            .text('RCCG', MARGIN, 10);
        doc.setFont('helvetica', 'bold')
            .text('Discovery Centre', MARGIN + 11, 10);

        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(ACCENT)
            .text('Destinies discovered, Champions raised', PAGE_W - MARGIN, 10, {align: 'right'});

        doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(DARK)
            .text(title, MARGIN, 36);

        doc.setDrawColor(ACCENT).setLineWidth(0.6)
            .line(MARGIN, 40, PAGE_W - MARGIN, 40);

        return 48;
    }

    private drawAccentBand(
        doc: jsPDF, y: number, primary: string, secondary: string,
        rightLabel?: string, rightValue?: string,
    ): number {
        const h = 14;
        doc.setFillColor(ACCENT);
        doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, 'F');

        doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(DARK)
            .text(primary, MARGIN + 5, y + 5.5);
        doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(MUTED)
            .text(secondary, MARGIN + 5, y + 10.5);

        if (rightLabel && rightValue) {
            const rightX = PAGE_W - MARGIN - 5;
            doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(MUTED)
                .text(rightLabel, rightX, y + 5.5, {align: 'right'});
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(DARK)
                .text(rightValue, rightX, y + 10.5, {align: 'right'});
        }

        return y + h;
    }

    private drawLabelValueGrid(doc: jsPDF, y: number, pairs: [string, string][]): number {
        const colW = CONTENT_W / 2;
        pairs.forEach(([label, value], i) => {
            const col = i % 2 === 0 ? MARGIN : MARGIN + colW;
            const row = y + Math.floor(i / 2) * 8;
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED)
                .text(label, col, row);
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(DARK)
                .text(value, col, row + 4);
        });
        return y + Math.ceil(pairs.length / 2) * 8 + 2;
    }

    private fmtVariance(minutes: number): string {
        if (minutes > 0) return `+${minutes} min`;
        if (minutes < 0) return `${minutes} min`;
        return 'On time';
    }

    private drawTimeSummaryBand(doc: jsPDF, y: number, report: SessionReport): number {
        const h = 14;
        doc.setFillColor(ACCENT);
        doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, 'F');

        const colW = CONTENT_W / 4;
        const varMins = report.slotVarianceMinutes ?? 0;
        const allocatedValue = report.totalAllocatedMinutes === null || report.totalAllocatedMinutes === undefined
            ? '—' : `${report.totalAllocatedMinutes} min`;
        const durationValue = report.totalDurationMinutes === null || report.totalDurationMinutes === undefined
            ? '—' : `${report.totalDurationMinutes} min`;
        let varColor: string;
        if (varMins > 0) varColor = DANGER;
        else if (varMins < 0) varColor = SUCCESS;
        else varColor = DARK;
        const cells: Array<{label: string; value: string; color: string}> = [
            {label: 'Allocated', value: allocatedValue, color: DARK},
            {label: 'Slot Variance', value: this.fmtVariance(varMins), color: varColor},
            {label: 'Duration', value: durationValue, color: DARK},
            {label: 'Pauses', value: `${Math.round(report.totalPauseDurationSeconds / 60)} min`, color: DARK},
        ];

        cells.forEach(({label, value, color}, i) => {
            const x = MARGIN + i * colW + colW / 2;
            doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(MUTED)
                .text(label, x, y + 4.5, {align: 'center'});
            doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(color)
                .text(value, x, y + 10.5, {align: 'center'});
        });

        return y + h;
    }

    private drawPageFooter(doc: jsPDF): void {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const pageH = 297;
            doc.setDrawColor(ACCENT).setLineWidth(0.4)
                .line(MARGIN, pageH - 16, PAGE_W - MARGIN, pageH - 16);
            doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(MUTED)
                .text('RCCG Discovery Centre · 62 Igi Olugbin Street, Bariga, Lagos, Nigeria', MARGIN, pageH - 10);
            doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, pageH - 10, {align: 'right'});
        }
    }

    private fmtDate(date: Date): string {
        return new Date(date).toLocaleDateString('en-GB', {day: '2-digit', month: 'long', year: 'numeric'});
    }

    private fmtTime(date: Date): string {
        return new Date(date).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: true});
    }

    private fmtMonthShort(ym: string): string {
        const [year, month] = ym.split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {month: 'short', year: 'numeric'});
    }

    private cap(str: string): string {
        return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    }
}
