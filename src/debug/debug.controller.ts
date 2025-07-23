import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('debug')
export class DebugController {
    @Get('dump-db')
    dump(@Res() res: Response) {
        const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
        if (fs.existsSync(dbPath)) {
            res.download(dbPath, 'dev.db');
        } else {
            res.status(404).send('No DB file found.');
        }
    }
}
