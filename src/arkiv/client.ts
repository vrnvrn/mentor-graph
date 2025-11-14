import 'dotenv/config';
import { createPublicClient, createWalletClient, http } from "@arkiv-network/sdk"
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts"
import { mendoza } from "@arkiv-network/sdk/chains"

export function getPublicClient() {
  return createPublicClient({
    chain: mendoza,
    transport: http(),
  });
}

export function getWalletClient() {
  const privateKey = process.env.ARKIV_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Missing env var: ARKIV_PRIVATE_KEY');
  }
  return createWalletClient({
    chain: mendoza,
    transport: http(),
    account: privateKeyToAccount(privateKey as `0x${string}`),
  });
}

