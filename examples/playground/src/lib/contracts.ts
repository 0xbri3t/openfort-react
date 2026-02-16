import { baseSepolia, beamTestnet, polygonAmoy } from 'wagmi/chains'

/** Chain IDs supported for mint contracts */
const BEAM_CHAIN_ID = beamTestnet.id
const POLYGON_CHAIN_ID = polygonAmoy.id
const BASE_SEPOLIA_CHAIN_ID = baseSepolia.id

/** Fallback addresses when env vars are not set */
const DEFAULT_BEAM_MINT = '0x45238AB60ACA6862a70fe996D1A8baDb71Af5A8f'
const DEFAULT_POLYGON_MINT = '0xef147ed8bb07a2a0e7df4c1ac09e96dec459ffac'

/** Contract type: Beam uses claim(amount), Polygon uses mint(address, amount) */
type MintContractType = 'claim' | 'mint'

export interface MintContractConfig {
  address: string
  type: MintContractType
}

/**
 * Returns the mint contract address for the given chainId.
 * Beam Testnet: VITE_BEAM_MINT_CONTRACT (claim interface)
 * Polygon Amoy / Base Sepolia: VITE_POLYGON_MINT_CONTRACT (mint interface)
 */
export function getMintContractAddress(chainId: number | undefined): string | undefined {
  if (chainId == null) return undefined
  if (chainId === BEAM_CHAIN_ID) {
    return import.meta.env.VITE_BEAM_MINT_CONTRACT ?? DEFAULT_BEAM_MINT
  }
  if (chainId === POLYGON_CHAIN_ID || chainId === BASE_SEPOLIA_CHAIN_ID) {
    return import.meta.env.VITE_POLYGON_MINT_CONTRACT ?? DEFAULT_POLYGON_MINT
  }
  return import.meta.env.VITE_POLYGON_MINT_CONTRACT ?? DEFAULT_POLYGON_MINT
}

/**
 * Returns a full MintContractConfig for the given chainId.
 * Use this when you need to know whether to call claim() or mint().
 */
export function getMintContractConfig(chainId: number | undefined): MintContractConfig | undefined {
  const address = getMintContractAddress(chainId)
  if (!address) return undefined
  return {
    address,
    type: chainId === BEAM_CHAIN_ID ? 'claim' : 'mint',
  }
}
