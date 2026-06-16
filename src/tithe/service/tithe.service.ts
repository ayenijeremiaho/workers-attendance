import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Between, LessThanOrEqual, MoreThanOrEqual, Repository} from 'typeorm';
import {InjectQueue} from '@nestjs/bull';
import {Queue} from 'bull';
import {Cron} from '@nestjs/schedule';
import * as ExcelJS from 'exceljs';
import {TitheUploadBatch} from '../entity/tithe-upload-batch.entity';
import {TitheRecord} from '../entity/tithe-record.entity';
import {TitheUnmatchedRecord} from '../entity/tithe-unmatched-record.entity';
import {TitheDisputeRecord} from '../entity/tithe-dispute-record.entity';
import {TithePaymentProof} from '../entity/tithe-payment-proof.entity';
import {TitheBatchStatus, TitheDisputeStatus, TitheProofStatus, TitheUnmatchedStatus} from '../enum/tithe.enum';
import {TITHE_PROCESS_JOB, TITHE_QUEUE, TitheRow} from '../processor/tithe.processor';
import {SubmitTitheProofDto, DeclineTitheProofDto} from '../dto/tithe.dto';
import {Admin} from '../../admin/entity/admin.entity';
import {Member} from '../../member/entity/member.entity';
import {UtilityService} from '../../utility/service/utility.service';
import {AuditLogService} from '../../utility/service/audit-log.service';
import {CloudinaryService} from '../../utility/service/cloudinary.service';
import {CacheService} from '../../utility/service/cache.service';
import {PdfService} from '../../utility/service/pdf.service';
import {ExcelService} from '../../utility/service/excel.service';
import {AdminPermission} from '../../admin/enum/admin-permission.enum';
import {PaginationResponseDto} from '../../utility/dto/pagination-response.dto';
import {MemberAuth} from '../../auth/interface/auth.interface';

const TITHE_PROOF_MAX_BYTES = 2 * 1024 * 1024;

function proofExpiryDays(): number {
    const val = Number.parseInt(process.env.TITHE_PROOF_EXPIRY_DAYS ?? '', 10);
    return Number.isNaN(val) || val < 1 ? 90 : val;
}

@Injectable()
export class TitheService {
    private readonly logger = new Logger(TitheService.name);

    constructor(
        @InjectRepository(TitheUploadBatch)
        private readonly batchRepo: Repository<TitheUploadBatch>,
        @InjectRepository(TitheRecord)
        private readonly recordRepo: Repository<TitheRecord>,
        @InjectRepository(TitheUnmatchedRecord)
        private readonly unmatchedRepo: Repository<TitheUnmatchedRecord>,
        @InjectRepository(TitheDisputeRecord)
        private readonly disputeRepo: Repository<TitheDisputeRecord>,
        @InjectRepository(Member)
        private readonly memberRepo: Repository<Member>,
        @InjectRepository(TithePaymentProof)
        private readonly proofRepo: Repository<TithePaymentProof>,
        @InjectRepository(Admin)
        private readonly adminRepo: Repository<Admin>,
        @InjectQueue(TITHE_QUEUE)
        private readonly titheQueue: Queue,
        private readonly utilityService: UtilityService,
        private readonly auditLogService: AuditLogService,
        private readonly cloudinaryService: CloudinaryService,
        private readonly cacheService: CacheService,
        private readonly pdfService: PdfService,
        private readonly excelService: ExcelService,
    ) {}

    async getTemplate(): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Tithe Records');
        sheet.columns = [
            {header: 'email', key: 'email', width: 30},
            {header: 'amount', key: 'amount', width: 15},
            {header: 'paymentDate', key: 'paymentDate', width: 18},
            {header: 'reference', key: 'reference', width: 30},
            {header: 'bankName', key: 'bankName', width: 20},
        ];
        sheet.getRow(1).font = {bold: true};

        const guide = workbook.addWorksheet('Instructions');
        guide.getCell('A1').value = 'Column Guide';
        guide.getCell('A1').font = {bold: true};
        const instructions = [
            ['email', 'Required. Member email address (must match an account in the system).'],
            ['amount', 'Required. Numeric value only, e.g. 5000 or 1500.50'],
            ['paymentDate', 'Required. Format: YYYY-MM-DD, e.g. 2026-05-01'],
            ['reference', 'Optional. Bank narration or transaction reference.'],
            ['bankName', 'Optional. Name of the bank the tithe was paid from.'],
        ];
        instructions.forEach(([col, desc], i) => {
            guide.getCell(`A${i + 2}`).value = col;
            guide.getCell(`B${i + 2}`).value = desc;
        });
        guide.getRow(1).font = {bold: true};
        guide.columns = [{width: 18}, {width: 60}];

        const sample = workbook.addWorksheet('Sample');
        sample.columns = sheet.columns;
        sample.getRow(1).font = {bold: true};
        sample.addRow({email: 'john.doe@example.com', amount: 5000, paymentDate: '2026-05-01', reference: 'TRF/2026/001', bankName: 'GTBank'});

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    async uploadBatch(file: {buffer: Buffer; originalname: string}, admin: Admin): Promise<{batchId: string; totalRows: number}> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(file.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
        const sheet = workbook.worksheets[0];

        const headers = sheet.getRow(1).values as string[];
        const required = ['email', 'amount', 'paymentDate'];
        for (const col of required) {
            if (!headers.includes(col)) {
                throw new BadRequestException(`Missing required column: "${col}". Download the template to see the correct format.`);
            }
        }

        const colIndex = (name: string) => headers.indexOf(name);
        const rows: TitheRow[] = [];

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const values = row.values as any[];
            const email = String(values[colIndex('email')] ?? '').trim();
            const amount = Number.parseFloat(String(values[colIndex('amount')] ?? ''));
            const paymentDate = String(values[colIndex('paymentDate')] ?? '').trim();

            if (!email || Number.isNaN(amount) || !paymentDate) return;

            rows.push({
                email,
                amount,
                paymentDate,
                reference: values[colIndex('reference')] ? String(values[colIndex('reference')]).trim() : undefined,
                bankName: values[colIndex('bankName')] ? String(values[colIndex('bankName')]).trim() : undefined,
            });
        });

        if (rows.length === 0) {
            throw new BadRequestException('The uploaded file contains no valid data rows.');
        }

        const batch = await this.batchRepo.save(
            this.batchRepo.create({
                uploadedBy: admin,
                fileName: file.originalname,
                status: TitheBatchStatus.PENDING,
                totalRows: rows.length,
                rows,
            }),
        );

        await this.titheQueue.add(TITHE_PROCESS_JOB, {batchId: batch.id, rows}, {attempts: 3, backoff: {type: 'exponential', delay: 5000}, removeOnFail: false});
        this.auditLogService.log('TITHE_BATCH_QUEUED', {actorId: admin.member?.id, metadata: {batchId: batch.id, rows: rows.length}});
        this.logger.log(`Tithe batch ${batch.id} queued with ${rows.length} rows`);

        return {batchId: batch.id, totalRows: rows.length};
    }

    async getBatches(page = 1, limit = 20): Promise<PaginationResponseDto<TitheUploadBatch>> {
        const [data, total] = await this.batchRepo.findAndCount({
            relations: ['uploadedBy', 'uploadedBy.member'],
            order: {createdAt: 'DESC'},
            skip: (page - 1) * limit,
            take: limit,
        });
        return UtilityService.createPaginationResponse(data, page, limit, total);
    }

    async getBatch(id: string): Promise<TitheUploadBatch> {
        const batch = await this.batchRepo.findOne({where: {id}, relations: ['uploadedBy', 'uploadedBy.member']});
        if (!batch) throw new NotFoundException('Upload batch not found');
        return batch;
    }

    async requeueBatch(id: string, actorAdmin: Admin): Promise<void> {
        const batch = await this.batchRepo.findOne({where: {id, status: TitheBatchStatus.FAILED}});
        if (!batch) throw new NotFoundException('Failed batch not found');
        if (!batch.rows?.length) throw new BadRequestException('Batch has no stored row data and cannot be requeued');

        await this.batchRepo.update(id, {status: TitheBatchStatus.PENDING, errorMessage: null, processedAt: null});
        await this.titheQueue.add(TITHE_PROCESS_JOB, {batchId: id, rows: batch.rows}, {attempts: 3, backoff: {type: 'exponential', delay: 5000}, removeOnFail: false});
        this.auditLogService.log('TITHE_BATCH_QUEUED', {actorId: actorAdmin.member?.id, metadata: {batchId: id, rows: batch.rows.length, requeue: true}});
    }

    async getUnmatched(page = 1, limit = 20, status?: TitheUnmatchedStatus): Promise<PaginationResponseDto<TitheUnmatchedRecord>> {
        const where = status ? {status} : {status: TitheUnmatchedStatus.PENDING};
        const [data, total] = await this.unmatchedRepo.findAndCount({
            where,
            relations: ['batch', 'matchedMember'],
            order: {createdAt: 'DESC'},
            skip: (page - 1) * limit,
            take: limit,
        });
        return UtilityService.createPaginationResponse(data, page, limit, total);
    }

    async dismissUnmatched(id: string, actorAdmin: Admin): Promise<void> {
        const record = await this.unmatchedRepo.findOne({where: {id, status: TitheUnmatchedStatus.PENDING}});
        if (!record) throw new NotFoundException('Unmatched record not found or already resolved');

        record.status = TitheUnmatchedStatus.DISMISSED;
        record.resolvedBy = actorAdmin;
        record.resolvedAt = new Date();
        await this.unmatchedRepo.save(record);

        this.auditLogService.log('TITHE_UNMATCHED_DISMISSED', {actorId: actorAdmin.member?.id, metadata: {unmatchedId: id}});
    }

    async matchUnmatched(id: string, memberId: string, actorAdmin: Admin): Promise<void> {
        const record = await this.unmatchedRepo.findOne({where: {id, status: TitheUnmatchedStatus.PENDING}, relations: ['batch']});
        if (!record) throw new NotFoundException('Unmatched record not found or already resolved');

        const member = await this.memberRepo.findOne({where: {id: memberId}});
        if (!member) throw new NotFoundException('Member not found');

        await this.recordRepo.save(
            this.recordRepo.create({
                member: {id: memberId},
                batch: {id: record.batch?.id},
                amount: record.amount,
                paymentDate: record.paymentDate,
                reference: record.reference,
                bankName: record.bankName,
            }),
        );

        record.status = TitheUnmatchedStatus.MATCHED;
        record.matchedMember = member;
        record.resolvedBy = actorAdmin;
        record.resolvedAt = new Date();
        await this.unmatchedRepo.save(record);

        this.auditLogService.log('TITHE_UNMATCHED_RESOLVED', {actorId: actorAdmin.member?.id, metadata: {unmatchedId: id, memberId}});
    }

    async getDisputes(page = 1, limit = 20, status?: TitheDisputeStatus): Promise<PaginationResponseDto<TitheDisputeRecord>> {
        const where = status ? {status} : {status: TitheDisputeStatus.PENDING};
        const [data, total] = await this.disputeRepo.findAndCount({
            where,
            relations: ['member', 'existingRecord', 'batch'],
            order: {createdAt: 'DESC'},
            skip: (page - 1) * limit,
            take: limit,
        });
        return UtilityService.createPaginationResponse(data, page, limit, total);
    }

    async approveDispute(id: string, actorAdmin: Admin): Promise<void> {
        const dispute = await this.disputeRepo.findOne({
            where: {id, status: TitheDisputeStatus.PENDING},
            relations: ['member', 'batch'],
        });
        if (!dispute) throw new NotFoundException('Dispute not found or already reviewed');

        await this.recordRepo.save(
            this.recordRepo.create({
                member: {id: dispute.member.id},
                batch: {id: dispute.batch.id},
                amount: dispute.amount,
                paymentDate: dispute.paymentDate,
                reference: dispute.reference,
                bankName: dispute.bankName,
            }),
        );

        dispute.status = TitheDisputeStatus.CONFIRMED_VALID;
        dispute.reviewedBy = actorAdmin;
        dispute.reviewedAt = new Date();
        await this.disputeRepo.save(dispute);

        this.auditLogService.log('TITHE_DISPUTE_APPROVED', {actorId: actorAdmin.member?.id, metadata: {disputeId: id}});
    }

    async rejectDispute(id: string, actorAdmin: Admin): Promise<void> {
        const dispute = await this.disputeRepo.findOne({where: {id, status: TitheDisputeStatus.PENDING}});
        if (!dispute) throw new NotFoundException('Dispute not found or already reviewed');

        dispute.status = TitheDisputeStatus.REJECTED;
        dispute.reviewedBy = actorAdmin;
        dispute.reviewedAt = new Date();
        await this.disputeRepo.save(dispute);

        this.auditLogService.log('TITHE_DISPUTE_REJECTED', {actorId: actorAdmin.member?.id, metadata: {disputeId: id}});
    }

    async getMyTithes(user: MemberAuth, page = 1, limit = 20): Promise<PaginationResponseDto<TitheRecord>> {
        const [data, total] = await this.recordRepo.findAndCount({
            where: {member: {id: user.id}},
            order: {paymentDate: 'DESC'},
            skip: (page - 1) * limit,
            take: limit,
        });
        return UtilityService.createPaginationResponse(data, page, limit, total);
    }

    async emailTitheStatement(user: MemberAuth, fromMonth?: string, toMonth?: string): Promise<void> {
        const member = await this.memberRepo.findOne({where: {id: user.id}});
        if (!member) throw new NotFoundException('Member not found');

        const fromDate = fromMonth ? `${fromMonth}-01` : undefined;
        const toDate = toMonth ? this.lastDayOfMonth(toMonth) : undefined;

        const records = await this.recordRepo.find({
            where: {
                member: {id: user.id},
                ...(fromDate && toDate ? {paymentDate: Between(fromDate, toDate)} : {}),
                ...(fromDate && !toDate ? {paymentDate: MoreThanOrEqual(fromDate)} : {}),
                ...(!fromDate && toDate ? {paymentDate: LessThanOrEqual(toDate)} : {}),
            },
            order: {paymentDate: 'DESC'},
        });

        const period = fromMonth ?? toMonth ? {from: fromMonth, to: toMonth} : undefined;
        const pdfBuffer = await this.pdfService.generateTitheStatement(member, records, period);

        this.utilityService.sendEmailWithAttachment(
            member.email,
            'Your Tithe Statement',
            'tithe-statement',
            {name: UtilityService.capitalizeFirstLetter(member.firstname), count: records.length},
            [{filename: 'tithe-statement.pdf', content: pdfBuffer}],
        );

        this.logger.log(`Tithe statement emailed to ${member.email} — ${records.length} records`);
    }

    // ── Tithe Payment Proofs ──────────────────────────────────────────────────

    async submitProof(user: MemberAuth, dto: SubmitTitheProofDto, file: {buffer: Buffer; originalname: string; size: number}): Promise<TithePaymentProof> {
        if (file.size > TITHE_PROOF_MAX_BYTES) {
            throw new BadRequestException(`Proof file must not exceed ${TITHE_PROOF_MAX_BYTES / (1024 * 1024)}MB`);
        }

        const uploaded = await this.cloudinaryService.uploadBuffer(file.buffer, 'tithe-proofs', `${user.id}-${Date.now()}`);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + proofExpiryDays());

        const proof = await this.proofRepo.save(
            this.proofRepo.create({
                member: {id: user.id},
                amount: dto.amount,
                paymentDate: dto.paymentDate,
                bankName: dto.bankName ?? null,
                reference: dto.reference ?? null,
                proofUrl: uploaded.secureUrl,
                publicId: uploaded.publicId,
                resourceType: uploaded.resourceType,
                status: TitheProofStatus.PENDING,
                expiresAt,
            }),
        );

        this.auditLogService.log('TITHE_PROOF_SUBMITTED', {actorId: user.id, metadata: {proofId: proof.id, amount: dto.amount}});
        this.notifyFinanceTeam(proof).catch((err) => this.logger.error(`Finance team proof notification failed: ${err.message}`));

        return proof;
    }

    async getMyProofs(user: MemberAuth, page = 1, limit = 20): Promise<PaginationResponseDto<TithePaymentProof>> {
        const [data, total] = await this.proofRepo.findAndCount({
            where: {member: {id: user.id}},
            order: {createdAt: 'DESC'},
            skip: (page - 1) * limit,
            take: limit,
        });
        return UtilityService.createPaginationResponse(data, page, limit, total);
    }

    async getAllProofs(page = 1, limit = 20, status?: TitheProofStatus): Promise<PaginationResponseDto<TithePaymentProof>> {
        const [data, total] = await this.proofRepo.findAndCount({
            where: status ? {status} : undefined,
            relations: ['member', 'reviewedBy', 'reviewedBy.member'],
            order: {createdAt: 'DESC'},
            skip: (page - 1) * limit,
            take: limit,
        });
        return UtilityService.createPaginationResponse(data, page, limit, total);
    }

    async confirmProof(id: string, actorAdmin: Admin): Promise<void> {
        const proof = await this.proofRepo.findOne({where: {id, status: TitheProofStatus.PENDING}, relations: ['member']});
        if (!proof) throw new NotFoundException('Pending proof not found');

        proof.status = TitheProofStatus.CONFIRMED;
        proof.reviewedBy = actorAdmin;
        proof.reviewedAt = new Date();
        await this.proofRepo.save(proof);

        this.auditLogService.log('TITHE_PROOF_CONFIRMED', {actorId: actorAdmin.member?.id, metadata: {proofId: id}});
        this.utilityService.sendEmailWithTemplate(
            proof.member.email,
            'Your Tithe Payment Has Been Confirmed',
            'tithe-proof-confirmed',
            {name: UtilityService.capitalizeFirstLetter(proof.member.firstname), amount: Number(proof.amount).toLocaleString('en-NG'), paymentDate: proof.paymentDate},
        );
    }

    async declineProof(id: string, dto: DeclineTitheProofDto, actorAdmin: Admin): Promise<void> {
        const proof = await this.proofRepo.findOne({where: {id, status: TitheProofStatus.PENDING}, relations: ['member']});
        if (!proof) throw new NotFoundException('Pending proof not found');

        proof.status = TitheProofStatus.DECLINED;
        proof.reviewedBy = actorAdmin;
        proof.reviewedAt = new Date();
        proof.financeNote = dto.financeNote;
        await this.proofRepo.save(proof);

        this.auditLogService.log('TITHE_PROOF_DECLINED', {actorId: actorAdmin.member?.id, metadata: {proofId: id, note: dto.financeNote}});
        this.utilityService.sendEmailWithTemplate(
            proof.member.email,
            'Update on Your Tithe Payment Submission',
            'tithe-proof-declined',
            {name: UtilityService.capitalizeFirstLetter(proof.member.firstname), amount: Number(proof.amount).toLocaleString('en-NG'), paymentDate: proof.paymentDate, financeNote: dto.financeNote},
        );
    }

    private static readonly PROOF_CLEANUP_LOCK = 'lock:tithe-proof-cleanup';

    @Cron('0 3 * * *')
    async purgeExpiredProofs(): Promise<void> {
        const acquired = await this.cacheService.acquireLock(TitheService.PROOF_CLEANUP_LOCK, 270);
        if (!acquired) return;

        try {
            const expired = await this.proofRepo.find({where: {expiresAt: LessThanOrEqual(new Date())}});
            if (expired.length === 0) return;

            for (const proof of expired) {
                await this.cloudinaryService.deleteByPublicId(proof.publicId, proof.resourceType);
                await this.proofRepo.remove(proof);
            }

            this.auditLogService.log('TITHE_PROOF_EXPIRED_PURGED', {metadata: {count: expired.length}});
            this.logger.log(`Purged ${expired.length} expired tithe proof(s)`);
        } finally {
            this.cacheService.releaseLock(TitheService.PROOF_CLEANUP_LOCK);
        }
    }

    async getAdminRecords(
        page = 1,
        limit = 20,
        memberId?: string,
        departmentId?: string,
        fromMonth?: string,
        toMonth?: string,
        search?: string,
    ): Promise<PaginationResponseDto<TitheRecord>> {
        const qb = this.buildRecordsQb(memberId, departmentId, fromMonth, toMonth, search);
        const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
        return UtilityService.createPaginationResponse(data, page, limit, total);
    }

    async getAdminRecordsExcel(
        memberId?: string,
        departmentId?: string,
        fromMonth?: string,
        toMonth?: string,
        search?: string,
    ): Promise<Buffer> {
        const records = await this.buildRecordsQb(memberId, departmentId, fromMonth, toMonth, search).getMany();
        return this.excelService.buildWorkbook('Tithe Records', [
            {header: 'Member Name', key: 'memberName', width: 28},
            {header: 'Email', key: 'email', width: 32},
            {header: 'Amount (NGN)', key: 'amount', width: 18},
            {header: 'Payment Date', key: 'paymentDate', width: 16},
            {header: 'Bank', key: 'bank', width: 22},
            {header: 'Reference', key: 'reference', width: 30},
        ], records.map((r) => ({
            memberName: `${r.member.firstname} ${r.member.lastname}`,
            email: r.member.email,
            amount: Number(r.amount),
            paymentDate: r.paymentDate,
            bank: r.bankName ?? '',
            reference: r.reference ?? '',
        })));
    }

    private buildRecordsQb(
        memberId?: string,
        departmentId?: string,
        fromMonth?: string,
        toMonth?: string,
        search?: string,
    ) {
        const qb = this.recordRepo
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.member', 'member')
            .leftJoinAndSelect('member.workerProfile', 'wp')
            .leftJoinAndSelect('wp.department', 'dept')
            .orderBy('r.paymentDate', 'DESC');

        if (memberId) qb.andWhere('member.id = :memberId', {memberId});
        if (departmentId) qb.andWhere('dept.id = :departmentId', {departmentId});
        if (fromMonth) qb.andWhere('r.paymentDate >= :fromDate', {fromDate: `${fromMonth}-01`});
        if (toMonth) qb.andWhere('r.paymentDate <= :toDate', {toDate: this.lastDayOfMonth(toMonth)});
        if (search) {
            qb.andWhere(
                '(LOWER(member.firstname) LIKE :s OR LOWER(member.lastname) LIKE :s OR LOWER(member.email) LIKE :s)',
                {s: `%${search.toLowerCase()}%`},
            );
        }

        return qb;
    }

    private lastDayOfMonth(ym: string): string {
        const [year, month] = ym.split('-').map(Number);
        return new Date(year, month, 0).toISOString().slice(0, 10);
    }

    private async notifyFinanceTeam(proof: TithePaymentProof): Promise<void> {
        const admins = await this.adminRepo
            .createQueryBuilder('a')
            .leftJoinAndSelect('a.member', 'm')
            .leftJoinAndSelect('a.adminRole', 'role')
            .where('a.isActive = true')
            .getMany();

        const recipients = admins
            .filter((a) => a.adminRole?.permissions?.includes(AdminPermission.FINANCE_WRITE))
            .map((a) => a.member?.email)
            .filter((e): e is string => !!e);

        for (const email of recipients) {
            this.utilityService.sendEmailWithTemplate(
                email,
                'New Tithe Payment Proof Submitted',
                'tithe-proof-submitted',
                {amount: Number(proof.amount).toLocaleString('en-NG'), paymentDate: proof.paymentDate, proofId: proof.id},
            );
        }
    }
}
