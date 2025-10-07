// Simple in-memory bridge so components without prop access can open the invitation modal instantly

let openModalFn: (() => void) | null = null;

export function registerInvitationModalOpener(fn: () => void) {
  openModalFn = fn;
}

export function openInvitationModal() {
  if (openModalFn) {
    openModalFn();
  }
}
