import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateScreenDTO } from './dto/create-screen.dto';
import { CreateScreenSlotDTO } from './dto/create-screen-slot.dto';
import { UpdateScreenDTO } from './dto/update-screen.dto';
import { ScreenSlotsService } from './screen-slots.service';
import { ScreensService } from './screens.service';

@ApiTags('screens')
@ApiBearerAuth('user-jwt')
@Controller('screens')
@UseGuards(UserJwtAuthGuard)
export class ScreensController {
  constructor(
    private readonly screensService: ScreensService,
    private readonly screenSlotsService: ScreenSlotsService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create screen' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateScreenDTO) {
    return this.screensService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all screens' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.screensService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get screen by ID' })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update screen' })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScreenDTO) {
    return this.screensService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete screen' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.delete(id);
  }

  @Post(':id/slots')
  @ApiOperation({ summary: 'Assign plugin instance to slot' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addSlot(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateScreenSlotDTO) {
    return this.screenSlotsService.create(id, dto);
  }

  @Delete(':screenId/slots/:slotId')
  @ApiOperation({ summary: 'Remove slot from screen' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeSlot(@Param('screenId', ParseIntPipe) screenId: number, @Param('slotId', ParseIntPipe) slotId: number) {
    return this.screenSlotsService.delete(screenId, slotId);
  }
}
