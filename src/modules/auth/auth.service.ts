import { Injectable } from '@nestjs/common';
import { FilterOperators, MongoEntityManager, ObjectId } from 'typeorm';
import { AuthToken } from './schemas/auth-token.schema';
import { UserService } from '../user/user.service';
import { AuthUserDto } from './dtos/auth.dto';
import { RegisterDto } from './dtos/register.dto';
import { User, UserStatus } from '../user/schemas/user.schema';
import bcrypt from 'bcrypt';
import { TokenService } from 'src/shared/services/token.service';

import { MailService } from 'src/shared/services/mail.service';
import { VerificationCode } from './schemas/verification-code.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly entityManager: MongoEntityManager,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly mailService: MailService,
  ) {}

  // Insert session (Access token and refresh token) to database.
  async createSession(refreshToken: string, userId: ObjectId) {
    const authToken = new AuthToken();
    authToken.refreshToken = refreshToken;
    authToken.userId = userId;
    await this.entityManager.save(authToken);
  }

  async auth(authUserDto: AuthUserDto): Promise<Partial<User>> {
    const user = await this.userService.find({
      where: {
        email: authUserDto.email,
      },
    });
    if (user.length !== 1)
      throw new Error('No user associated with this email address');
    const authResult = await bcrypt.compare(
      authUserDto.password,
      user[0].password,
    );
    if (authResult) {
      const { password: _password, ...authUser } = user[0];
      void _password;
      return authUser;
    } else throw new Error('Login credentials did not match');
  }

  async requestAccessToken(refreshToken: string) {
    console.log('Called AuthService.requestAccessToken();');
    const pipeline = [
      {
        $match: {
          refreshToken: refreshToken,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
    ];
    const authTokenPair = this.entityManager.aggregate<
      AuthToken,
      AuthToken & { user: User }
    >(AuthToken, pipeline);
    const result = await authTokenPair.toArray();
    if (0 === result.length)
      throw new Error(
        `requestAccessToken: No refresh token ${refreshToken} found`,
      );
    return this.tokenService.signAccessToken(result[0].user._id);
  }

  async signOut(refreshToken: string) {
    await this.entityManager.deleteOne(AuthToken, {
      refreshToken: refreshToken,
    });
  }

  async requestPasswordChangeCode(email: string) {
    const user = await this.userService.find({ where: { email: email } });
    if (user.length === 0) throw new Error('User not found');

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save code
    const verificationCode = new VerificationCode();
    verificationCode.email = email;
    verificationCode.code = code;
    verificationCode.createdAt = new Date();
    verificationCode.expiresAt = expiresAt;

    await this.entityManager.save(verificationCode);

    // Send email
    await this.mailService.sendVerificationCode(email, code);
  }

  async verifyPasswordCode(
    email: string,
    code: string,
  ): Promise<VerificationCode> {
    const verification = await this.entityManager.findOne(VerificationCode, {
      where: {
        email: email,
        code: code,
        expiresAt: { $gt: new Date() } as FilterOperators<Date>,
      },
    });

    if (!verification) throw new Error('Invalid or expired verification code');
    return verification;
  }

  async verifyAndChangePassword(
    email: string,
    code: string,
    newPassword: string,
  ) {
    const verification = await this.verifyPasswordCode(email, code);

    const user = await this.userService.find({ where: { email: email } });
    if (user.length === 0) throw new Error('User not found');
    const userId = user[0]._id;

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.entityManager.update(User, userId, {
      password: hashedPassword,
    });

    // Delete used code
    await this.entityManager.deleteOne(VerificationCode, {
      _id: verification._id,
    });

    // Invalidate all sessions for this user
    await this.entityManager.deleteMany(AuthToken, { userId: userId });
  }

  async register(registerDto: RegisterDto) {
    const user = await this.userService.create({
      ...registerDto,
      avatarUrl: null as unknown as string,
      lastOnline: null as unknown as Date,
      userStatus: null as unknown as UserStatus,
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const verificationCode = new VerificationCode();
    verificationCode.email = registerDto.email;
    verificationCode.code = code;
    verificationCode.createdAt = new Date();
    verificationCode.expiresAt = expiresAt;
    await this.entityManager.save(verificationCode);

    await this.mailService.sendRegistrationVerificationCode(
      registerDto.email,
      code,
    );

    return user;
  }

  async verifyRegistration(email: string, code: string) {
    const verification = await this.verifyPasswordCode(email, code);
    await this.userService.verifyUser(email);
    await this.entityManager.deleteOne(VerificationCode, {
      _id: verification._id,
    });
  }

  async checkAvailability(email: string, username: string) {
    return this.userService.checkAvailability(email, username);
  }
}
