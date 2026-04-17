import { Controller, Get, Post, Put, Delete, Param, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { GenresService } from './genres.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  async list() {
    return this.genresService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.genresService.findById(id);
  }

  @Get('name/:name')
  async findByName(@Param('name') name: string) {
    return this.genresService.findByName(name);
  }

  @Get(':id/songs')
  async getSongsByGenre(
    @Param('id') genreId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.genresService.getSongsByGenre(
      genreId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('name/:name/songs')
  async getSongsByGenreName(
    @Param('name') genreName: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.genresService.getSongsByGenreName(
      genreName,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('song/:songId')
  async getSongGenres(@Param('songId') songId: string) {
    return this.genresService.getSongGenres(songId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: { name: string; description?: string; coverUrl?: string }) {
    if (!body.name) throw new BadRequestException('Genre name is required');
    return this.genresService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; coverUrl?: string },
  ) {
    return this.genresService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.genresService.delete(id);
  }

  @Post(':genreId/songs/:songId')
  @UseGuards(JwtAuthGuard)
  async addSongToGenre(@Param('genreId') genreId: string, @Param('songId') songId: string) {
    return this.genresService.addSongToGenre(genreId, songId);
  }

  @Delete(':genreId/songs/:songId')
  @UseGuards(JwtAuthGuard)
  async removeSongFromGenre(@Param('genreId') genreId: string, @Param('songId') songId: string) {
    return this.genresService.removeSongFromGenre(genreId, songId);
  }
}
