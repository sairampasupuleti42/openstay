import { Injectable, inject } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { environment } from '../../../environments/environment';
import {
  HostingRequestDetails,
  HostingRequestInput,
  HostingRequestPage,
  StayCompletionState,
} from '../models/hosting-request.model';

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

  async initiateCompletion(requestId: string): Promise<StayCompletionState> {
    return this.completionCall('initiateStayCompletion', requestId);
  }

  async confirmCompletion(requestId: string): Promise<StayCompletionState> {
    return this.completionCall('confirmStayCompletion', requestId);
  }

  async disputeCompletion(requestId: string): Promise<StayCompletionState> {
    return this.completionCall('disputeStayCompletion', requestId);
  }

  async submitReview(
    requestId: string,
    rating: number,
    text: string,
  ): Promise<{ reviewId: string; submitted: true }> {
    const { sdk, functions } = await this.getFunctions();
    return (await sdk.httpsCallable<
      { requestId: string; rating: number; text?: string },
      { reviewId: string; submitted: true }
    >(functions, 'submitStayReview')({
      requestId,
      rating,
      ...(text.trim() ? { text } : {}),
    })).data;
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

  private async completionCall(
    name: 'initiateStayCompletion' | 'confirmStayCompletion' | 'disputeStayCompletion',
    requestId: string,
  ): Promise<StayCompletionState> {
    const { sdk, functions } = await this.getFunctions();
    return (await sdk.httpsCallable<
      { requestId: string },
      StayCompletionState
    >(functions, name)({ requestId })).data;
  }
}
