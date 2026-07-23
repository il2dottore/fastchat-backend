import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthUserDto } from './dtos/auth.dto';
import { RegisterDto } from './dtos/register.dto';
import { error, getErrorMessage, success } from 'src/helpers/http.helper';
import { AuthService } from './auth.service';
import { TokenService } from 'src/shared/services/token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('login')
  async signIn(@Body() signInDto: AuthUserDto) {
    try {
      const authResult = await this.authService.auth(signInDto);
      const tokens = {
        accessToken: this.tokenService.signAccessToken(authResult._id!),
        refreshToken: this.tokenService.signRefreshToken(authResult._id!),
        user: authResult,
      };
      await this.authService.createSession(
        tokens.refreshToken,
        authResult._id!,
      );
      return success('Auth successfully', tokens);
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  @Post('logout')
  async signOut(@Body() signOutDto: { userId: string; refreshToken: string }) {
    try {
      await this.authService.signOut(signOutDto.refreshToken);
      console.log(signOutDto.userId, signOutDto.refreshToken);
      return success('Signed out');
    } catch (exception) {
      return error(getErrorMessage(exception));
    }
  }

  @Post('request-access-token')
  async requestAccessToken(@Body() body: { refreshToken: string }) {
    try {
      return success('This is your access token', {
        accessToken: await this.authService.requestAccessToken(
          body.refreshToken,
        ),
      });
    } catch (exception) {
      throw new HttpException(
        { success: false, message: getErrorMessage(exception), data: {} },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('request-password-code')
  async requestPasswordCode(@Body() body: { email: string }) {
    try {
      await this.authService.requestPasswordChangeCode(body.email);
      return success('Verification code sent to your email');
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  @Post('verify-password-code')
  async verifyPasswordCode(@Body() body: { email: string; code: string }) {
    try {
      await this.authService.verifyPasswordCode(body.email, body.code);
      return success('Code verified successfully');
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  @Post('change-password')
  async changePassword(
    @Body() body: { email: string; code: string; newPassword: string },
  ) {
    try {
      await this.authService.verifyAndChangePassword(
        body.email,
        body.code,
        body.newPassword,
      );
      return success('Password changed successfully. Please login again.');
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    try {
      await this.authService.register(registerDto);
      return success('Registration successful. Please verify your email.');
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  @Post('verify-registration')
  async verifyRegistration(@Body() body: { email: string; code: string }) {
    try {
      await this.authService.verifyRegistration(body.email, body.code);
      return success('Account verified successfully. You can now login.');
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  @Post('check-availability')
  async checkAvailability(@Body() body: { email: string; username: string }) {
    try {
      return success(
        'Availability check',
        await this.authService.checkAvailability(body.email, body.username),
      );
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }
}
