import 'dotenv/config';
import { createWalletClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { mendoza } from "@arkiv-network/sdk/chains";
const privateKey = process.env.ARKIV_PRIVATE_KEY;
if (!privateKey) {
    throw new Error('Missing env var: ARKIV_PRIVATE_KEY');
}
const walletClient = createWalletClient({
    chain: mendoza,
    transport: http(),
    account: privateKeyToAccount(privateKey),
});
const enc = new TextEncoder();
const { entityKey: profileKey } = await walletClient.createEntity({
    payload: enc.encode(JSON.stringify({
        name: 'Alex',
        bio: 'Solidity developer and mentor',
        wallet: walletClient.account.address,
    })),
    contentType: 'application/json',
    attributes: [
        { key: 'type', value: 'profile' },
        { key: 'version', value: '1' },
    ],
    expiresIn: 31536000, // 1 year
});
console.log('Profile key:', profileKey);
const { entityKey: skillsKey } = await walletClient.createEntity({
    payload: enc.encode(JSON.stringify({
        skills: ['solidity', 'typescript', 'react'],
        levels: { solidity: 'advanced', typescript: 'intermediate', react: 'beginner' },
    })),
    contentType: 'application/json',
    attributes: [
        { key: 'type', value: 'skills' },
        { key: 'wallet', value: walletClient.account.address },
    ],
    expiresIn: 31536000,
});
console.log('Skills key:', skillsKey);
const { entityKey: availabilityKey } = await walletClient.createEntity({
    payload: enc.encode(JSON.stringify({
        timezone: 'America/Buenos_Aires',
        available: true,
    })),
    contentType: 'application/json',
    attributes: [
        { key: 'type', value: 'availability' },
        { key: 'wallet', value: walletClient.account.address },
        { key: 'role', value: 'mentor' },
    ],
    expiresIn: 2592000, // 30 days
});
console.log('Availability key:', availabilityKey);
