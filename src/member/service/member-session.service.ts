import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberSession } from '../entity/member-session.entity';

@Injectable()
export class MemberSessionService {
  constructor(
    @InjectRepository(MemberSession)
    private readonly sessionRepository: Repository<MemberSession>,
  ) {}

  async updateLogin(memberId: string, hashedRefreshToken: string): Promise<void> {
    const existing = await this.sessionRepository.findOne({
      where: { member: { id: memberId } },
    });

    if (existing) {
      existing.hashedRefreshToken = hashedRefreshToken;
      existing.lastLogin = new Date();
      existing.lastLogout = null;
      await this.sessionRepository.save(existing);
    } else {
      await this.sessionRepository.save(
        this.sessionRepository.create({
          member: { id: memberId },
          hashedRefreshToken,
          lastLogin: new Date(),
        }),
      );
    }
  }

  async updateLogout(memberId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { member: { id: memberId } },
    });
    if (session) {
      session.hashedRefreshToken = null;
      session.lastLogout = new Date();
      await this.sessionRepository.save(session);
    }
  }

  async getHashedRefreshToken(memberId: string): Promise<string | null> {
    const session = await this.sessionRepository.findOne({
      where: { member: { id: memberId } },
    });
    return session?.hashedRefreshToken ?? null;
  }
}
