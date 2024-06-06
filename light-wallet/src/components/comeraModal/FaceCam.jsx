import React, { useRef, useEffect, useState } from "react";
import axios from "axios";
import { Button } from "antd";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import _debounce from "lodash/debounce";
import ReactBodymovin from "react-bodymovin";
import animation from "@/utils/data/bodymovin-animation.json";
import { AnimationWrapper } from "./cam.style";

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
	const { resolution, WebcamStarted, setWebcamStarted, isDetected, setIsDetected, setWebCamRef, WebCamRef, setCameraActiveType, CameraActiveType } = useWebcamContext();
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
			startFaceDetection(video, videoWidth, videoHeight);
		}
	};

	const startFaceDetection = (video, videoWidth, videoHeight) => {
		console.log("detection");
		const context = canvasRef.current.getContext("2d");
		intervalId.current = requestAnimationFrame(
			_debounce(async function detect() {
				const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
				console.log("detection...");
				if (detection) {
					console.log("detection true");

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

	// const stopCamera =  () => {
	// 	let stream = webcamRef.current.video.srcObject;
	// 	const tracks = stream.getTracks();

	// 	tracks.forEach(track => track.stop());
	// 	webcamRef.current.video.srcObject = null;

	// 	// setWebcamStarted(false);
	// 	setIsDetected(false)
	// };

	const stopFaceDetection = () => {
		if (intervalId.current) {
			cancelAnimationFrame(intervalId.current);
		}
	};

	const verifyWallet = async () => {
		setCameraActiveType(2);
	};

	const createWallet = () => {
		setCameraActiveType(1);
		// setWebcamStarted(true);
		setIsShowWebCam(true);
	};

	const stopCamera = () => {
		setIsShowWebCam(false);
		let stream = webcamRef.current.video.srcObject;
		const tracks = stream.getTracks();

		tracks.forEach(track => track.stop());
		webcamRef.current.video.srcObject = null;

		const context = canvasRef.current.getContext("2d");
		setWebcamStarted(false);
		setTimeout(() => {
			context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
		}, 1000);
	};
	const verifyUser = async () => {
		if (processingMode > 0) {
			return;
		}
		if (!WebcamStarted) setWebcamStarted(true);
		processingStart(2);
	};

	const processingStart = mode => {
		processingMode = mode;
		backendprocessing = 1;
		processingCount = 0;
		livenssCount = 0;
		prevRecogName = "";
		prevLiveness = 0;
		processingStartTime = new Date().getTime() / 1000;
		console.log("processingMode", processingMode);
	};

	useEffect(() => {
		console.log("webcarmstarted", WebcamStarted);
		if (!WebcamStarted) {
			stopFaceDetection();
		} else {
		}
	}, [WebcamStarted]);

	useEffect(() => {
		loadModels();
	}, []);

	return (
		<div style={{ margin: "auto", position: "absolute", top: 0, height: "100%" }}>
			{isShowWebCam ? (
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

			<AnimationWrapper>
				<Col xs={24} sm={18}>
					<ReactBodymovin options={bodymovinOptions} />
				</Col>
				<canvas style={View} ref={canvasRef} />
			</AnimationWrapper>
			<Row>
				<Col>
					<Button onClick={createWallet}>create wallet from face recognizing</Button>
				</Col>
				<Col>
					<Button onClick={verifyUser}>verify</Button>
				</Col>
				<Col>
					<Button onClick={stopCamera}>stop</Button>
				</Col>
			</Row>
		</div>
	);
};

export default FaceCam;
