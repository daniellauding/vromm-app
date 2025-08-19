// Lightweight relationship/invitation debug logger

type DebugEvent =
  | 'invite:start'
  | 'invite:success'
  | 'invite:error'
  | 'pending:loaded'
  | 'incoming:loaded'
  | 'modal:show'
  | 'modal:close'
  | 'modal:accept'
  | 'modal:decline'
  | 'notification:new'
  | 'badge:update'
  | 'publicProfile:buttonState';

export function relDebug(event: DebugEvent, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`REL[${event}] @ ${ts}`, data || {});
}

// Convenience wrappers
export const relLog = {
  inviteStart: (fromUserId: string, toUserId: string, relationshipType: string) =>
    relDebug('invite:start', { fromUserId, toUserId, relationshipType }),
  inviteSuccess: (invitationId?: string) => relDebug('invite:success', { invitationId }),
  inviteError: (message: string) => relDebug('invite:error', { message }),
  pendingLoaded: (count: number) => relDebug('pending:loaded', { count }),
  incomingLoaded: (count: number) => relDebug('incoming:loaded', { count }),
  modalShow: (invitationId: string) => relDebug('modal:show', { invitationId }),
  modalClose: () => relDebug('modal:close'),
  modalAccept: (invitationId: string) => relDebug('modal:accept', { invitationId }),
  modalDecline: (invitationId: string) => relDebug('modal:decline', { invitationId }),
  notificationNew: (type: string, id?: string) => relDebug('notification:new', { type, id }),
  badgeUpdate: (unread: number) => relDebug('badge:update', { unread }),
  publicProfileButtonState: (userId: string, state: string) =>
    relDebug('publicProfile:buttonState', { userId, state }),
};


