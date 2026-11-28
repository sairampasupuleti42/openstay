import { Injectable, inject } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { environment } from '../../../environments/environment';
import { BlockedUsersPage } from '../models/trust.model';

@Injectable({ providedIn: 'root' })
export class BlockService {
  private readonly app = inject(FirebaseApp);
  private functions?: ReturnType<typeof import('firebase/functions').getFunctions>;

  async block(uid: string): Promise<void> {
    const { sdk, functions } = await this.getFunctions();
    await sdk.httpsCallable<{ targetUid: string }, { blocked: true }>(functions, 'blockUser')({
      targetUid: uid,
    });
  }

  async blockRequest(requestId: string): Promise<void> {
    const { sdk, functions } = await this.getFunctions();
    await sdk.httpsCallable<{ requestId: string }, { blocked: true }>(
      functions,
      'blockRequestParticipant',
    )({ requestId });
  }

  async unblock(uid: string): Promise<void> {
    const { sdk, functions } = await this.getFunctions();
    await sdk.httpsCallable<{ targetUid: string }, { blocked: false }>(functions, 'unblockUser')({
      targetUid: uid,
    });
  }

  async list(cursor: string | null): Promise<BlockedUsersPage> {
    const { sdk, functions } = await this.getFunctions();
    return (await sdk.httpsCallable<
      { cursor: string | null },
      BlockedUsersPage
    >(functions, 'listBlockedUsers')({ cursor })).data;
  }

  errorMessage(error: unknown): string {
    return error instanceof Error && error.message.trim()
      ? error.message
      : 'Something went wrong. Please try again.';
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
