import { TestBed } from '@angular/core/testing';
import { FirebaseApp } from '@angular/fire/app';
import { vi } from 'vitest';
import { HostingRequestService } from './hosting-request.service';

const mocks = vi.hoisted(() => ({ getFunctions: vi.fn(), httpsCallable: vi.fn(), connectFunctionsEmulator: vi.fn() }));
vi.mock('firebase/functions', async (original) => ({
  ...await original<typeof import('firebase/functions')>(),
  ...mocks,
}));

describe('HostingRequestService', () => {
  it('uses the participant-specific callables and forwards their results and errors', async () => {
    const call = vi.fn().mockResolvedValue({ data: { items: [], nextCursor: null } });
    mocks.getFunctions.mockReturnValue({});
    mocks.httpsCallable.mockReturnValue(call);
    TestBed.configureTestingModule({ providers: [HostingRequestService, { provide: FirebaseApp, useValue: {} }] });
    const service = TestBed.inject(HostingRequestService);
    expect(await service.list('mine', null)).toEqual({ items: [], nextCursor: null });
    expect(mocks.httpsCallable).toHaveBeenLastCalledWith(expect.anything(), 'listTravellerHostingRequests');
    await service.list('incoming', 'cursor');
    expect(mocks.httpsCallable).toHaveBeenLastCalledWith(expect.anything(), 'listHostHostingRequests');
    expect(call).toHaveBeenLastCalledWith({ cursor: 'cursor' });
    call.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(service.details('id')).rejects.toThrow('Unavailable');
  });
});
