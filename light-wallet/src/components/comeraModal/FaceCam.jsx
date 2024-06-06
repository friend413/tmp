import React, { useRef, useEffect, useState } from "react";
import axios from "axios";
import { Button } from "antd";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import _debounce from "lodash/debounce";
import ReactBodymovin from "react-bodymovin";
import animation from "@/utils/data/bodymovin-animation.json";
import { AnimationWrapper } from "./cam.style";
import * as antdHelper from "@/utils/antd-helper";
import { Notification } from "@/components/Notification";

import { Row, Col } from "antd";
import { useWebcamContext } from "@/hooks/useWebcam";
var processingMode = 0;
var backendprocessing = 0;
var processingStartTime = 0;
var processingCount = 0;
var livenssCount = 0;
var prevRecogName = 0;
var prevLiveness = 0;
var lv;
const ENROLL_TIMEOUT = 15;
const VERIFY_TIMEOUT = 15;
// const SERVER_ADDR = "https://fowin.anonid.io";
const SERVER_ADDR = "http://192.168.145.172:8889/";

const FaceCam = () => {
	const webcamRef = useRef(null);
	const canvasRef = useRef(null);
	const intervalId = useRef(null);
	const [isModelLoaded, setIsModelLoaded] = useState(false);
	const [isShowWebCam, setIsShowWebCam] = useState(false);
	const [CameraActiveType, setCameraActiveType] = useState(0);
	const { resolution, WebcamStarted, setWebcamStarted, isDetected, setIsDetected, setWebCamRef, WebCamRef } = useWebcamContext();
	let MainWidth = resolution.width;
	const width = window && window?.innerWidth;
	let View = { position: "absolute" };
	if (width < 716) {
		MainWidth = width - 76;
	}

	if (width < 400) {
		View = {
			...View,
			width: "calc(100% - 41px)",
			height: "unset"
		};
	}

	const bodymovinOptions = {
		loop: true,
		autoplay: true,
		prerender: true,
		animationData: animation
	};
	const loadModels = async () => {
		try {
			const MODEL_URL = process.env.PUBLIC_URL + "/model/";
			await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
			console.log("Models loaded successfully");
			setIsModelLoaded(true);
		} catch (error) {
			console.error("Error loading models:", error);
			alert("Model was not loaded.");
		}
	};

	const handleWebcamStream = async () => {
		if (webcamRef.current && webcamRef.current.video.readyState === 4) {
			setWebCamRef(webcamRef.current);
			const video = webcamRef.current.video;
			const videoWidth = webcamRef.current.video.videoWidth;
			const videoHeight = webcamRef.current.video.videoHeight;
			webcamRef.current.video.width = videoWidth;
			webcamRef.current.video.height = videoHeight;
			canvasRef.current.width = videoWidth;
			canvasRef.current.height = videoHeight;
			setTimeout(() => {
				startFaceDetection(video, videoWidth, videoHeight);
			}, 1500);
		}
	};

	const startFaceDetection = (video, videoWidth, videoHeight) => {
		console.log("detection");
		const context = canvasRef.current.getContext("2d");
		intervalId.current = requestAnimationFrame(
			_debounce(async function detect() {
				const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
				if (detection) {
					setIsDetected(true);

					if (canvasRef.current.width > 0 && canvasRef.current.height > 0) {
						const resizedDetections = faceapi.resizeResults(detection, {
							width: videoWidth,
							height: videoHeight
						});
						context.clearRect(0, 0, videoWidth, videoHeight);
						faceapi.draw.drawDetections(context, resizedDetections);
					}
				}
				intervalId.current = requestAnimationFrame(detect);
			}, 1000) // Debounce time in milliseconds
		);
	};

	const stopFaceDetection = () => {
		if (intervalId.current) {
			cancelAnimationFrame(intervalId.current);
		}
	};

	const verifyUser = async () => {
		setCameraActiveType(2);
		setIsDetected(false);
	};

	const createWallet = () => {
		setIsDetected(false);
		setCameraActiveType(1);
	};

	const stopCamera = () => {
		let stream = webcamRef.current.video.srcObject;
		const tracks = stream.getTracks();

		tracks.forEach(track => track.stop());
		webcamRef.current.video.srcObject = null;

		const context = canvasRef.current.getContext("2d");
		setTimeout(() => {
			context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
		}, 1000);
		setCameraActiveType(0);
	};
	const intervalTime = 3000;
	const enroll = () => {
		console.log("call create wallet func");
		// antdHelper.alertError(msg);
		// antdHelper.notiOK("Logout success.");

		const imgSrc = WebCamRef.getScreenshot();
		axios
			.post(process.env.REACT_APP_SERVER_URL + "/create_wallet", {
				image: imgSrc
			})
			.then(res => {
				console.log("res", res);
				if (res.status == 200) {
					const resStateText = res.data.status;
					if (resStateText == "Success") {
						antdHelper.notiOK("Face Vector Read Successfully. Thanks for using Anon ID, no further action needed, verify at conference for access. ");

						stopCamera();
						// handleModalClose();
						// setProcessStatus(3);
						// setWebcamStarted(false);
					} else if (resStateText == "Already Exist") {
						antdHelper.noti("Face Vector Already Registered. Please Verify.");
						stopCamera();

						// setProcessStatus(3);
					} else if (resStateText == "Move Closer") {
						// Notification('warning', '', 'Please Move Closer!');
						antdHelper.noti("Please Move Closer!");
					} else if (resStateText == "Go Back") {
						antdHelper.noti("Please Move Back!");
					} else if (resStateText == "Liveness check failed") {
						antdHelper.noti("Liveness check failed!");
					} else if (resStateText == "Spoof") {
					} else {
						console.log("Error");
					}

					if (resStateText != "Success" && resStateText != "Already Exist") {
						// setProcessStatus(2)
						setTimeout(() => {
							enroll();
						}, intervalTime);
					}
				} else {
					setTimeout(() => {
						enroll();
					}, intervalTime);
				}
			})
			.catch(err => {
				console.log("err", err);
				antdHelper.noti("Server Error. Please contact dev team");

				setTimeout(() => {
					enroll();
				}, intervalTime);
			});
	};
	const verify = () => {
		const imgSrc = WebCamRef.getScreenshot();
		console.log("call get wallet func");
		axios
			.post(process.env.REACT_APP_SERVER_URL + "/get_wallet", {
				image: imgSrc
			})
			.then(res => {
				console.log("res", res);
				if (res.status == 200) {
					const resStateText = res.data.status;
					if (resStateText == "Success") {
						antdHelper.notiOK("Face Vector Verified' ");
						debugger;
						console.log("jwt token", res.data.token);
						setCessAddr(res.data.address);
						handleModalClose();
					} else if (resStateText == "No Users") {
						antdHelper.noti("info", "", "Face Vector not Registered. Please enroll.");
					} else if (resStateText == "Move Closer") {
						antdHelper.noti("Please Move Closer!");
					} else if (resStateText == "Go Back") {
						antdHelper.noti("Please Move Back!");
					} else {
						antdHelper.noti("Error");
					}

					if (resStateText != "Success") {
						setTimeout(() => {
							verify();
						}, intervalTime);
					}
				} else {
					setTimeout(() => {
						verify();
					}, intervalTime);
				}
			})
			.catch(err => {
				console.log("err", err);
				antdHelper.noti("Server Error. Please contact dev team.");

				setTimeout(() => {
					verify();
				}, intervalTime);
			});
	};

	useEffect(() => {
		console.log("webcarmstarted", WebcamStarted);
		if (!WebcamStarted) {
			stopFaceDetection();
			setIsDetected(false);
		} else {
		}
	}, [WebcamStarted]);

	useEffect(() => {
		loadModels();
	}, []);

	useEffect(() => {
		if (CameraActiveType != 0) {
			setWebcamStarted(true);
		} else {
			setWebcamStarted(false);
		}
		console.log("is Detected", isDetected);
		if (isDetected) {
			if (CameraActiveType == 1) {
				enroll();
			} else if (CameraActiveType == 2) {
				verify();
			} else {
			}
		}
	}, [isDetected, CameraActiveType]);

	useEffect(() => {
		return () => {
			stopFaceDetection();
			setIsDetected(false);
			stopCamera();
		};
	}, []);
	return (
		<div style={{ margin: "auto", position: "absolute", top: 0, height: "100%" }}>
			{/* {isShowWebCam ? ( */}
			{WebcamStarted ? (
				<Webcam
					audio={false}
					height={resolution.height}
					width={MainWidth}
					videoConstraints={{ width: MainWidth, height: resolution.height }}
					style={View}
					onLoadedMetadata={handleWebcamStream}
					ref={webcamRef}
				/>
			) : (
				<></>
			)}
			{/* ):(<></>)} */}
			<AnimationWrapper>
				<Col xs={24} sm={18} style={{ opacity: 0.3 }}>
					<ReactBodymovin options={bodymovinOptions} />
				</Col>
				<canvas style={View} ref={canvasRef} />
			</AnimationWrapper>
			<Row>
				<Col>
					<Button onClick={createWallet}>enroll</Button>
				</Col>
				<Col>
					<Button onClick={verifyUser}>verify</Button>
				</Col>

				<Col>{WebcamStarted ? <Button onClick={stopCamera}>stop</Button> : <></>}</Col>
			</Row>
		</div>
	);
};

export default FaceCam;
