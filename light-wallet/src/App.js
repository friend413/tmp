import "./App.less";
import React, { useState, useEffect, useRef } from "react";
import { InitAPI, Common, defaultConfig } from "cess-js-sdk-frontend";
import { sleep } from "./utils/common";
import store from "./utils/store";
import * as formatter from "./utils/formatter";
import * as antdHelper from "./utils/antd-helper";
import request from "./utils/request";
import * as faceapi from "face-api.js";

import moment from "moment";

import { Spin, Tooltip } from "antd";

import QrSvg from "@wojtekmaj/react-qr-svg";
import copy from "copy-to-clipboard";
import webconfig from "./webconfig";
//for evm
import { getMappingAccount, signAndSendEvm } from "evm-account-mapping-sdk";
import { custom, createWalletClient } from "viem";
import { mainnet } from "viem/chains";

import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useWalletClient, useFeeData, erc20ABI, useContractWrite, useBalance } from "wagmi";
import ReactBodymovin from "react-bodymovin";
// import Webcam from "react-webcam";

import animation from "./utils/data/bodymovin-animation.json";
import CamModal from "./components/comeraModal";

import { useWebcamContext } from "./hooks/useWebcam";
import { WebcamProvider } from "./context/webcam";
let unsubBalance = "";
let sdk = null;
let inputValue = {
	staking: { amount: 0, address: "" },
	send: { amount: 0, address: "" },
	nominate: { amount: 0, address: "" }
};
let walletClient;
let mappingAccount;
let pageIndex = 1;
let historyCount = 0;
let historyTotalPage = 0;
let isWaitingEvmConnect = true;
let historyTimeout = null;

function App() {
	const [loading, setLoading] = useState(null);
	const [connectStatus, setConnectStatus] = useState("--");
	const [current, setCurrent] = useState("login");
	const [boxTitle, setBoxTitle] = useState("Receive");
	const [accountType, setAccountType] = useState("polkdot");
	const [showAddressType, setShowAddressType] = useState("CESS");
	const [historys, setHhistorys] = useState();
	const [accouts, setAccouts] = useState([]);
	const [accout, setAccout] = useState({});
	const [balance, setBalance] = useState(0);
	const [available, setAvailable] = useState(0);
	const [staking, setStaking] = useState(0);
	const [nominate, setNominate] = useState(0);
	const [cessAddressFromFace, setCessAddressFromFace] = useState("");

	const [showCustomRPC, setShowCustomRPC] = useState(false);
	const [customRPC, setCustomRPC] = useState("");
	const [customRPCLoading, setCustomRPCLoading] = useState(false);
	const [isWebCamModalOpen, setIsWebCamModalOpen] = useState(false);

	const { setWebcamStarted, WebCamRef } = useWebcamContext();
	const [fileList, setFileList] = useState([]);
	const evmAccount = useAccount();
	const webcamRef = useRef(null);
	const videoConstraints = {
		width: 540,
		facingMode: "environment"
	};
	const bodymovinOptions = {
		loop: true,
		autoplay: true,
		prerender: true,
		animationData: animation
	};
	const onUserMedia = e => {
		console.log(e);
	};

	const onClick = e => {
		setCurrent(e);
		setBoxTitle(e);
	};

	useEffect(() => {
		console.log("REACT_APP_SERVER_URL", process.env.REACT_APP_SERVER_URL);
	}, []);

	useEffect(() => {
		let url = store.get("custom-node");
		if (url) {
			setCustomRPC(url);
		}
		init(url);
		autoLogin();
		historyTimeout = setInterval(function () {
			let addr = store.get("addr");
			if (addr && accout && accout.address) {
				loadHistoryList(addr);
			}
		}, 5000);

		// setTimeout(() => {
		// 	onBodymovin();
		// }, 3000);

		return () => {
			clearInterval(historyTimeout);
			if (unsubBalance) {
				unsubBalance();
			}
		};
	}, []);

	// const onBodymovin = () => {};
	const init = async url => {
		setConnectStatus("connecting...");
		try {
			let config = JSON.parse(JSON.stringify(webconfig.sdkConfig));
			if (url && url != "wss://testnet-rpc1.cess.cloud/ws/") {
				config.nodeURL = url;
			}
			const { api, keyring } = await InitAPI(config);
			if (api) {
				window.api = api;
				window.keyring = keyring;
				if (customRPC && url && url != "wss://testnet-rpc1.cess.cloud/ws/") {
					store.set("custom-node", url);
				}
			}
			setConnectStatus("connect success");
			console.log("rpc connect success");
			return { api, keyring };
		} catch (e) {
			setConnectStatus(e.message);
			console.log("has error");
			console.log(e);
		}
	};
	const autoLogin = async () => {
		let accountType = store.get("accountType");
		let addr = store.get("addr");
		if (!accountType || !addr) {
			return;
		}
		setCurrent("dashboard");
		setAccout({ address: addr, meta: {}, evmAddress: addr });
		loadHistoryList(addr);
		if (accountType == "polkdot") {
			connectPolkdotWallet(addr);
		} else {
			connectEvmWallet();
		}
	};
	const connectPolkdotWallet = async addr => {
		try {
			isWaitingEvmConnect = false;
			setLoading("login-polkdot");
			while (!window.api || !window.keyring) {
				await sleep(500);
			}
			setConnectStatus("opening wallet");
			sdk = new Common(window.api, window.keyring);
			let accounts = await sdk.getAccountsFromWallet();
			console.log(accounts);
			if (accounts.length > 0) {
				let acc = null;
				if (addr) {
					acc = accounts.find(t => t.address == addr);
				}
				if (!acc) {
					acc = await antdHelper.showSelectAccountBox(accounts);
				}
				acc.evmAddress = acc.sourAddress;
				setAccouts(accounts);
				setConnectStatus("login success");
				setAccout(acc);
				setCurrent("dashboard");
				setAccountType("polkdot");
				subBalance(acc.address);
				pageIndex = 1;
				loadHistoryList(acc.address);
				store.set("accountType", "polkdot");
				store.set("addr", acc.address);
			}
			setLoading(null);
			return accounts;
		} catch (e) {
			console.log(e);
			setCurrent("login");
		} finally {
			setLoading(null);
		}
	};
	const connectEvmWallet = async () => {
		try {
			isWaitingEvmConnect = false;
			setLoading("login-evm");
			while (!window.api || !window.keyring) {
				await sleep(500);
			}
			setConnectStatus("opening wallet");
			walletClient = createWalletClient({ chain: mainnet, transport: custom(window.ethereum) });
			const [address] = await walletClient.requestAddresses();
			console.log({ address, road: "there" });
			const SS58Prefix = webconfig.sdkConfig.keyringOption.ss58Format; // (window.api?.consts?.system?.ss58Prefix || 11330).toNumber();
			let ma = await getMappingAccount(window.api, walletClient, { address }, { SS58Prefix });
			mappingAccount = ma;
			let acc = ma;
			acc.address = ma.substrateAddress;
			setAccout(acc);
			setAccouts([acc]);
			setConnectStatus("login success");
			setAccountType("evm");
			setCurrent("dashboard");
			subBalance(acc.address);
			pageIndex = 1;
			loadHistoryList(acc.address);
			store.set("accountType", "evm");
			store.set("addr", acc.address);
		} catch (e) {
			console.log(e);
			setCurrent("login");
		} finally {
			setLoading(null);
		}
	};

	const createWalletTestFromFace = addr => {
		let addrFromFace = "cx000000000000000000";
		let subBalanceVal = 12321312312;
		let accounts = {};
		let acc = {};
		acc.address = addrFromFace;
		setAccout(acc);
		setAccouts([acc]);
		setConnectStatus("login success");
		setAccout(acc);
		setCurrent("dashboard");
		setAccountType("face");

		// subBalance(subBalanceVal);
		//temp subbalance
		setAvailable(0);
		setStaking(0);
		setNominate(0);
		setBalance(0);
		console.log("showAddressType", showAddressType);
		//end
		pageIndex = 1;
		loadHistoryList(acc.address);
		store.set("accountType", "face");
		store.set("addr", addrFromFace);
	};

	const subBalance = async address => {
		console.log("start sub banlace.");
		if (unsubBalance) {
			unsubBalance();
		}
		unsubBalance = await api.query.system.account(address, ({ nonce, data: balance }) => {
			console.log({ balance });
			let availableB = formatter.fixed(balance.free / 1e18);
			setAvailable(availableB);
			let stakingB = formatter.fixed(balance.reserved / 1e18);
			setStaking(stakingB);
			let nominateB = 0; //formatter.fixed(balance.frozen / 1e18);
			setNominate(nominateB);
			let all = availableB + stakingB + nominateB;
			console.log("banlace:", all);
			setBalance(all);
			loadHistoryList(address);
		});
		return unsubBalance;
	};

	const onCopy = txt => {
		console.log("copy ", txt);
		copy(txt);
		antdHelper.notiOK("Copied");
	};
	const onLogout = () => {
		if (unsubBalance) {
			unsubBalance();
		}
		antdHelper.notiOK("Logout success.");
		setAccout({});
		setCurrent("login");
		store.remove("accountType");
		store.remove("addr");
	};
	const subState = d => {
		console.log(d);
		if (typeof d == "string") {
			antdHelper.noti(d);
		}
		// else {
		// 	antdHelper.noti(d.status.toString());
		// }
	};
	const onSend = () => {
		try {
			let ret = formatParams(inputValue.send);
			if (!ret) {
				return;
			}
			let { address, amount } = ret;
			console.log({ address, amount });
			let extrinsic = window.api.tx.balances.transfer(address, amount);
			submitTx(extrinsic);
		} catch (e) {
			let msg = e.message;
			if (msg.includes("MultiAddress")) {
				msg = "Please input the correct amount and receiving address.";
			}
			antdHelper.alertError(msg);
		}
	};
	const onStaking = () => {
		try {
			let ret = formatParams(inputValue.staking);
			if (!ret) {
				return;
			}
			let { address, amount } = ret;
			let extrinsic = window.api.tx.sminer.increaseCollateral(address, amount);
			submitTx(extrinsic);
		} catch (e) {
			antdHelper.alertError(e.message);
		}
	};
	const onNominate = async () => {
		try {
			let ret = formatParams(inputValue.nominate);
			if (!ret) {
				return;
			}
			let { address, amount } = ret;
			let extrinsic = window.api.tx.staking.nominate([address]);
			ret = await submitTx(extrinsic, true);
			if (ret.msg == "ok") {
				extrinsic = window.api.tx.staking.bond(amount, "Staked");
				submitTx(extrinsic);
			}
		} catch (e) {
			antdHelper.alertError(e.message);
		}
	};
	const onInput = (e, k1, k2) => {
		// console.log('oninput', e, k1, k2);
		inputValue[k1][k2] = e.target.value;
	};
	const loadHistoryList = async addr => {
		let address = addr || accout.address;
		if (!address) {
			console.log("address is null ,jump to load history.");
			return;
		}
		// address = "cXffK7BmstE5rXcK8pxKLufkffp9iASMntxUm6ctpR6xS3icV";
		let url = `/transfer/query?Acc=${address}&pageindex=${pageIndex}&pagesize=${webconfig.historyPageSize}`;
		let ret = await request(url);
		console.log(ret);
		if (ret.msg != "ok") {
			return antdHelper.notiError(ret.msg);
		}
		if (!ret.data.content) {
			return antdHelper.notiError("API error");
		}
		let list = ret.data.content.map(t => {
			return {
				key: t.hash,
				amount: formatter.formatBalance(t.amount),
				type: t.from == address ? "Send" : "Receive",
				from: t.from,
				fromShort: formatter.formatAddress(t.from),
				to: t.to,
				toShort: formatter.formatAddress(t.to),
				time: moment(t.timestamp).format("YYYY/MM/DD HH:mm:ss")
			};
		});
		historyCount = ret.data.count;
		historyTotalPage = parseInt(historyCount / webconfig.historyPageSize);
		if (historyCount % webconfig.historyPageSize != 0) {
			historyTotalPage++;
		}
		setHhistorys(list);
	};
	const onNextHistoryPage = l => {
		pageIndex = pageIndex + l;
		loadHistoryList();
	};
	const formatParams = obj => {
		console.log(obj);
		if (!obj.amount) {
			antdHelper.alertError("Amount is required.");
			return null;
		}
		if (obj.amount.length > 29) {
			antdHelper.alertError("The amount character length exceeds the limit.");
			return null;
		}
		if (isNaN(obj.amount)) {
			antdHelper.alertError("The Amount allow only numbers input.");
			return null;
		}
		let amount = parseFloat(obj.amount);
		if (amount < 0) {
			antdHelper.alertError("Amount error.");
			return null;
		}
		if (amount > available) {
			console.log({ amount, available });
			antdHelper.alertError("Insufficient Balance");
			return;
		}
		amount = BigInt(amount * 1e18);

		// amount = amount * 1e18;
		if (!obj.address) {
			antdHelper.alertError("Account address is required.");
			return null;
		}
		if (obj.address.length < 40 || obj.address.length > 49) {
			antdHelper.alertError("Please input the correct receiving address.");
			return null;
		}
		return { address: obj.address, amount };
	};
	const backToDashboard = () => {
		inputValue = {
			staking: { amount: 0, address: "" },
			send: { amount: 0, address: "" },
			nominate: { amount: 0, address: "" }
		};
		let t1 = document.querySelectorAll(".textarea1");
		t1.forEach(t => (t.value = ""));
		t1 = document.querySelectorAll(".textarea2");
		t1.forEach(t => (t.value = ""));
		setCurrent("dashboard");
		loadHistoryList();
	};
	const submitTx = async (extrinsic, hideSuccessTips) => {
		let ret = "";
		try {
			setLoading("signature");
			if (accountType == "polkdot" || accountType == "face") {
				ret = await sdk.signAndSend(accout.address, extrinsic, subState);
			} else {
				const result = await signAndSendEvm(extrinsic, window.api, walletClient, mappingAccount);
				const trId = result.status.asInBlock.toHex();
				ret = { msg: "ok", data: trId };
			}
			if (ret.msg == "ok") {
				if (!hideSuccessTips) {
					if (current == "Nominate") {
						antdHelper.alertOk("The Nomination is submitted.");
					} else {
						antdHelper.alertOk("The transaction is submitted.");
					}
					backToDashboard();
				}
			} else {
				antdHelper.alertError(ret.msg);
			}
		} catch (e) {
			console.log(e);
			let msg = e.message || e;
			if (typeof msg == "object") {
				msg = JSON.stringify(msg);
			}
			if (msg.includes("balance too low")) {
				antdHelper.alertError("Insufficient Balance");
			} else {
				antdHelper.alertError(msg);
			}
		} finally {
			setLoading(null);
		}
		return ret;
	};
	const onSelectAccountForInput = async () => {
		let acc = await antdHelper.showSelectAccountBox(accouts);
		inputValue = {
			staking: { amount: 0, address: acc.address },
			send: { amount: 0, address: acc.address },
			nominate: { amount: 0, address: acc.address }
		};
		let t1 = document.querySelectorAll(".textarea2");
		t1.forEach(t => (t.value = acc.address));
	};
	const onInputNodeRPC = e => {
		setCustomRPC(e.target.value);
	};
	const onReConnect = async e => {
		setCustomRPCLoading(true);
		let timeout = setTimeout(function () {
			setCustomRPCLoading(false);
			antdHelper.alertError("Connect timeout");
		}, 5000);
		let { api } = await init(customRPC);
		clearTimeout(timeout);
		setCustomRPCLoading(false);
		if (api) {
			antdHelper.notiOK("Connected");
			setShowCustomRPC(false);
		} else {
			antdHelper.alertError("Connect failed");
		}
	};

	const handleModalOpen = () => {
		// setWebcamStarted(true);
		setIsWebCamModalOpen(true);
	};
	const handleModalClose = () => {
		setWebcamStarted(false);
		setIsWebCamModalOpen(false);
	};

	const captureImage = () => {
		const imageSrc = WebCamRef.getScreenshot();
		const uuid = crypto.randomUUID();
		handleModalClose();
	};

	const onPlay = () => {
		return "";
	};

	// const setCessAddr = (addr) => {
	// 	setCessAddressFromFace(addr);
	// }

	return (
		<div className="App">
			<a className="header" href="/">
				Back
			</a>
			<div className="hold"></div>
			{loading == "login-evm" || loading == "login-polkdot" ? (
				<div className="top-loading">
					<Spin size="small" /> connecting...
				</div>
			) : (
				""
			)}
			<div className={current == "login" ? "login" : "none"}>
				<div className="title">Connect to</div>
				<div className="login-btns">
					{evmAccount && evmAccount.address ? (
						<div className="btn1" onClick={connectEvmWallet}>
							{loading == "login-evm" ? (
								<div className="icons">
									<Spin />
								</div>
							) : (
								<div className="icons">
									<span className="icon1"></span>
									<span className="icon2"></span>
									<span className="icon3"></span>
									<span className="icon4"></span>
									{/* <ConnectButton
										showBalance={false}
										accountStatus='avatar'
										chainStatus="none"
									/> */}
								</div>
							)}
							<label>{loading == "login-evm" ? connectStatus : "EVM Wallet"}</label>
						</div>
					) : (
						<div className="btn1">
							{loading == "login-evm" ? (
								<div className="icons">
									<Spin />
								</div>
							) : evmAccount && evmAccount.address ? (
								<div className="icons">Connect success</div>
							) : (
								<div className="icons">
									{/* <span className="icon1"></span>
										<span className="icon2"></span>
										<span className="icon3"></span>
										<span className="icon4"></span> */}
									<ConnectButton showBalance={false} accountStatus="avatar" chainStatus="none" />
								</div>
							)}
							<label>{loading == "login-evm" ? connectStatus : "EVM Wallet"}</label>
						</div>
					)}
					<div className="btn1" onClick={connectPolkdotWallet}>
						{loading == "login-polkdot" ? (
							<div className="icons">
								<Spin />
							</div>
						) : (
							<div className="icons">
								<span className="icon11"></span>
								<span className="icon12"></span>
							</div>
						)}
						<label>{loading == "login-polkdot" ? connectStatus : "Polkadot Wallet"}</label>
					</div>
				</div>
				<div className="webcam-box" onClick={handleModalOpen}>
					<div className="title">create wallet from recognizing face</div>
				</div>
				<div className="webcam-box">
					<div className="title">Test of create wallet from recognizing face</div>
				</div>
				<CamModal isModalOpen={isWebCamModalOpen} handleModalClose={handleModalClose} captureImage={captureImage} setCessAddr={createWalletTestFromFace} />
			</div>
			<div className={current == "dashboard" ? "dashboard" : "none"}>
				<div className="b1">
					<div className="btn" onClick={onLogout}></div>
					<div className="line l1">{formatter.toLocaleString(balance)} CESS</div>
					<div className="line l2">Balance</div>
					<div className="line l3">
						<span className="txt">{formatter.formatAddressLong(showAddressType == "CESS" ? accout.address : accout.evmAddress)} </span>
						<label className="icon" onClick={() => onCopy(showAddressType == "CESS" ? accout.address : accout.evmAddress)}></label>
					</div>
					<div className={accountType == "evm" ? "line l4" : "none"} onClick={() => setShowAddressType(showAddressType == "CESS" ? "EVM" : "CESS")}>
						<label className="icon"></label>
						<span className="txt">Show the {showAddressType == "CESS" ? "EVM" : "CESS"} address</span>
					</div>
					<div className={accountType == "polkdot" ? "line l4" : "none"} onClick={() => setShowAddressType(showAddressType == "CESS" ? "EVM" : "CESS")}>
						<label className="icon"></label>
						<span className="txt">Show the {showAddressType == "CESS" ? "Substrate" : "CESS"} address</span>
					</div>
					<div className={accountType == "face" ? "line l4" : "none"}>
						<label className="icon"></label>
						<span className="txt">Show the CESS address</span>
					</div>
				</div>
				<div className="b2">
					<div className="btn-box btn1" onClick={() => onClick("Send")}>
						Send
					</div>
					<div className="btn-box btn2" onClick={() => onClick("Receive")}>
						Receive
					</div>
					<div className="btn-box btn3" onClick={() => onClick("Staking")}>
						Staking
					</div>
					<div className="btn-box btn4" onClick={() => onClick("Nominate")}>
						Nominate
					</div>
				</div>
				<div className="b3">
					<div className="b3-t">Asset Analysis</div>
					<div className="tb">
						<div className="tr">
							<span>Available</span>
							<label>{formatter.toLocaleString(available)} CESS</label>
						</div>
						<div className="tr">
							<span>Staking</span>
							<label>{formatter.toLocaleString(staking)} CESS</label>
						</div>
						<div className="tr">
							<span>Nominate</span>
							<label>{formatter.toLocaleString(nominate)} CESS</label>
						</div>
					</div>
				</div>
				<div className="b4">
					<div className="t1">History</div>
					<div className="tb">
						{historys &&
							historys.map(t => {
								return (
									<div className="tr" key={t.key}>
										<div className="left">
											<span className="amount">
												<Tooltip title={t.type == "Send" ? "-" + t.amount : "+" + t.amount}>
													<span className="o-text">
														{t.type == "Send" ? "-" : "+"}
														{t.amount}
													</span>
												</Tooltip>
											</span>
											<label className="type">{t.type}</label>
										</div>
										<div className="right">
											<span title="copy" onClick={() => onCopy(t.from)}>
												From {t.fromShort}
											</span>
											<label title="copy" onClick={() => onCopy(t.to)}>
												To {t.toShort}
											</label>
											<font>{t.time}</font>
										</div>
									</div>
								);
							})}
						{!historys || historys.length == 0 ? <div className="no-data">No data</div> : ""}
					</div>
					<div className={historys && historys.length && historyTotalPage > 1 ? "pager" : "none"}>
						<div className={pageIndex == 1 ? "none" : "pre"} onClick={() => onNextHistoryPage(-1)}></div>
						<div className={pageIndex >= historyTotalPage ? "none" : "next"} onClick={() => onNextHistoryPage(1)}></div>
					</div>
				</div>
			</div>
			<div className={"Send,Receive,Staking,Nominate".includes(current) ? "box-out" : "none"}>
				<div className="box">
					<div className="top-header">
						<div className="back" onClick={backToDashboard}></div>
						{boxTitle}
					</div>
					<div className={current == "Send" ? "send" : "none"}>
						<div className="myinput">
							<div className="tips">
								<span>Receiving Address</span>
								<label className={accountType == "polkdot" && accouts && accouts.length > 1 ? "none" : "none"} onClick={onSelectAccountForInput}>
									+
								</label>
							</div>
							<textarea
								maxLength={49}
								onChange={e => onInput(e, "send", "address")}
								onInput={e => onInput(e, "send", "address")}
								placeholder="cX"
								className="textarea2"></textarea>
						</div>
						<div className="myinput">
							<div className="tips">Amount(CESS)</div>
							<textarea
								typeof="number"
								maxLength={29}
								onChange={e => onInput(e, "send", "amount")}
								onInput={e => onInput(e, "send", "amount")}
								placeholder="0"
								className="textarea1"></textarea>
						</div>
						<div className="t1">Balance: {formatter.toLocaleString(available)} CESS</div>
						{loading == "signature" ? (
							<div className="btn btn-disabled">
								<Spin size="small" />
								&nbsp;&nbsp;Loading...
							</div>
						) : (
							<div className="btn" onClick={onSend}>
								Signature
							</div>
						)}
					</div>
					<div className={current == "Receive" ? "receive" : "none"}>
						<div className="qr">{accout?.address && <QrSvg value={accout?.address} />}</div>
						<div className="show-address">
							<div className="tips">Receiving Address</div>
							<div className="address">{accout?.address}</div>
							<div className="btn-copy" onClick={() => onCopy(accout?.address)}></div>
						</div>
					</div>
					<div className={current == "Staking" ? "staking" : "none"}>
						<div className="myinput">
							<div className="tips">
								<span>Storage Miner Account</span>
								<label className={accountType == "polkdot" && accouts && accouts.length > 1 ? "none" : "none"} onClick={onSelectAccountForInput}>
									+
								</label>
							</div>
							<textarea
								maxLength={49}
								onChange={e => onInput(e, "staking", "address")}
								onInput={e => onInput(e, "staking", "address")}
								placeholder="cX"
								className="textarea2"></textarea>
						</div>
						<div className="myinput">
							<div className="tips">Staking Amount(CESS)</div>
							<textarea
								typeof="number"
								maxLength={29}
								onChange={e => onInput(e, "staking", "amount")}
								onInput={e => onInput(e, "staking", "amount")}
								placeholder="0"
								className="textarea1"></textarea>
						</div>
						<div className="t1">Balance: {formatter.toLocaleString(available)} CESS</div>
						{loading == "signature" ? (
							<div className="btn btn-disabled">
								<Spin size="small" />
								&nbsp;&nbsp;Loading...
							</div>
						) : (
							<div className="btn" onClick={onStaking}>
								Signature
							</div>
						)}
					</div>
					<div className={current == "Nominate" ? "nominate" : "none"}>
						<div className="myinput">
							<div className="tips">
								<span>Consensus Account</span>
								<label className={accountType == "polkdot" && accouts && accouts.length > 1 ? "none" : "none"} onClick={onSelectAccountForInput}>
									+
								</label>
							</div>
							<textarea
								maxLength={49}
								onChange={e => onInput(e, "nominate", "address")}
								onInput={e => onInput(e, "nominate", "address")}
								onKeyPress={e => onInput(e, "nominate", "address")}
								placeholder="cX"
								className="textarea2"></textarea>
						</div>
						<div className="myinput">
							<div className="tips">Staking Amount(CESS)</div>
							<textarea
								typeof="number"
								maxLength={29}
								onChange={e => onInput(e, "nominate", "amount")}
								onInput={e => onInput(e, "nominate", "amount")}
								onKeyPress={e => onInput(e, "nominate", "amount")}
								placeholder="0"
								className="textarea1"></textarea>
						</div>
						<div className="t1">Balance: {formatter.toLocaleString(available)} CESS</div>
						{loading == "signature" ? (
							<div className="btn btn-disabled">
								<Spin size="small" />
								&nbsp;&nbsp;Loading...
							</div>
						) : (
							<div className="btn" onClick={onNominate}>
								Signature
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
