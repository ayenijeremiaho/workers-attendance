import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminRole } from '../entity/admin-role.entity';
import { CreateAdminRoleDto, UpdateAdminRoleDto } from '../dto/admin-role.dto';
import { AuditLogService } from '../../utility/service/audit-log.service';

@Injectable()
export class AdminRoleService {
  private readonly logger = new Logger(AdminRoleService.name);

  constructor(
    @InjectRepository(AdminRole)
    private readonly adminRoleRepository: Repository<AdminRole>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateAdminRoleDto, actorId: string): Promise<AdminRole> {
    const exists = await this.adminRoleRepository.existsBy({ name: dto.name });
    if (exists)
      throw new ConflictException(`Admin role "${dto.name}" already exists.`);

    const role = this.adminRoleRepository.create({
      name: dto.name,
      description: dto.description,
      permissions: dto.permissions,
    });
    const saved = await this.adminRoleRepository.save(role);
    this.logger.log(
      `Admin role "${saved.name}" created (id: ${saved.id}) by actor ${actorId}`,
    );
    this.auditLogService.log('ADMIN_ROLE_CREATED', {
      actorId,
      targetId: saved.id,
      metadata: { name: saved.name, permissionCount: saved.permissions.length },
    });
    return saved;
  }

  async update(
    id: string,
    dto: UpdateAdminRoleDto,
    actorId: string,
  ): Promise<AdminRole> {
    const role = await this.getById(id);

    if (dto.name && dto.name !== role.name) {
      const exists = await this.adminRoleRepository.existsBy({
        name: dto.name,
      });
      if (exists)
        throw new ConflictException(`Admin role "${dto.name}" already exists.`);
      role.name = dto.name;
    }
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissions !== undefined) role.permissions = dto.permissions;

    const saved = await this.adminRoleRepository.save(role);
    this.logger.log(
      `Admin role "${saved.name}" updated (id: ${id}) by actor ${actorId}`,
    );
    this.auditLogService.log('ADMIN_ROLE_UPDATED', {
      actorId,
      targetId: id,
      metadata: { name: saved.name, changes: Object.keys(dto) },
    });
    return saved;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const role = await this.adminRoleRepository.findOne({
      where: { id },
      relations: ['admins'],
    });
    if (!role) throw new NotFoundException('Admin role not found.');

    const activeAdmins = role.admins?.filter((a) => a.isActive).length ?? 0;
    if (activeAdmins > 0) {
      this.logger.warn(
        `Delete of admin role "${role.name}" blocked — ${activeAdmins} active admin(s) still assigned`,
      );
      throw new BadRequestException(
        'Cannot delete a role that has active admin users. Reassign or deactivate them first.',
      );
    }

    const { name } = role;
    await this.adminRoleRepository.remove(role);
    this.logger.log(
      `Admin role "${name}" deleted (id: ${id}) by actor ${actorId}`,
    );
    this.auditLogService.log('ADMIN_ROLE_DELETED', {
      actorId,
      targetId: id,
      metadata: { name },
    });
  }

  async getAll(): Promise<AdminRole[]> {
    return this.adminRoleRepository.find({ order: { name: 'ASC' } });
  }

  async getById(id: string): Promise<AdminRole> {
    const role = await this.adminRoleRepository.findOneBy({ id });
    if (!role) throw new NotFoundException('Admin role not found.');
    return role;
  }

  async findOrCreateSuperAdmin(): Promise<AdminRole> {
    const existing = await this.adminRoleRepository.findOneBy({
      name: 'SuperAdmin',
    });
    if (existing) return existing;

    this.logger.log('SuperAdmin role not found — seeding');
    const { AdminPermission } = await import('../enum/admin-permission.enum');
    return this.adminRoleRepository.save(
      this.adminRoleRepository.create({
        name: 'SuperAdmin',
        description: 'Full access to all admin features.',
        permissions: Object.values(AdminPermission),
      }),
    );
  }
}
