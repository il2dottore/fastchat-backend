import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ObjectId } from 'mongodb';
import { getErrorMessage } from 'src/helpers/http.helper';

interface AccessTokenPayload {
  iat: number;
  exp: number;
  sub: string;
  type: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}
  // JWT token functions
  signAccessToken(userId: ObjectId) {
    const accessToken = {
      iat: Math.floor(Date.now() / 1000),
      // 15 minutes
      exp: Math.floor(Date.now() / 1000) + 900,
      sub: userId.toString(),
      type: 'access',
    };
    return this.jwtService.sign(accessToken);
  }

  signRefreshToken(userId: ObjectId) {
    const refreshToken = {
      iat: Math.floor(Date.now() / 1000),
      // 7 days
      exp: Math.floor(Date.now() / 1000) + 604_800,
      sub: userId.toString(),
      type: 'refresh',
    };
    return this.jwtService.sign(refreshToken);
  }

  decodeAccessToken(accessToken: string): AccessTokenPayload {
    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(accessToken);
      return {
        iat: payload.iat,
        exp: payload.exp,
        sub: payload.sub,
        type: payload.type,
      };
    } catch (exception) {
      throw new Error(getErrorMessage(exception));
    }
  }
}
