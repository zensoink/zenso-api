import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateScreenDTO } from './dto/create-screen.dto';
import { CreateScreenSlotDTO } from './dto/create-screen-slot.dto';
import { ScreenResponseDto } from './dto/screen-response.dto';
import { ScreenSlotResponseDto } from './dto/screen-slot-response.dto';
import { UpdateScreenDTO } from './dto/update-screen.dto';
import { UpdateScreenSlotDTO } from './dto/update-screen-slot.dto';
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
  @ApiCreatedResponse({ type: ScreenResponseDto, description: 'Screen created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateScreenDTO, @Req() req: { user: { userId: number } }) {
    return this.screensService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all screens' })
  @ApiOkResponse({ type: ScreenResponseDto, isArray: true, description: 'List of screens' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.screensService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get screen by ID' })
  @ApiOkResponse({ type: ScreenResponseDto, description: 'Screen details' })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.findById(id);
  }

  @Get(':id/slots')
  @ApiOperation({ summary: 'List slots for screen' })
  @ApiOkResponse({ type: ScreenSlotResponseDto, isArray: true, description: 'List of screen slots' })
  @ApiResponse({ status: 404, description: 'Screen not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findSlots(@Param('id', ParseIntPipe) id: number) {
    return this.screenSlotsService.findByScreenId(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update screen' })
  @ApiOkResponse({ type: ScreenResponseDto, description: 'Updated screen' })
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
  @ApiCreatedResponse({ type: ScreenSlotResponseDto, description: 'Slot created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addSlot(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateScreenSlotDTO) {
    return this.screenSlotsService.create(id, dto);
  }

  @Patch(':screenId/slots/:slotId')
  @ApiOperation({ summary: 'Update slot layout/position' })
  @ApiOkResponse({ type: ScreenSlotResponseDto, description: 'Updated slot' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateSlot(
    @Param('screenId', ParseIntPipe) screenId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body() dto: UpdateScreenSlotDTO
  ) {
    return this.screenSlotsService.update(screenId, slotId, dto);
  }

  @Delete(':screenId/slots/:slotId')
  @ApiOperation({ summary: 'Remove slot from screen' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeSlot(@Param('screenId', ParseIntPipe) screenId: number, @Param('slotId', ParseIntPipe) slotId: number) {
    return this.screenSlotsService.delete(screenId, slotId);
  }
}
