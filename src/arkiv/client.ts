import { createPublicClient, createWalletClient, http, custom } from "@arkiv-network/sdk"
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts"
import { mendoza } from "@arkiv-network/sdk/chains"

// Get RPC URL from environment, fallback to Mendoza default
const getRpcUrl = () => {
  return process.env.ARKIV_RPC_URL || mendoza.rpcUrls.default.http[0];
};

// Configure http transport with timeout (30 seconds)
const getHttpTransport = () => {
  return http(getRpcUrl(), {
    timeout: 30000, // 30 seconds
    retryCount: 2,
    retryDelay: 1000,
  });
};

export function getPublicClient() {
  return createPublicClient({
    chain: mendoza,
    transport: getHttpTransport(),
  });
}

export function getWalletClientFromPrivateKey(privateKey: `0x${string}`) {
  return createWalletClient({
    chain: mendoza,
    transport: getHttpTransport(),
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

