import { Environments, IEventParams } from './utils/types';
import { encryptWithFormattedResponse } from './utils/encryptflow';

export class FingerprintApi {
  environment: Environments;

  environmentLinks:any = {
    [Environments.Local]: 'http://localhost:8000',
  };
  baseLink: string;
  apiLinks: Record<string, Function> = {
    local: () => `${this.baseLink}/fingerprint/local`,
    newDevice: () => `${this.baseLink}/fingerprint/new-device`,
    eventCreate: () => `${this.baseLink}/fingerprint/event/create`,
    eventUpdate: () => `${this.baseLink}/fingerprint/event/update`,
  };
  constructor({
    environment = Environments.Local,
  }: {
    environment?: Environments;
  }) {
    this.environment = environment;
    this.baseLink = this.environmentLinks[this.environment];
  }

  async addNewDevice({ deviceParams, deviceHash, cryptocookie }: { deviceParams: Record<string, string>; deviceHash: string; cryptocookie: string }) {
    const fingerprintData = await fetch(this.apiLinks.newDevice(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceHash,
        deviceParams,
        cryptocookie,
      }),
    });

    return fingerprintData.json();
  }

  async createEvent(
    { eventType, eventResult, signals = [], userId }: IEventParams,
    { deviceHash, cryptoCookie }: { deviceHash: string; cryptoCookie: string },
  ) {
    const { ciphertext, publicKey, iv, salt } = await encryptWithFormattedResponse({
      eventType,
      eventResult,
      signals,
      userId,
      deviceHash,
      cryptoCookie,
    });

    const request = await fetch(this.apiLinks.createEvent(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientEncryptionKey: publicKey,
        encryptedPayload: ciphertext,
        iv,
        salt,
      }),
    });

    const requestData = await request.json();

    return requestData;
  }

  async getKnownDeviceData(devicehash: string, cryptocookie: string) {
    const fingerprintData = await fetch(this.apiLinks.me(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        devicehash,
        cryptocookie,
      },
    });

    const body = await fingerprintData.json();
    if (!body.result) throw new Error(body.error.message);
    return body;
  }
}
