import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

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
  @ApiOperation({
    summary: 'Create screen',
    description:
      'Creates a new screen for the authenticated user. A screen represents a layout template ' +
      'with dimensions and optional device assignment. Slots can be added after creation.',
  })
  @ApiBody({ type: CreateScreenDTO })
  @ApiCreatedResponse({ type: ScreenResponseDto, description: 'Screen created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateScreenDTO, @Req() req: { user: { userId: number } }) {
    return this.screensService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all screens',
    description: 'Returns all screens owned by the authenticated user.',
  })
  @ApiOkResponse({ type: ScreenResponseDto, isArray: true, description: 'List of screens' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.screensService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get screen by ID',
    description: 'Returns a single screen with its slots, scoped to the authenticated user.',
  })
  @ApiOkResponse({ type: ScreenResponseDto, description: 'Screen details' })
  @ApiResponse({ status: 404, description: 'Screen not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.findById(id);
  }

  @Get(':id/slots')
  @ApiOperation({
    summary: 'List slots for screen',
    description: 'Returns all slots assigned to a screen, ordered by renderOrder.',
  })
  @ApiOkResponse({ type: ScreenSlotResponseDto, isArray: true, description: 'List of screen slots' })
  @ApiResponse({ status: 404, description: 'Screen not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findSlots(@Param('id', ParseIntPipe) id: number) {
    return this.screenSlotsService.findByScreenId(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update screen',
    description:
      'Updates screen properties: name, dimensions, device assignment, palette, render mode, ' +
      'refresh rate, or active status. Setting deviceId to null detaches the screen from its device.',
  })
  @ApiBody({ type: UpdateScreenDTO })
  @ApiOkResponse({ type: ScreenResponseDto, description: 'Updated screen' })
  @ApiResponse({ status: 404, description: 'Screen not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScreenDTO) {
    return this.screensService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete screen',
    description:
      'Permanently deletes a screen and its slot assignments. Device association is removed. ' +
      'This action is not reversible.',
  })
  @ApiResponse({ status: 200, description: 'Screen deleted' })
  @ApiResponse({ status: 404, description: 'Screen not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.delete(id);
  }

  @Post(':id/slots')
  @ApiOperation({
    summary: 'Assign plugin instance to slot',
    description:
      'Creates a new slot on a screen, associating a plugin instance with a position ' +
      '(x, y, width, height, z-index) and render order.',
  })
  @ApiBody({ type: CreateScreenSlotDTO })
  @ApiCreatedResponse({ type: ScreenSlotResponseDto, description: 'Slot created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addSlot(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateScreenSlotDTO) {
    return this.screenSlotsService.create(id, dto);
  }

  @Patch(':screenId/slots/:slotId')
  @ApiOperation({
    summary: 'Update slot layout/position',
    description: 'Updates the position, size, z-index, or render order of an existing slot.',
  })
  @ApiBody({ type: UpdateScreenSlotDTO })
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
  @ApiOperation({
    summary: 'Remove slot from screen',
    description: 'Removes a slot from a screen. The plugin instance is not deleted, only unassigned from the slot.',
  })
  @ApiResponse({ status: 200, description: 'Slot removed' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeSlot(@Param('screenId', ParseIntPipe) screenId: number, @Param('slotId', ParseIntPipe) slotId: number) {
    return this.screenSlotsService.delete(screenId, slotId);
  }
}
