import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';

import { CreateScreenDTO } from './dto/create-screen.dto';
import { CreateScreenSlotDTO } from './dto/create-screen-slot.dto';
import { UpdateScreenDTO } from './dto/update-screen.dto';
import { ScreenSlotsService } from './screen-slots.service';
import { ScreensService } from './screens.service';

@Controller('screens')
export class ScreensController {
  constructor(
    private readonly screensService: ScreensService,
    private readonly screenSlotsService: ScreenSlotsService
  ) {}

  @Post()
  create(@Body() dto: CreateScreenDTO) {
    return this.screensService.create(dto);
  }

  @Get()
  findAll() {
    return this.screensService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.findById(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScreenDTO) {
    return this.screensService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.delete(id);
  }

  @Post(':id/slots')
  addSlot(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateScreenSlotDTO) {
    return this.screenSlotsService.create(id, dto);
  }

  @Delete(':screenId/slots/:slotId')
  removeSlot(@Param('screenId', ParseIntPipe) screenId: number, @Param('slotId', ParseIntPipe) slotId: number) {
    return this.screenSlotsService.delete(screenId, slotId);
  }
}
