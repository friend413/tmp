import React, { useRef, useEffect, useState } from "react";

import { Modal, Button, Spin, Row, Col } from "antd";
import Axios from "axios";
// import FaceCam from "./FaceCam";
import { useWebcamContext } from "@/hooks/useWebcam";
import { SpinWrapper, ModalContent } from "./cam.style";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import _debounce from "lodash/debounce";
import ReactBodymovin from "react-bodymovin";
import { AnimationWrapper } from "./cam.style";

import animation from "@/utils/data/bodymovin-animation.json";
import { Notification } from "@/components/Notification";
import * as antdHelper from "@/utils/antd-helper";

const CamModal = ({ title = "Capture face", buttonText = "Capture", isModalOpen, handleModalClose, captureImage, extra = false, setCessAddr }) => {
	// const { resolution, isDetected, WebCamRef} = useWebcamContext();
	const { resolution, WebcamStarted, setWebcamStarted, isDetected, setIsDetected, setWebCamRef, WebCamRef } = useWebcamContext();
	const { width, height } = resolution;

	const webcamRef = useRef(null);
	const canvasRef = useRef(null);
	const intervalId = useRef(null);
	const [isModelLoaded, setIsModelLoaded] = useState(false);
	const [isActiveButton, setIsActiveButton] = useState(false);
	const [selectButton, setSelectButton] = useState(null);
	const [isEnrollSpinActive, setEnrollSpinActive] = useState(false);
	const [isVerifySpinActive, setVerifySpinActive] = useState(false);
	let intervalEnroll = null;
	let intervalVerify = null;
	const intervalTime = 3000;

	let MainWidth = resolution.width;
	const widthCam = window && window?.innerWidth;
	let View = { position: "absolute" };
	if (widthCam < 716) {
		MainWidth = width - 76;
	}

	if (widthCam < 400) {
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
		console.log("handlewebcamStream.................");
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
				try {
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
				} catch (e) {
					console.error("Error during face detection: ", e);
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

	const enrollUser = () => {
		setSelectButton("enroll");
		setEnrollSpinActive(true);
		setVerifySpinActive(false);
		if (!WebcamStarted) {
			setWebcamStarted(true);
		}
		intervalEnroll = setInterval(() => {
			enrollRequest();
		}, intervalTime);
	};

	const enrollRequest = () => {
		console.log("call create wallet func");
		const imgSrc = WebCamRef.getScreenshot();
		Axios.post(process.env.REACT_APP_SERVER_URL + "/create_wallet", {
			image: imgSrc
		})
			.then(res => {
				console.log("res", res);
				if (res.status == 200) {
					const resStateText = res.data.status;
					if (resStateText == "Success") {
						antdHelper.notiOK("Face Vector Read Successfully. Thanks for using Anon ID, no further action needed, verify at conference for access. ");
						clearInterval(intervalEnroll);

						setEnrollSpinActive(false);
					} else if (resStateText == "Already Exist") {
						antdHelper.noti("Face Vector Already Registered. Please Verify.");
						clearInterval(intervalEnroll);
						setEnrollSpinActive(false);
					} else if (resStateText == "Move Closer") {
						antdHelper.noti("Please Move Closer!");
					} else if (resStateText == "Go Back") {
						antdHelper.noti("Please Move Back!");
					} else if (resStateText == "Liveness check failed") {
						antdHelper.noti("Liveness check failed!");
					} else if (resStateText == "Face is too large") {
						antdHelper.noti("Face is too large.");
					} else if (resStateText == "Spoof") {
					} else {
						console.log("Error");
					}
				} else {
				}
			})
			.catch(err => {
				console.log("err", err);
				// antdHelper.noti('Server Error. Please contact dev team1111111111111111');
			});
	};
	const stopCamera = () => {
		let stream = webcamRef.current.video.srcObject;
		const tracks = stream.getTracks();

		tracks.forEach(track => track.stop());
		webcamRef.current.video.srcObject = null;

		const context = canvasRef.current.getContext("2d");

		setIsDetected(false);
		setWebcamStarted(false);
		// setTimeout(() => {
		context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
		// }, 1000);
	};

	const verifyUser = async () => {
		setSelectButton("verify");
		setVerifySpinActive(true);
		setEnrollSpinActive(false);

		if (!WebcamStarted) {
			setWebcamStarted(true);
		}

		intervalVerify = setInterval(() => {
			verifyRequest();
		}, intervalTime);
	};

	const verifyRequest = () => {
		const imgSrc = WebCamRef.getScreenshot();
		Axios.post(process.env.REACT_APP_SERVER_URL + "/get_wallet", {
			image: imgSrc
		})
			.then(res => {
				console.log("res", res);
				if (res.status == 200) {
					const resStateText = res.data.status;
					if (resStateText == "Success") {
						antdHelper.notiOK("Face Vector verified Successfully.");
						clearInterval(intervalVerify);
						setCessAddr(res.data.address);
						setVerifySpinActive(false);
						_handleModalClose();
					} else if (resStateText == "No Users") {
						antdHelper.noti("info", "", "Face Vector not Registered. Please enroll.");
						// setCameraCaptureStart(true);
					} else if (resStateText == "Move Closer") {
						antdHelper.noti("Please Move Closer!");
					} else if (resStateText == "Go Back") {
						antdHelper.noti("Please Move Back!");
					} else {
						// antdHelper.noti('Error');
					}
				} else {
				}
			})
			.catch(err => {
				console.log("err", err);
				// antdHelper.noti('Server Error. Please contact dev team2222222222222.');
			});
	};

	const _handleModalClose = () => {
		stopCamera();
		setIsActiveButton("");
		handleModalClose();
	};

	useEffect(() => {
		return () => {
			clearInterval(intervalEnroll);
			clearInterval(intervalVerify);
		};
	}, []);

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
		setWebcamStarted(true);
	}, []);

	useEffect(() => {
		setTimeout(() => {
			setIsActiveButton(true);
		}, intervalTime);
	}, [isDetected]);
	return WebcamStarted ? (
		<Modal
			title={title}
			open={isModalOpen}
			centered
			width={`calc(${width}px + 45px)`}
			onCancel={_handleModalClose}
			footer={
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<div>{extra}</div>
					<Button type="primary" disabled={!isDetected} onClick={captureImage}>
						{buttonText}
					</Button>
				</div>
			}>
			<ModalContent $hg={`calc(${height}px + 10px)`} style={{ position: "relative" }}>
				{!WebCamRef && (
					<SpinWrapper>
						<Spin size="large" />
					</SpinWrapper>
				)}
				<div style={{ margin: "auto", position: "absolute", top: 0, height: "100%" }}>
					{/* {WebcamStarted ? ( */}
					<Webcam
						audio={false}
						height={resolution.height}
						width={MainWidth}
						videoConstraints={{ width: MainWidth, height: resolution.height }}
						style={View}
						onLoadedMetadata={() => {
							if (WebcamStarted) handleWebcamStream();
						}}
						ref={webcamRef}
					/>
					{/* ):(<></>)} */}
					<AnimationWrapper>
						<Col xs={24} sm={18} style={{ opacity: 0.3 }}>
							<ReactBodymovin options={bodymovinOptions} />
						</Col>
						<canvas style={View} ref={canvasRef} />
					</AnimationWrapper>
					{isActiveButton ? (
						<Row>
							<Col>
								<Button onClick={enrollUser} className={`${selectButton == "enroll" ? "active" : ""} camera-button`}>
									enroll
									<Spin spinning={isEnrollSpinActive} size="small" style={{ marginLeft: "10px" }}></Spin>
								</Button>
							</Col>
							<Col style={{ marginLeft: "10px" }}>
								<Button onClick={verifyUser} className={`${selectButton == "verify" ? "active" : ""} camera-button`}>
									verify
									<Spin spinning={isVerifySpinActive} size="small" style={{ marginLeft: "10px" }}></Spin>
								</Button>
							</Col>
						</Row>
					) : (
						<></>
					)}
				</div>
			</ModalContent>
		</Modal>
	) : (
		<></>
	);
};
export default CamModal;
