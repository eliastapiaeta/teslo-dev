import { Controller, Get, Post, Body, UseGuards, Req, Headers, SetMetadata } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IncomingHttpHeaders } from 'http';

import { AuthService } from './auth.service';
import { RawHeaders, GetUser, Auth } from './decorators';
import { RoleProtected } from './decorators/role-protected.decorator';

import { CreateUserDto, LoginUserDto } from './dto';
import { User } from './entities/user.entity';
import { UserRoleGuard } from './guards/user-role.guard';
import { ValidRoles } from './interfaces';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  public createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  public loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Get('check-auth-status')
  @Auth()
  public checkAuthStatus(
    @GetUser() user: User
  ) {
    return this.authService.checkAuthStatus( user );
  }

  @Get('private')
  @UseGuards( AuthGuard() )
  public testingPrivateRoute(
    @Req() request: Express.Request,
    @GetUser() user: User,
    @GetUser('email') userEmail: string,
    
    @RawHeaders() rawHeaders: string[],
    @Headers() headers: IncomingHttpHeaders,
  ) {

    return {
      ok: true,
      message: 'Hola Mundo Private',
      user,
      userEmail,
      rawHeaders,
      headers
    }
  }


  // @SetMetadata('roles', ['admin','super-user'])

  @Get('private2')
  @RoleProtected( ValidRoles.superUser, ValidRoles.admin )
  @UseGuards( AuthGuard(), UserRoleGuard )
  public privateRoute2(
    @GetUser() user: User
  ) {

    return {
      ok: true,
      user
    }
  }

  @Get('private3')
  @Auth( ValidRoles.admin )
  public privateRoute3(
    @GetUser() user: User
  ) {

    return {
      ok: true,
      user
    }
  }
}
