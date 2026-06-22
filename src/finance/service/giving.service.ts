import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pledge } from '../entity/pledge.entity';
import { TitheRecord } from '../../tithe/entity/tithe-record.entity';
import { PledgeStatus } from '../enum/finance.enum';

@Injectable()
export class GivingService {
  constructor(
    @InjectRepository(Pledge)
    private readonly pledgeRepo: Repository<Pledge>,
    @InjectRepository(TitheRecord)
    private readonly titheRecordRepo: Repository<TitheRecord>,
  ) {}

  async getMemberGivingSummary(memberId: string): Promise<object> {
    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const [titheRows, pledges, lastTithe] = await Promise.all([
      this.titheRecordRepo
        .createQueryBuilder('tr')
        .where('tr.member_id = :memberId', { memberId })
        .andWhere('tr.paymentDate >= :yearStart', { yearStart })
        .andWhere('tr.paymentDate <= :yearEnd', { yearEnd })
        .select('SUM(tr.amount)', 'total')
        .addSelect('COUNT(tr.id)', 'count')
        .getRawOne(),

      this.pledgeRepo.find({
        where: { member: { id: memberId }, status: PledgeStatus.ACTIVE },
        relations: ['campaign', 'campaign.fund'],
        order: { createdAt: 'DESC' },
      }),

      this.titheRecordRepo.findOne({
        where: { member: { id: memberId } },
        order: { paymentDate: 'DESC' },
        select: ['id', 'amount', 'paymentDate', 'source'],
      }),
    ]);

    const ytdTithes = Number(titheRows?.total ?? 0);
    const ytdTitheCount = Number(titheRows?.count ?? 0);
    const totalPledged = pledges.reduce((s, p) => s + Number(p.totalAmount), 0);

    return {
      year,
      ytdTithes,
      ytdTitheCount,
      lastTithe: lastTithe
        ? {
            date: lastTithe.paymentDate,
            amount: Number(lastTithe.amount),
            source: lastTithe.source,
          }
        : null,
      activePledges: pledges.map((p) => ({
        id: p.id,
        campaign: p.campaign?.name,
        fund: p.campaign?.fund?.name,
        totalAmount: Number(p.totalAmount),
        frequency: p.frequency,
        startDate: p.startDate,
      })),
      totalPledged,
      generatedAt: new Date(),
    };
  }
}
