// Stacks blockchain utilities and contract interaction helpers
import { StacksMainnet, StacksTestnet, StacksMocknet, type StacksNetwork } from '@stacks/network';
import { AppConfig, UserSession, openContractCall } from '@stacks/connect'; // Added imports
import {
  callReadOnlyFunction,
  cvToJSON,
  uintCV,
  principalCV,
  AnchorMode
} from '@stacks/transactions';

// --- Wallet and Network Configuration ---
// Network is selected from NEXT_PUBLIC_STACKS_NETWORK (testnet | mainnet | devnet);
// defaults to testnet so existing testnet deployments keep working.
export type StacksNetworkName = 'testnet' | 'mainnet' | 'devnet';

export const NETWORK_NAME: StacksNetworkName =
  (process.env.NEXT_PUBLIC_STACKS_NETWORK as StacksNetworkName) || 'testnet';

function resolveNetwork(name: StacksNetworkName): StacksNetwork {
  switch (name) {
    case 'mainnet':
      return new StacksMainnet();
    case 'devnet':
      // Local Clarinet/devnet exposes a mocknet-style node.
      return new StacksMocknet();
    case 'testnet':
    default:
      return new StacksTestnet();
  }
}

export const network: StacksNetwork = resolveNetwork(NETWORK_NAME);

// Standard wallet session setup
const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

// --- Contract Details ---
// Deployed contract address comes from NEXT_PUBLIC_CONTRACT_ADDRESS; the default
// is the current testnet deployment.
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1RVN5QPTET1RV9BJQX35JQWJFYG8YNHQEY5QN24';
export const CONTRACT_NAME = 'crowdfunding';

// --- Helper Functions ---

// Helper for read-only calls (No changes needed here)
export async function callContractReadOnly(functionName: string, functionArgs: any[] = []) {
  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName,
      functionArgs,
      network,
      // For read-only calls, we can use any valid address as the sender
      senderAddress: CONTRACT_ADDRESS 
    });
    return cvToJSON(result);
  } catch (error) {
    console.error('Contract read call failed:', error);
    throw error;
  }
}

// Helper for state-changing calls (This is the updated part)
export async function callContract(functionName: string, functionArgs: any[]) {
  try {
    await openContractCall({
      network,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName,
      functionArgs,
      anchorMode: AnchorMode.Any,
      onFinish: (data) => {
        console.log('Transaction signed and broadcasted!', data);
      },
      onCancel: () => {
        console.log('Transaction cancelled by user.');
      },
    });
  } catch (error) {
    console.error('Contract call failed:', error);
    throw error;
  }
}

// --- Contract-Specific Helpers (Updated to remove senderKey) ---
export const contractHelpers = {
  async getCampaignStatus() {
    return await callContractReadOnly('get-campaign-status');
  },

  async getTotal() {
    return await callContractReadOnly('get-total');
  },

  async getContribution(address: string) {
    return await callContractReadOnly('get-contribution', [principalCV(address)]);
  },

  async contribute(amount: number) { // senderKey removed
    const amountInMicroSTX = Math.floor(amount * 1000000);
    return await callContract('contribute', [uintCV(amountInMicroSTX)]);
  },

  async withdrawFunds() { // senderKey removed
    return await callContract('withdraw-funds', []);
  },

  async getRefund() { // senderKey removed
    return await callContract('get-refund', []);
  }
};