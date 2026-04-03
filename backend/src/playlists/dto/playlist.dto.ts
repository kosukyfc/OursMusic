import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlaylistDto {
  @IsString()
  title: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdatePlaylistDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class AddSongDto {
  @IsString()
  songId: string;
}

export class ReorderItemDto {
  @IsString()
  songId: string;

  @IsInt()
  @Min(0)
  position: number;
}

export class ReorderPlaylistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  songs: ReorderItemDto[];
}
