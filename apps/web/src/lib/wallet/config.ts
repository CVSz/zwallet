import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { base, mainnet, sepolia } from "wagmi/chains";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "00000000000000000000000000000000";

export const wagmiConfig = getDefaultConfig({
  appName: "zWallet Treasury",
  projectId: walletConnectProjectId,
  chains: [mainnet, base, sepolia],
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
  },
});
