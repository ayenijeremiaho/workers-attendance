export declare class PaginationResponseDto<T> {
    data: T[];
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}
