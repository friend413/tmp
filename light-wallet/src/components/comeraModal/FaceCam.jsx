import React, { useRef, useEffect, useState } from "react";
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
const SERVER_ADDR = "https://fowin.anonid.io";

const FaceCam = () => {
	const webcamRef = useRef(null);
	const canvasRef = useRef(null);
	const intervalId = useRef(null);
	const [isModelLoaded, setIsModelLoaded] = useState(false);
	const { resolution, WebcamStarted, setWebcamStarted, setIsDetected, setWebCamRef } = useWebcamContext();
	console.log(process.env.PUBLIC_URL + "/model/");

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
		console.log("processingmode", processingMode);
		console.log();
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
		const context = canvasRef.current.getContext("2d");
		intervalId.current = requestAnimationFrame(
			_debounce(async function detect() {
				const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
				setIsDetected(detections.length > 0);
				if (canvasRef.current.width > 0 && canvasRef.current.height > 0) {
					const resizedDetections = faceapi.resizeResults(detections, {
						width: videoWidth,
						height: videoHeight
					});
					context.clearRect(0, 0, videoWidth, videoHeight);
					faceapi.draw.drawDetections(context, resizedDetections);
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

	const enrollUser = async () => {
		if (processingMode > 0) {
			return;
		}
		setWebcamStarted(true);
		processingStart(0);
	};

	const verifyUser = async () => {
		if (processingMode > 0) {
			return;
		}
		if (!WebcamStarted) setWebcamStarted(true);
		processingStart(2);
	};

	const requestEnroll = () => {};

	const requestVerify = () => {};

	const stopCamera = async () => {
		setWebcamStarted(false);
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
		if (!WebcamStarted) {
			stopFaceDetection();
		} else {
			handleWebcamStream();
		}
	}, [WebcamStarted]);

	useEffect(() => {
		loadModels();
	}, []);

	return (
		<div style={{ margin: "auto", position: "absolute", top: 0, height: "100%" }}>
			<Webcam
				audio={false}
				height={resolution.height}
				width={MainWidth}
				videoConstraints={{ width: MainWidth, height: resolution.height }}
				style={View}
				onLoadedMetadata={handleWebcamStream}
				ref={webcamRef}
			/>
			<AnimationWrapper>
				<Col xs={24} sm={12}>
					<ReactBodymovin options={bodymovinOptions} />
				</Col>
				<canvas style={View} ref={canvasRef} />
			</AnimationWrapper>
			<Row>
				<Col>
					<Button onClick={enrollUser}>enroll</Button>
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
