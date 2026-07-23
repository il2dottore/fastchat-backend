import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { BatchResponse } from 'firebase-admin/messaging';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class NotificationService implements OnModuleInit {
  private isFirebaseInitialized = false;

  onModuleInit() {
    try {
      const serviceAccountPath = path.join(
        process.cwd(),
        'firebase-service-account.json',
      );

      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(
          fs.readFileSync(serviceAccountPath, 'utf8'),
        );

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        this.isFirebaseInitialized = true;
        console.log('Firebase Admin initialized successfully');
      } else {
        console.warn(
          'Firebase service account file not found at:',
          serviceAccountPath,
        );
        console.warn('Push notifications will be disabled.');
      }
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: any,
  ): Promise<string | undefined> {
    if (!this.isFirebaseInitialized) {
      console.warn('Firebase not initialized. Skipping notification.');
      return;
    }

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: token,
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
      return response;
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  async sendToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: any,
  ): Promise<BatchResponse | undefined> {
    if (!this.isFirebaseInitialized || tokens.length === 0) {
      return;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`${response.successCount} messages were sent successfully`);
      return response;
    } catch (error) {
      console.error('Error sending multicast notification:', error);
    }
  }
}
