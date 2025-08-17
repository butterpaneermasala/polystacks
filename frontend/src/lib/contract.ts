import { NETWORK, CONTRACT_ADDRESS, CONTRACT_NAME } from './constants';
import * as tx from '@stacks/transactions';

async function openCall(options: any): Promise<void> {
  const mod: any = await import('@stacks/connect');
  return mod.openContractCall(options);
}

export async function roGetMarket(id: number) {
  const callRO: any = (tx as any).callReadOnlyFunction || (tx as any).fetchCallReadOnlyFunction;
  if (!callRO) throw new Error('No read-only function available in @stacks/transactions');
  const res = await callRO({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-market',
    functionArgs: [tx.uintCV(id)],
    network: NETWORK,
    senderAddress: CONTRACT_ADDRESS,
  });
  return tx.cvToJSON(res);
}

export function callCreateMarket(params: {
  question: string;
  deadline: number;
  resolver: string;
  feeBps: number;
  feeRecipient: string;
}): Promise<void> {
  const { question, deadline, resolver, feeBps, feeRecipient } = params;
  return openCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'create-market',
    functionArgs: [
      tx.stringUtf8CV(question),
      tx.uintCV(deadline),
      tx.standardPrincipalCV(resolver),
      tx.uintCV(feeBps),
      tx.standardPrincipalCV(feeRecipient),
    ],
    postConditionMode: tx.PostConditionMode.Deny,
    onFinish: () => {},
    onCancel: () => { throw new Error('User canceled'); },
  });
}

export function callStakeYes(id: number, amount: number): Promise<void> {
  return openCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'stake-yes',
    functionArgs: [tx.uintCV(id), tx.uintCV(amount)],
    postConditionMode: tx.PostConditionMode.Deny,
    onFinish: () => {},
    onCancel: () => { throw new Error('User canceled'); },
  });
}

export function callStakeNo(id: number, amount: number): Promise<void> {
  return openCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'stake-no',
    functionArgs: [tx.uintCV(id), tx.uintCV(amount)],
    postConditionMode: tx.PostConditionMode.Deny,
    onFinish: () => {},
    onCancel: () => { throw new Error('User canceled'); },
  });
}

export function callResolve(id: number, outcome: boolean): Promise<void> {
  return openCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'resolve',
    functionArgs: [tx.uintCV(id), outcome ? tx.trueCV() : tx.falseCV()],
    postConditionMode: tx.PostConditionMode.Deny,
    onFinish: () => {},
    onCancel: () => { throw new Error('User canceled'); },
  });
}

export function callWithdraw(id: number): Promise<void> {
  return openCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'withdraw',
    functionArgs: [tx.uintCV(id)],
    postConditionMode: tx.PostConditionMode.Deny,
    onFinish: () => {},
    onCancel: () => { throw new Error('User canceled'); },
  });
}

export function callWithdrawFee(id: number): Promise<void> {
  return openCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'withdraw-fee',
    functionArgs: [tx.uintCV(id)],
    postConditionMode: tx.PostConditionMode.Deny,
    onFinish: () => {},
    onCancel: () => { throw new Error('User canceled'); },
  });
}
