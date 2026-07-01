import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AssetCheckout } from '../entity/asset-checkout.entity';
import {
  AssetCheckoutNotification,
  CheckoutNotificationType,
} from '../entity/asset-checkout-notification.entity';
import { Asset } from '../entity/asset.entity';
import { CreateCheckoutDto, ReturnAssetDto } from '../dto/asset.dto';
import { AssetStatus } from '../enum/asset.enum';
import { Admin } from '../../admin/entity/admin.entity';
import { Member } from '../../member/entity/member.entity';
import { DepartmentLead } from '../../department/entity/department-lead.entity';
import { AuditLogService } from '../../utility/service/audit-log.service';
import { UtilityService } from '../../utility/service/utility.service';
import { EmailCategory } from '../../utility/email-provider/email-category.enum';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';

@Injectable()
export class AssetCheckoutService {
  private readonly logger = new Logger(AssetCheckoutService.name);

  constructor(
    @InjectRepository(AssetCheckout)
    private readonly checkoutRepo: Repository<AssetCheckout>,
    @InjectRepository(AssetCheckoutNotification)
    private readonly notificationRepo: Repository<AssetCheckoutNotification>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(DepartmentLead)
    private readonly departmentLeadRepo: Repository<DepartmentLead>,
    private readonly utilityService: UtilityService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    assetId: string,
    dto: CreateCheckoutDto,
    admin: Admin,
  ): Promise<AssetCheckout> {
    if (!dto.checkedOutToMemberId && !dto.checkedOutToDepartmentId) {
      throw new BadRequestException(
        'Either checkedOutToMemberId or checkedOutToDepartmentId must be provided.',
      );
    }

    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.status === AssetStatus.UNDER_MAINTENANCE) {
      throw new BadRequestException(
        'Asset is currently under maintenance and cannot be checked out.',
      );
    }
    if (asset.status === AssetStatus.DECOMMISSIONED) {
      throw new BadRequestException(
        'Asset has been decommissioned and cannot be checked out.',
      );
    }
    if (asset.status === AssetStatus.INACTIVE) {
      throw new BadRequestException(
        'Asset is inactive and cannot be checked out.',
      );
    }

    const activeCheckout = await this.checkoutRepo.findOne({
      where: { asset: { id: assetId }, returnedAt: IsNull() },
    });
    if (activeCheckout) {
      throw new BadRequestException(
        'This asset already has an active checkout. Return it before checking out again.',
      );
    }

    const checkout = this.checkoutRepo.create({
      asset: { id: assetId } as any,
      checkedOutToMember: dto.checkedOutToMemberId
        ? ({ id: dto.checkedOutToMemberId } as any)
        : null,
      checkedOutToDepartment: dto.checkedOutToDepartmentId
        ? ({ id: dto.checkedOutToDepartmentId } as any)
        : null,
      checkedOutAt: new Date(),
      expectedReturnAt: dto.expectedReturnAt
        ? new Date(dto.expectedReturnAt)
        : null,
      purpose: dto.purpose ?? null,
      notes: dto.notes ?? null,
      checkedOutBy: { id: admin.id } as any,
      returnedAt: null,
      returnedBy: null,
    });

    const saved = await this.checkoutRepo.save(checkout);

    this.auditLogService.log('ASSET_CHECKED_OUT', {
      actorId: admin.member?.id,
      targetId: assetId,
      metadata: {
        checkoutId: saved.id,
        checkedOutToMemberId: dto.checkedOutToMemberId,
        checkedOutToDepartmentId: dto.checkedOutToDepartmentId,
      },
    });

    this.sendCheckoutNotification(asset, saved, dto, admin).catch((err) =>
      this.logger.error(
        `Failed to send checkout notification for checkout ${saved.id}`,
        err,
      ),
    );

    return saved;
  }

  async returnAsset(
    assetId: string,
    checkoutId: string,
    dto: ReturnAssetDto,
    admin: Admin,
  ): Promise<AssetCheckout> {
    const checkout = await this.checkoutRepo.findOne({
      where: { id: checkoutId, asset: { id: assetId } },
      relations: [
        'asset',
        'checkedOutBy',
        'checkedOutToMember',
        'checkedOutToDepartment',
      ],
    });

    if (!checkout) throw new NotFoundException('Checkout record not found');
    if (checkout.returnedAt)
      throw new BadRequestException('This asset has already been returned.');

    checkout.returnedAt = new Date();
    checkout.returnedBy = { id: admin.id } as any;
    if (dto.notes) checkout.notes = dto.notes;

    const saved = await this.checkoutRepo.save(checkout);

    this.auditLogService.log('ASSET_RETURNED', {
      actorId: admin.member?.id,
      targetId: assetId,
      metadata: { checkoutId },
    });

    this.notificationRepo.save({
      checkout: { id: checkoutId } as any,
      type: CheckoutNotificationType.RETURN_CONFIRMED,
      daysOverdue: null,
    });

    this.sendReturnNotification(checkout, admin).catch((err) =>
      this.logger.error(
        `Failed to send return notification for checkout ${checkoutId}`,
        err,
      ),
    );

    return saved;
  }

  async getHistory(
    assetId: string,
    page: number,
    limit: number,
  ): Promise<PaginationResponseDto<AssetCheckout>> {
    const exists = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!exists) throw new NotFoundException('Asset not found');

    const [records, total] = await this.checkoutRepo.findAndCount({
      where: { asset: { id: assetId } },
      relations: [
        'checkedOutToMember',
        'checkedOutToDepartment',
        'checkedOutBy',
        'checkedOutBy.member',
        'returnedBy',
        'returnedBy.member',
      ],
      order: { checkedOutAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return UtilityService.createPaginationResponse(records, page, limit, total);
  }

  async getActiveCheckouts(
    page: number,
    limit: number,
  ): Promise<PaginationResponseDto<AssetCheckout>> {
    const [records, total] = await this.checkoutRepo.findAndCount({
      where: { returnedAt: IsNull() },
      relations: [
        'asset',
        'checkedOutToMember',
        'checkedOutToDepartment',
        'checkedOutBy',
        'checkedOutBy.member',
      ],
      order: { checkedOutAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return UtilityService.createPaginationResponse(records, page, limit, total);
  }

  private async sendCheckoutNotification(
    asset: Asset,
    checkout: AssetCheckout,
    dto: CreateCheckoutDto,
    admin: Admin,
  ): Promise<void> {
    const issuedBy = admin.member
      ? `${admin.member.firstname} ${admin.member.lastname}`
      : 'An administrator';

    const templateData = {
      assetName: asset.name,
      tagNumber: asset.tagNumber,
      category: asset.category,
      location: asset.location ?? 'Not specified',
      purpose: dto.purpose ?? null,
      checkedOutAt: checkout.checkedOutAt.toDateString(),
      expectedReturnAt: checkout.expectedReturnAt
        ? checkout.expectedReturnAt.toDateString()
        : null,
      issuedBy,
    };

    if (dto.checkedOutToMemberId) {
      const member = await this.memberRepo.findOne({
        where: { id: dto.checkedOutToMemberId },
      });
      if (member?.email) {
        this.utilityService.sendEmailWithTemplate(
          member.email,
          `Asset Checked Out to You: ${asset.name}`,
          'asset-checkout-notification',
          {
            ...templateData,
            recipientName: `${member.firstname} ${member.lastname}`,
            recipientLabel: `${member.firstname} ${member.lastname}`,
          },
          undefined,
          EmailCategory.ASSET_ALERTS,
        );
      }
    }

    if (dto.checkedOutToDepartmentId) {
      const leads = await this.departmentLeadRepo.find({
        where: { department: { id: dto.checkedOutToDepartmentId } },
        relations: ['workerProfile', 'workerProfile.member', 'department'],
      });

      for (const lead of leads) {
        const email = lead.workerProfile?.member?.email;
        const name = lead.workerProfile?.member
          ? `${lead.workerProfile.member.firstname} ${lead.workerProfile.member.lastname}`
          : 'Department Lead';
        const departmentName = lead.department?.name ?? 'your department';

        if (email) {
          this.utilityService.sendEmailWithTemplate(
            email,
            `Asset Checked Out to ${departmentName}: ${asset.name}`,
            'asset-checkout-notification',
            {
              ...templateData,
              recipientName: name,
              recipientLabel: departmentName,
            },
            undefined,
            EmailCategory.ASSET_ALERTS,
          );
        }
      }
    }
  }

  private async sendReturnNotification(
    checkout: AssetCheckout,
    returnedByAdmin: Admin,
  ): Promise<void> {
    const asset = checkout.asset;
    if (!asset) return;

    const returnedBy = returnedByAdmin.member
      ? `${returnedByAdmin.member.firstname} ${returnedByAdmin.member.lastname}`
      : 'An administrator';

    const templateData = {
      assetName: asset.name,
      tagNumber: asset.tagNumber,
      category: asset.category,
      location: asset.location ?? 'Not specified',
      checkedOutAt: checkout.checkedOutAt.toDateString(),
      returnedAt:
        checkout.returnedAt?.toDateString() ?? new Date().toDateString(),
      returnedBy,
    };

    if (checkout.checkedOutToMember?.id) {
      const member = await this.memberRepo.findOne({
        where: { id: checkout.checkedOutToMember.id },
      });
      if (member?.email) {
        this.utilityService.sendEmailWithTemplate(
          member.email,
          `Asset Return Confirmed: ${asset.name}`,
          'asset-return-notification',
          {
            ...templateData,
            recipientName: `${member.firstname} ${member.lastname}`,
            recipientLabel: `${member.firstname} ${member.lastname}`,
          },
          undefined,
          EmailCategory.ASSET_ALERTS,
        );
      }
    }

    if (checkout.checkedOutToDepartment?.id) {
      const leads = await this.departmentLeadRepo.find({
        where: { department: { id: checkout.checkedOutToDepartment.id } },
        relations: ['workerProfile', 'workerProfile.member', 'department'],
      });

      for (const lead of leads) {
        const email = lead.workerProfile?.member?.email;
        const name = lead.workerProfile?.member
          ? `${lead.workerProfile.member.firstname} ${lead.workerProfile.member.lastname}`
          : 'Department Lead';
        const departmentName = lead.department?.name ?? 'your department';

        if (email) {
          this.utilityService.sendEmailWithTemplate(
            email,
            `Asset Return Confirmed for ${departmentName}: ${asset.name}`,
            'asset-return-notification',
            {
              ...templateData,
              recipientName: name,
              recipientLabel: departmentName,
            },
            undefined,
            EmailCategory.ASSET_ALERTS,
          );
        }
      }
    }
  }
}
