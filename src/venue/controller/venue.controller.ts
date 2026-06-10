import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VenueService } from '../service/venue.service';
import { CreateVenueDto, UpdateVenueDto } from '../dto/create-venue.dto';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';

@UseGuards(JwtAuthGuard)
@Controller('venues')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Post()
  create(@Body() dto: CreateVenueDto) {
    return this.venueService.create(dto);
  }

  @Get()
  getAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.venueService.getAll(Number(page), Number(limit));
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.venueService.getById(id);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVenueDto) {
    return this.venueService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.venueService.delete(id);
  }
}
