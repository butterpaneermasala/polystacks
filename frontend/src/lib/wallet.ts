import { AppConfig, UserSession } from '@stacks/auth';
import { showConnect } from '@stacks/connect';

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

export function isSignedIn() {
  return userSession.isUserSignedIn();
}

export function getAddress(): string | null {
  if (!isSignedIn()) return null;
  const profile = userSession.loadUserData();
  // The wallet provides STX addresses per network
  // For testnet:
  // @ts-ignore
  return profile?.profile?.stxAddress?.testnet || null;
}

export function connectWallet() {
  return new Promise<void>((resolve, reject) => {
    showConnect({
      userSession,
      appDetails: { name: 'Polystacks', icon: window.location.origin + '/favicon.svg' },
      onFinish: () => resolve(),
      onCancel: () => reject(new Error('User canceled connect')),
    });
  });
}

export function signOut() {
  userSession.signUserOut();
}
