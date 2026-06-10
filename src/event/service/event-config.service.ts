import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventConfig } from '../entity/event-config.entity';
import { CreateEventConfigDto } from '../dto/create-event-config.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/service/utility.service';
import { VenueService } from '../../venue/service/venue.service';

export type UpdateEventConfigDto = Partial<CreateEventConfigDto>;

@Injectable()
export class EventConfigService {
  private readonly logger = new Logger(EventConfigService.name);

  constructor(
    @InjectRepository(EventConfig)
    private readonly repo: Repository<EventConfig>,
    private readonly venueService: VenueService,
  ) {}

  async create(dto: CreateEventConfigDto): Promise<EventConfig> {
    if (await this.repo.exists({ where: { name: dto.name } })) {
      throw new BadRequestException('Event config name already in use');
    }
    this.validateOffsets(dto);

    const defaultVenue = await this.venueService.getById(dto.defaultVenueId);

    const config = this.repo.create({
      name: dto.name,
      description: dto.description,
      workerCheckinStartOffsetSeconds: dto.workerCheckinStartOffsetSeconds,
      workerLateOffsetSeconds: dto.workerLateOffsetSeconds,
      memberCheckinStartOffsetSeconds: dto.memberCheckinStartOffsetSeconds,
      checkinStopOffsetSeconds: dto.checkinStopOffsetSeconds,
      allowedDistanceInMeters: dto.allowedDistanceInMeters,
      defaultVenue,
    });
    const saved = await this.repo.save(config);
    this.logger.log(`Created event config "${saved.name}" (${saved.id})`);
    return saved;
  }

  async update(id: string, dto: UpdateEventConfigDto): Promise<EventConfig> {
    const config = await this.get(id);

    if (dto.name && dto.name !== config.name) {
      if (await this.repo.exists({ where: { name: dto.name } })) {
        throw new BadRequestException('Event config name already in use');
      }
    }

    if (dto.defaultVenueId) {
      config.defaultVenue = await this.venueService.getById(dto.defaultVenueId);
    }

    const { defaultVenueId: _ignored, ...rest } = dto;
    Object.assign(config, rest);
    const saved = await this.repo.save(config);
    this.logger.log(`Updated event config "${saved.name}" (${id})`);
    return saved;
  }

  async get(id: string): Promise<EventConfig> {
    const config = await this.repo.findOne({
      where: { id },
      relations: ['defaultVenue'],
    });
    if (!config) throw new NotFoundException('Event config not found');
    return config;
  }

  async getAll(page = 1, limit = 10): Promise<PaginationResponseDto<EventConfig>> {
    if (page < 1) throw new BadRequestException('Page must be greater than 0');

    const [configs, total] = await this.repo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['defaultVenue'],
    });

    return UtilityService.createPaginationResponse(configs, page, limit, total);
  }

  async delete(id: string): Promise<void> {
    const config = await this.repo.findOne({
      where: { id },
      relations: ['serviceSlots'],
    });

    if (!config) throw new NotFoundException('Event config not found');

    if (config.serviceSlots?.length > 0) {
      throw new BadRequestException(
        'Cannot delete a config that is assigned to service slots',
      );
    }

    await this.repo.remove(config);
    this.logger.log(`Deleted event config "${config.name}" (${id})`);
  }

  private validateOffsets(dto: CreateEventConfigDto): void {
    if (dto.workerLateOffsetSeconds <= dto.workerCheckinStartOffsetSeconds) {
      throw new BadRequestException(
        'workerLateOffsetSeconds must be greater than workerCheckinStartOffsetSeconds',
      );
    }
    if (dto.checkinStopOffsetSeconds <= dto.workerLateOffsetSeconds) {
      throw new BadRequestException(
        'checkinStopOffsetSeconds must be greater than workerLateOffsetSeconds',
      );
    }
  }
}
