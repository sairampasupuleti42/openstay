import { Injectable, inject } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { environment } from '../../../environments/environment';
import { HostingRequestDetails, HostingRequestInput, HostingRequestPage } from '../models/hosting-request.model';

@Injectable({ providedIn: 'root' })
export class HostingRequestService {
  private readonly app = inject(FirebaseApp);
  private functions?: ReturnType<typeof import('firebase/functions').getFunctions>;

  async create(input: HostingRequestInput): Promise<{ requestId: string }> {
    const { sdk, functions } = await this.getFunctions();
    return (await sdk.httpsCallable<HostingRequestInput, { requestId: string }>(functions, 'createHostingRequest')(input)).data;
  }

  async list(kind: 'mine' | 'incoming', cursor: string | null): Promise<HostingRequestPage> {
    const { sdk, functions } = await this.getFunctions();
    const name = kind === 'mine' ? 'listTravellerHostingRequests' : 'listHostHostingRequests';
    return (await sdk.httpsCallable<{ cursor: string | null }, HostingRequestPage>(functions, name)({ cursor })).data;
  }

  async details(requestId: string): Promise<HostingRequestDetails> {
    const { sdk, functions } = await this.getFunctions();
    return (await sdk.httpsCallable<{ requestId: string }, HostingRequestDetails>(functions, 'getHostingRequest')({ requestId })).data;
  }

  async decide(requestId: string, action: 'accept' | 'decline' | 'cancel'): Promise<void> {
    const { sdk, functions } = await this.getFunctions();
    await sdk.httpsCallable<{ requestId: string; action: typeof action }, { status: string }>(
      functions, 'decideHostingRequest',
    )({ requestId, action });
  }

  errorMessage(error: unknown): string {
    return error instanceof Error && error.message.trim() ? error.message : 'Something went wrong. Please try again.';
  }

  private async getFunctions() {
    const sdk = await import('firebase/functions');
    if (!this.functions) {
      this.functions = sdk.getFunctions(this.app, 'us-central1');
      if (environment.useEmulators) sdk.connectFunctionsEmulator(this.functions, '127.0.0.1', 5001);
    }
    return { sdk, functions: this.functions };
  }
}
