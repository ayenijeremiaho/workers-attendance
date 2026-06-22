import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventConfigService } from '../service/event-config.service';
import { VenueService } from '../../venue/service/venue.service';

@Injectable()
export class DefaultEventConfigSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(DefaultEventConfigSeed.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly eventConfigService: EventConfigService,
    private readonly venueService: VenueService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  async seed() {
    const configs = await this.eventConfigService.getAll(1, 1);
    if (configs.totalCount > 0) {
      this.logger.log('Default event config already exists — skipping seed');
      return;
    }

    // Seed the default venue first, reusing an existing one if it was already created
    const venueName =
      this.configService.get<string>('DEFAULT_VENUE_NAME') ?? 'Main Auditorium';
    let venue;
    try {
      venue = await this.venueService.create({
        name: venueName,
        address: this.configService.get<string>('DEFAULT_VENUE_ADDRESS'),
        latitude: Number(this.configService.get('DEFAULT_VENUE_LATITUDE') ?? 0),
        longitude: Number(
          this.configService.get('DEFAULT_VENUE_LONGITUDE') ?? 0,
        ),
      });
      this.logger.log(`Default venue seeded: "${venue.name}" (${venue.id})`);
    } catch {
      // Venue already exists — find it by name
      const existing = await this.venueService.getAll();
      venue = existing.find((v) => v.name === venueName) ?? existing[0];
      if (!venue) {
        this.logger.error(
          'No venues available and seeding failed — set DEFAULT_VENUE_* env vars',
        );
        return;
      }
      this.logger.log(`Reusing existing venue: "${venue.name}" (${venue.id})`);
    }

    const name =
      this.configService.get<string>('DEFAULT_EVENT_CONFIG_NAME') ?? 'Default';
    await this.eventConfigService.create({
      name,
      defaultVenueId: venue.id,
      allowedDistanceInMeters: Number(
        this.configService.get('DEFAULT_EVENT_ALLOWED_DISTANCE_IN_METERS') ??
          100,
      ),
      workerCheckinStartOffsetSeconds: Number(
        this.configService.get('WORKER_CHECKIN_START_OFFSET_SECONDS') ?? -1800,
      ),
      workerLateOffsetSeconds: Number(
        this.configService.get('WORKER_LATE_OFFSET_SECONDS') ?? 0,
      ),
      memberCheckinStartOffsetSeconds: Number(
        this.configService.get('MEMBER_CHECKIN_START_OFFSET_SECONDS') ?? -900,
      ),
      checkinStopOffsetSeconds: Number(
        this.configService.get('CHECKIN_STOP_OFFSET_SECONDS') ?? 3600,
      ),
    });

    this.logger.log(`Default event config seeded: "${name}"`);
  }
}
