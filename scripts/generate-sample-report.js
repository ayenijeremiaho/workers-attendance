// Run after: npm run build
// Usage: node scripts/generate-sample-report.js
'use strict';

const {PdfService} = require('../dist/utility/service/pdf.service');
const fs = require('fs');

const svc = new PdfService();

function makeSlots(defs) {
    return defs.map(([type, topic, speaker, allocated, actual, overrun, status], i) => ({
        position: i,
        type,
        topic,
        speakerName: speaker,
        allocatedMinutes: allocated,
        actualSeconds: actual != null ? actual * 60 : null,
        overrunSeconds: overrun != null ? overrun * 60 : null,
        status: status ?? 'COMPLETED',
    }));
}

const sessionReport = {
    sessionCode: 'SVC-SAMPLE01',
    programme: {serviceSlotName: 'First Service'},
    status: 'COMPLETED',
    startedAt: new Date('2026-06-15T07:00:00'),
    endedAt: new Date('2026-06-15T08:45:00'),
    totalDurationMinutes: 105,
    totalAllocatedMinutes: 80,
    slotVarianceMinutes: 0,
    completedSlots: 4,
    totalSlots: 4,
    completionRate: 100,
    pauseCount: 1,
    totalPauseDurationSeconds: 180,
    slots: makeSlots([
        ['WORSHIP',      'Praise & Worship',             'Worship Team',        20, 22,  2,  null],
        ['PRAYER',       'Opening Prayer',               'Deacon Michael Ojo',   5,  6,  1,  null],
        ['SPEAKER',      'The Word: Walking In Faith',   'Pastor James Adeyemi',45, 42, -3,  null],
        ['OFFERING',     'Tithes & Offering',            'Deacon Michael Ojo',  10, 10,  0,  null],
    ]),
    pauses: [{slotPosition: 0, reason: 'TECHNICAL_ISSUE', durationSeconds: 180}],
};

// Full event report covering all 4 service slots
const fullEventReport = {
    eventName: 'Sunday Service',
    eventDate: '2026-06-15',
    sessions: [
        {
            serviceSlotName: 'First Service',
            slotStartTime: new Date('2026-06-15T07:00:00'),
            slotEndTime:   new Date('2026-06-15T09:00:00'),
            report: {
                sessionCode: 'SVC-FST001',
                programme: {serviceSlotName: 'First Service'},
                status: 'COMPLETED',
                startedAt: new Date('2026-06-15T07:00:00'),
                endedAt:   new Date('2026-06-15T08:52:00'),
                totalDurationMinutes: 112,
                totalAllocatedMinutes: 80,
                slotVarianceMinutes: 0,
                totalPauseDurationSeconds: 180,
                completedSlots: 4, totalSlots: 4, completionRate: 100, pauseCount: 1,
                slots: makeSlots([
                    ['WORSHIP',  'Praise & Worship',           'Worship Team',        20, 22,  2, null],
                    ['PRAYER',   'Opening Prayer',             'Deacon Michael Ojo',   5,  6,  1, null],
                    ['SPEAKER',  'Walking In Faith',           'Pastor James Adeyemi',45, 42, -3, null],
                    ['OFFERING', 'Tithes & Offering',          'Deacon Michael Ojo',  10, 10,  0, null],
                ]),
                pauses: [{slotPosition: 0, reason: 'TECHNICAL_ISSUE', durationSeconds: 180}],
            },
        },
        {
            serviceSlotName: 'Second Service',
            slotStartTime: new Date('2026-06-15T09:30:00'),
            slotEndTime:   new Date('2026-06-15T11:30:00'),
            report: {
                sessionCode: 'SVC-SND002',
                programme: {serviceSlotName: 'Second Service'},
                status: 'COMPLETED',
                startedAt: new Date('2026-06-15T09:30:00'),
                endedAt:   new Date('2026-06-15T11:22:00'),
                totalDurationMinutes: 112,
                totalAllocatedMinutes: 85,
                slotVarianceMinutes: 3,
                totalPauseDurationSeconds: 0,
                completedSlots: 5, totalSlots: 5, completionRate: 100, pauseCount: 0,
                slots: makeSlots([
                    ['WORSHIP',       'Praise & Worship',          'Worship Team',        20, 18, -2, null],
                    ['PRAYER',        'Opening Prayer',             'Elder Bola Adewale',   5,  5,  0, null],
                    ['ANNOUNCEMENT',  'Weekly Announcements',       'Secretary',           10, 12,  2, null],
                    ['SPEAKER',       'Seated In Heavenly Places',  'Pastor James Adeyemi',40, 43,  3, null],
                    ['OFFERING',      'Tithes & Offering',          'Elder Bola Adewale',  10, 10,  0, null],
                ]),
                pauses: [],
            },
        },
        {
            serviceSlotName: 'Third Service',
            slotStartTime: new Date('2026-06-15T12:00:00'),
            slotEndTime:   new Date('2026-06-15T14:00:00'),
            report: {
                sessionCode: 'SVC-THD003',
                programme: {serviceSlotName: 'Third Service'},
                status: 'COMPLETED',
                startedAt: new Date('2026-06-15T12:00:00'),
                endedAt:   new Date('2026-06-15T13:55:00'),
                totalDurationMinutes: 115,
                totalAllocatedMinutes: 90,
                slotVarianceMinutes: 8,
                totalPauseDurationSeconds: 300,
                completedSlots: 4, totalSlots: 5, completionRate: 80, pauseCount: 1,
                slots: makeSlots([
                    ['WORSHIP',  'Praise & Worship',           'Worship Team',        25, 28,  3, null],
                    ['PRAYER',   'Opening Prayer',             'Deacon Chidi Obi',     5,  5,  0, null],
                    ['SPEAKER',  'The Blessing of Obedience',  'Pastor James Adeyemi',45, 50,  5, null],
                    ['OFFERING', 'Tithes & Offering',          'Deacon Chidi Obi',    10, 10,  0, null],
                    ['BREAK',    null,                          null,                   5, null, null, 'SKIPPED'],
                ]),
                pauses: [{slotPosition: 0, reason: 'PRAYER_BREAK', durationSeconds: 300}],
            },
        },
        {
            serviceSlotName: 'Workers Meeting',
            slotStartTime: new Date('2026-06-15T14:30:00'),
            slotEndTime:   new Date('2026-06-15T15:30:00'),
            report: {
                sessionCode: 'SVC-WKR004',
                programme: {serviceSlotName: 'Workers Meeting'},
                status: 'COMPLETED',
                startedAt: new Date('2026-06-15T14:30:00'),
                endedAt:   new Date('2026-06-15T15:15:00'),
                totalDurationMinutes: 45,
                totalAllocatedMinutes: 40,
                slotVarianceMinutes: -1,
                totalPauseDurationSeconds: 0,
                completedSlots: 3, totalSlots: 3, completionRate: 100, pauseCount: 0,
                slots: makeSlots([
                    ['ANNOUNCEMENT', 'Ministry Updates & June Plan',   'Secretary',           15, 17,  2, null],
                    ['PRAYER',       'Department Intercession',         'HOD Worship',         10, 10,  0, null],
                    ['SPEAKER',      'Leadership Charge',               'Pastor James Adeyemi',15, 12, -3, null],
                ]),
                pauses: [],
            },
        },
    ],
    summary: {
        sessionCount: 4,
        totalAllocatedMinutes: 295,
        totalSlotVarianceMinutes: 10,
        totalDurationMinutes: 384,
        totalPauseMinutes: 8,
        avgCompletionRate: 95,
    },
};

const titheRecords = [
    {paymentDate: '2026-06-02', amount: 15000, bankName: 'GTBank', reference: 'TRF/2026/0612'},
    {paymentDate: '2026-05-04', amount: 15000, bankName: 'GTBank', reference: 'TRF/2026/0501'},
    {paymentDate: '2026-05-04', amount: 5000, bankName: 'First Bank', reference: 'TRF/2026/0498'},
    {paymentDate: '2026-04-06', amount: 20000, bankName: 'Access Bank', reference: 'TRF/2026/0333'},
    {paymentDate: '2026-03-02', amount: 15000, bankName: 'GTBank', reference: 'TRF/2026/0201'},
    {paymentDate: '2026-02-02', amount: 12000, bankName: 'UBA', reference: 'TRF/2026/0098'},
    {paymentDate: '2026-01-05', amount: 15000, bankName: 'GTBank', reference: 'TRF/2026/0024'},
];

const member = {
    id: 'member-sample',
    firstname: 'jeremiah',
    lastname: 'ayeni',
    email: 'ayenijeremiah@gmail.com',
    phoneNumber: '+2348012345678',
};

Promise.all([
    svc.generateSessionReport(sessionReport).then(buf => {
        fs.writeFileSync('/tmp/sample-session-report.pdf', buf);
        console.log('Written /tmp/sample-session-report.pdf');
    }),
    svc.generateTitheStatement(member, titheRecords, {from: '2026-01', to: '2026-06'}).then(buf => {
        fs.writeFileSync('/tmp/sample-tithe-statement.pdf', buf);
        console.log('Written /tmp/sample-tithe-statement.pdf');
    }),
    svc.generateFullEventReport(fullEventReport).then(buf => {
        fs.writeFileSync('/tmp/sample-full-event-report.pdf', buf);
        console.log('Written /tmp/sample-full-event-report.pdf');
    }),
]).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
