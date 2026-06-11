import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../entity/venue.entity';
import { CreateVenueDto, UpdateVenueDto } from '../dto/create-venue.dto';
import { ConfigService } from '@nestjs/config';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/service/utility.service';
import { CacheService } from '../../utility/service/cache.service';

@Injectable()
export class VenueService {
  private readonly logger = new Logger(VenueService.name);
  private static readonly CACHE_KEY = 'venues:all';
  private readonly cacheTtl: number;

  constructor(
    @InjectRepository(Venue)
    private readonly repo: Repository<Venue>,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.cacheTtl = this.configService.get<number>('CACHE_TTL_REFERENCE_SECONDS', 300);
  }

  async create(dto: CreateVenueDto): Promise<Venue> {
    if (await this.repo.exists({ where: { name: dto.name } })) {
      throw new ConflictException(`Venue "${dto.name}" already exists`);
    }
    const saved = await this.repo.save(this.repo.create(dto));
    this.cacheService.del(VenueService.CACHE_KEY);
    this.logger.log(`Venue created: "${saved.name}" (${saved.id})`);
    return saved;
  }

  async getAll(page = 1, limit = 20): Promise<PaginationResponseDto<Venue>> {
    if (page < 1) throw new BadRequestException('Page must be greater than 0');
    let all = this.cacheService.get<Venue[]>(VenueService.CACHE_KEY);
    if (!all) {
      all = await this.repo.find({ order: { name: 'ASC' } });
      this.cacheService.set(VenueService.CACHE_KEY, all, this.cacheTtl);
    }
    const total = all.length;
    const slice = all.slice((page - 1) * limit, page * limit);
    return UtilityService.createPaginationResponse(slice, page, limit, total);
  }

  async getById(id: string): Promise<Venue> {
    const venue = await this.repo.findOneBy({ id });
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }

  async update(id: string, dto: UpdateVenueDto): Promise<Venue> {
    const venue = await this.getById(id);

    if (dto.name && dto.name !== venue.name) {
      if (await this.repo.exists({ where: { name: dto.name } })) {
        throw new ConflictException(`Venue "${dto.name}" already exists`);
      }
      venue.name = dto.name;
    }
    if (dto.address !== undefined) venue.address = dto.address;
    if (dto.latitude !== undefined) venue.latitude = dto.latitude;
    if (dto.longitude !== undefined) venue.longitude = dto.longitude;

    const saved = await this.repo.save(venue);
    this.cacheService.del(VenueService.CACHE_KEY);
    this.logger.log(`Venue updated: "${saved.name}" (${id})`);
    return saved;
  }

  async delete(id: string): Promise<void> {
    const venue = await this.getById(id);
    try {
      await this.repo.remove(venue);
      this.cacheService.del(VenueService.CACHE_KEY);
      this.logger.log(`Venue deleted: "${venue.name}" (${id})`);
    } catch {
      throw new BadRequestException(
        'Cannot delete this venue — it is referenced by one or more event configs or slots.',
      );
    }
  }
}
