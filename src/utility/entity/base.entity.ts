import {
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Base entity class that provides common fields (createdAt, updatedAt)
 * to all other entities in the application.
 * This reduces code duplication and ensures consistency.
 */
export abstract class BaseEntity {
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
