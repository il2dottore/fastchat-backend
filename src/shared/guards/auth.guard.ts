import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { error } from 'src/helpers/http.helper';
import { User } from 'src/modules/user/schemas/user.schema';
import { MongoEntityManager } from 'typeorm';
import { TokenService } from '../services/token.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly entityManager: MongoEntityManager,
        private readonly tokenService: TokenService,
    ) { }
    async canActivate(
        context: ExecutionContext,
    ): | Promise<boolean> {
        console.log("AuthGuard - canActivate");
        const request = context.switchToHttp().getRequest();
        const accessToken = this.extractTokenFromHeader(request);
        if (!accessToken) {
            throw new HttpException(
                { success: false, message: 'BLANK_TOKEN', data: {} },
                HttpStatus.UNAUTHORIZED,
            );
        }
        try {
            const payload = this.tokenService.decodeAccessToken(accessToken);
            const user = await this.entityManager.findOne(User, {
                where: {
                    _id: new ObjectId(payload.sub)
                }
            });
            if (null === user) {
                throw new HttpException(
                    { success: false, message: 'AUTH_ERROR: user with this ID does not exist', data: {} },
                    HttpStatus.UNAUTHORIZED,
                );
            }
            request.user = user;
            return true;
        } catch (exception) {
            throw new HttpException('AUTH_ERROR: ' + exception.message, HttpStatus.UNAUTHORIZED);
        }
    }
    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}