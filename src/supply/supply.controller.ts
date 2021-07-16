import { Controller, Req, Res, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { SupplyService } from './supply.service';
import { LoggerService } from '../logger/logger.service';

@Controller('supply')
@ApiTags('supply')
export class SupplyController {
  constructor(
    private readonly logger: LoggerService,
    private readonly supplyService: SupplyService,
  ) { }

  @Get('circulating')
  @ApiOperation({ summary: 'Get circulating supply' })
  @ApiQuery({ name: 'output', required: false, description: 'Flag for type of output', enum: ['raw'] })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 500, description: 'failed to get circulating supply' })
  async getCirculatingSupply(@Req() req: Request, @Res() res: Response): Promise<Response> {
    const isRaw = req.query.output === 'raw';

    try {
      const supply = await this.supplyService.getCirculatingSupply();

      if (isRaw) {
        return res.status(200).contentType('text/plain').send(supply);
      }

      return res.status(200).json({ circulatingSupply: supply });
    } catch (error) {
      return res.status(500).json({ error: `failed to get circulating supply: ${error}` });
    }

  }

  @Get('max')
  @ApiOperation({ summary: 'Get max supply' })
  @ApiQuery({ name: 'output', required: false, description: 'Flag for type of output', enum: ['raw'] })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 500, description: 'failed to get max supply' })
  async getMaxSupply(@Req() req: Request, @Res() res: Response): Promise<Response> {
    const isRaw = req.query.output === 'raw';

    try {
      const supply = await this.supplyService.getMaxSupply();

      if (isRaw) {
        return res.status(200).contentType('text/plain').send(supply);
      }

      return res.status(200).json({ maxSupply: supply });
    } catch (error) {
      return res.status(500).json({ error: `failed to get max supply: ${error}` });
    }

  }
}
