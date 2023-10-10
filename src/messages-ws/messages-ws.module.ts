import { Module } from '@nestjs/common';
import { MessageWsService } from './messages-ws.service';
import { MessageWsGateway } from './messages-ws.gateway';

import { AuthModule } from '../auth/auth.module';

@Module({
  providers: [MessageWsGateway, MessageWsService],
  imports: [ AuthModule ]
})
export class MessageWsModule {}
