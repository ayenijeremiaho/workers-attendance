import {IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID, IsUrl, Min} from 'class-validator';
import {Type} from 'class-transformer';
import {AssetCondition, AssetStatus, MaintenanceCompletionStatus, MaintenanceFrequencyUnit, MaintenanceRecordType} from '../enum/asset.enum';

export class CreateAssetDto {
    @IsOptional()
    @IsString()
    tagNumber?: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsString()
    serialNumber?: string;

    @IsOptional()
    @IsString()
    manufacturer?: string;

    @IsOptional()
    @IsString()
    model?: string;

    @IsOptional()
    @IsDateString()
    purchaseDate?: string;

    @IsOptional()
    @Type(() => Number)
    @IsPositive()
    purchaseValue?: number;

    @IsOptional()
    @IsDateString()
    warrantyExpiry?: string;

    @IsOptional()
    @IsString()
    vendorName?: string;

    @IsOptional()
    @IsString()
    vendorContact?: string;

    @IsOptional()
    @IsUUID()
    departmentId?: string;
}

export class UpdateAssetDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    category?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsEnum(AssetStatus)
    status?: AssetStatus;

    @IsOptional()
    @IsString()
    serialNumber?: string;

    @IsOptional()
    @IsString()
    manufacturer?: string;

    @IsOptional()
    @IsString()
    model?: string;

    @IsOptional()
    @IsDateString()
    purchaseDate?: string;

    @IsOptional()
    @Type(() => Number)
    @IsPositive()
    purchaseValue?: number;

    @IsOptional()
    @IsDateString()
    warrantyExpiry?: string;

    @IsOptional()
    @IsString()
    vendorName?: string;

    @IsOptional()
    @IsString()
    vendorContact?: string;

    @IsOptional()
    @IsUUID()
    departmentId?: string;
}

export class SetMaintenanceScheduleDto {
    @IsEnum(MaintenanceFrequencyUnit)
    frequencyUnit: MaintenanceFrequencyUnit;

    @IsInt()
    @Min(1)
    frequencyValue: number;

    @IsDateString()
    nextDueAt: string;
}

export class LogMaintenanceRecordDto {
    @IsEnum(MaintenanceRecordType)
    type: MaintenanceRecordType;

    @IsDateString()
    performedAt: string;

    @IsString()
    @IsNotEmpty()
    performedBy: string;

    @IsOptional()
    @Type(() => Number)
    @IsPositive()
    cost?: number;

    @IsString()
    @IsNotEmpty()
    notes: string;

    @IsOptional()
    @IsUrl({}, {each: true})
    attachments?: string[];

    @IsEnum(AssetCondition)
    conditionAfter: AssetCondition;

    @IsEnum(MaintenanceCompletionStatus)
    completionStatus: MaintenanceCompletionStatus;
}

export class UpdateInventoryDto {
    @IsInt()
    @Min(0)
    inStorage: number;

    @IsInt()
    @Min(0)
    inUse: number;

    @IsInt()
    @Min(0)
    underRepair: number;

    @IsInt()
    @Min(0)
    writtenOff: number;
}

export class CreateCheckoutDto {
    @IsOptional()
    @IsUUID()
    checkedOutToMemberId?: string;

    @IsOptional()
    @IsUUID()
    checkedOutToDepartmentId?: string;

    @IsOptional()
    @IsDateString()
    expectedReturnAt?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    purpose?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class ReturnAssetDto {
    @IsOptional()
    @IsString()
    notes?: string;
}

export class AssetQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @IsEnum(AssetStatus)
    status?: AssetStatus;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    maintenanceEnabled?: boolean;

    @IsOptional()
    @IsUUID()
    departmentId?: string;
}
