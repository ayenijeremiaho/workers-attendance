export class WorkerStatusCountDto {
  active: number;
  suspended: number;
  inactive: number;

  static fromJson(
    json: {
      status: string;
      count: number;
    }[],
  ): WorkerStatusCountDto {
    const dto = new WorkerStatusCountDto();

    json.forEach(({ status, count }) => {
      switch (status) {
        case 'ACTIVE':
          dto.active = count;
          break;
        case 'SUSPENDED':
          dto.suspended = count;
          break;
        case 'INACTIVE':
          dto.inactive = count;
          break;
      }
    });

    return dto;
  }
}
