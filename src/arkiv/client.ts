import { createPublicClient, createWalletClient, http, custom } from "@arkiv-network/sdk"
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts"
import { mendoza } from "@arkiv-network/sdk/chains"

export function getPublicClient() {
  return createPublicClient({
    chain: mendoza,
    transport: http(),
  });
}

export function getWalletClientFromPrivateKey(privateKey: `0x${string}`) {
  return createWalletClient({
    chain: mendoza,
    transport: http(),
    account: privateKeyToAccount(privateKey),
  });
}

// Client-side: Create wallet client from MetaMask
// This should only be called in browser context
export function getWalletClientFromMetaMask(account: `0x${string}`) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not available - this function must be called in browser context');
  }
  
  return createWalletClient({
    chain: mendoza,
    transport: custom(window.ethereum),
    account,
  });
}

