import * as StacksNet from '@stacks/network';

export const CONTRACT_ADDRESS = 'ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK';
export const CONTRACT_NAME = 'polystacks';
// @ts-expect-error StacksTestnet is available at runtime; type export mismatch in current typings
export const NETWORK = new (StacksNet as any).StacksTestnet({ url: 'https://api.testnet.hiro.so' });
