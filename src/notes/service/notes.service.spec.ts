import {Test, TestingModule} from '@nestjs/testing';
import {getRepositoryToken} from '@nestjs/typeorm';
import {NotesService} from './notes.service';
import {Note} from '../entity/note.entity';
import {AuditLogService} from '../../utility/service/audit-log.service';

describe('NotesService', () => {
    let service: NotesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotesService,
                {provide: getRepositoryToken(Note), useValue: {save: jest.fn(), find: jest.fn()}},
                {provide: AuditLogService, useValue: {log: jest.fn()}},
            ],
        }).compile();

        service = module.get<NotesService>(NotesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
