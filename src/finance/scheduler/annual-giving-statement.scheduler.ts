import {Injectable, Logger} from '@nestjs/common';
import {Cron} from '@nestjs/schedule';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {ConfigService} from '@nestjs/config';
import {Member} from '../../member/entity/member.entity';
import {JournalEntryLine} from '../entity/journal-entry-line.entity';
import {CacheService} from '../../utility/service/cache.service';
import {UtilityService} from '../../utility/service/utility.service';
import {JournalEntryStatus} from '../enum/finance.enum';
import {MemberStatusEnum} from '../../member/enums/member-status.enum';

@Injectable()
export class AnnualGivingStatementScheduler {
    private readonly logger = new Logger(AnnualGivingStatementScheduler.name);
    private static readonly LOCK_KEY = 'lock:annual-giving-statements';

    constructor(
        @InjectRepository(Member)
        private readonly memberRepo: Repository<Member>,
        @InjectRepository(JournalEntryLine)
        private readonly lineRepo: Repository<JournalEntryLine>,
        private readonly cacheService: CacheService,
        private readonly utilityService: UtilityService,
        private readonly configService: ConfigService,
    ) {}

    @Cron('0 8 1 1 *')
    async sendAnnualStatements(): Promise<void> {
        if (!this.configService.get<boolean>('ANNUAL_GIVING_STATEMENT_ENABLED')) return;

        const acquired = await this.cacheService.acquireLock(AnnualGivingStatementScheduler.LOCK_KEY, 3600);
        if (!acquired) return;

        try {
            await this.run();
        } finally {
            this.cacheService.releaseLock(AnnualGivingStatementScheduler.LOCK_KEY);
        }
    }

    async sendForMember(memberId: string): Promise<{sent: boolean; year: number; total: number}> {
        const year = new Date().getFullYear() - 1;
        const result = await this.fetchMemberTotals(year, memberId);
        const row = result[0];
        if (!row || Number(row.total) === 0) return {sent: false, year, total: 0};

        const member = await this.memberRepo.findOne({where: {id: memberId}});
        if (!member) return {sent: false, year, total: 0};

        this.utilityService.sendEmailWithTemplate(member.email, 'Annual Giving Statement', 'annual-giving-statement', {
            memberName: `${member.firstname} ${member.lastname}`,
            year,
            total: Number(row.total).toFixed(2),
            lineCount: Number(row.lineCount),
        });
        return {sent: true, year, total: Number(row.total)};
    }

    private async run(): Promise<void> {
        const previousYear = new Date().getFullYear() - 1;

        const givingRows = await this.fetchMemberTotals(previousYear);
        if (givingRows.length === 0) return;

        const memberIds = givingRows.map(r => r.memberId);
        const members = await this.memberRepo.findBy({id: In(memberIds), status: MemberStatusEnum.ACTIVE});
        const memberMap = new Map(members.map(m => [m.id, m]));

        let sent = 0;
        for (const row of givingRows) {
            const member = memberMap.get(row.memberId);
            if (!member) continue;
            try {
                this.utilityService.sendEmailWithTemplate(member.email, 'Annual Giving Statement', 'annual-giving-statement', {
                    memberName: `${member.firstname} ${member.lastname}`,
                    year: previousYear,
                    total: Number(row.total).toFixed(2),
                    lineCount: Number(row.lineCount),
                });
                sent++;
            } catch (err) {
                this.logger.error(`Failed to send annual giving statement to member ${member.id}: ${(err as Error).message}`);
            }
        }

        this.logger.log(`Annual giving statement scheduler: sent ${sent} statements for ${previousYear}`);
    }

    private async fetchMemberTotals(year: number, memberId?: string) {
        const fromDate = `${year}-01-01`;
        const toDate = `${year}-12-31`;

        const qb = this.lineRepo
            .createQueryBuilder('l')
            .innerJoin('l.journalEntry', 'je')
            .innerJoin('finance_journal_entry_links', 'jel', 'jel.journal_entry_id = je.id')
            .where('je.status = :status', {status: JournalEntryStatus.POSTED})
            .andWhere('je.date >= :fromDate', {fromDate})
            .andWhere('je.date <= :toDate', {toDate})
            .select('jel.member_id', 'memberId')
            .addSelect('SUM(l.amount)', 'total')
            .addSelect('COUNT(l.id)', 'lineCount')
            .groupBy('jel.member_id')
            .having('SUM(l.amount) > 0');

        if (memberId) {
            qb.andWhere('jel.member_id = :memberId', {memberId});
        }

        return qb.getRawMany<{memberId: string; total: string; lineCount: string}>();
    }
}
