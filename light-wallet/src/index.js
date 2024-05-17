import { BrowserRouter } from "react-router-dom";
import '@rainbow-me/rainbowkit/styles.css';
import "react-app-polyfill/ie9";
import "react-app-polyfill/stable";
import { ConfigProvider } from "antd";
import React from "react";
import ReactDOM from "react-dom";
import "./index.less";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import enGB from "antd/lib/locale/en_GB";

import { getDefaultWallets, connectorsForWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import {
	arbitrum,
	base,
	mainnet,
	optimism,
	polygon,
	sepolia,
	zora,
	goerli
} from 'wagmi/chains';
import { metaMaskWallet, okxWallet, tokenPocketWallet, imTokenWallet, coinbaseWallet, bitKeepWallet } from '@rainbow-me/rainbowkit/wallets';


const projectId = '1f3ddfd28be419ce4cbd99c03397f94d';
const appName = 'test';

// const { chains, publicClient, webSocketPublicClient } = configureChains(
//   [
//     // goerli,
//     mainnet,
//     polygon,
//     optimism,
//     arbitrum,
//     base,
//     zora,
//     ...(process.env.REACT_APP_ENABLE_TESTNETS === 'true' ? [sepolia] : []),
//   ],
//   [publicProvider()]
// );
const { chains, publicClient, webSocketPublicClient } = configureChains(
	[arbitrum],
	[publicProvider()]
);



// const { connectors } = getDefaultWallets({
//   appName: 'test',
// 	projectId: '1f3ddfd28be419ce4cbd99c03397f94d',
//   chains,
// });

const connectors2 = connectorsForWallets([
	{
		groupName: 'Recommended',
		wallets: [
			metaMaskWallet({ projectId, chains }),
			coinbaseWallet({ appName, chains }),
			okxWallet({ projectId, chains }),
			imTokenWallet({ projectId, chains }),
			tokenPocketWallet({ projectId, chains }),
			bitKeepWallet({ projectId, chains })
		],
	},
]);

const wagmiConfig = createConfig({
	autoConnect: true,
	connectors: connectors2,
	publicClient,
	webSocketPublicClient,
});



ReactDOM.render(
	<ConfigProvider locale={enGB}>
		<WagmiConfig config={wagmiConfig}>
			<RainbowKitProvider chains={chains} locale="en-US" modalSize="compact">
				<App />
			</RainbowKitProvider>
		</WagmiConfig>
	</ConfigProvider>,
	document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

