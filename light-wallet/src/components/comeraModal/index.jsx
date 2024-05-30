import { Modal, Button, Spin } from "antd";
import Axios from 'axios';
import {useEffect } from 'react';
import FaceCam from "./FaceCam";
import { useWebcamContext } from "@/hooks/useWebcam";
import { SpinWrapper, ModalContent } from "./cam.style";
import {Notification} from '@/components/Notification'
const CamModal = ({ title = "Capture face", buttonText = "Capture", isModalOpen, handleModalClose, captureImage, extra = false }) => {
	const { resolution, isDetected, setIsDetected, WebCamRef , setWebcamStarted, CameraActiveType} = useWebcamContext();
	const { width, height } = resolution;

	const restartCamCapture = () => {
		
		// setTimeout(()=>{
		// 	setIsDetected(false);
			// setWebcamStarted(true);
		// }, 3000)
	}
	const createWallet = (imgSrc) => {
		console.log('call create wallet func');
		Axios.post(process.env.REACT_APP_SERVER_URL+"/create_wallet", {
			image: imgSrc
		}).then(res=>{
			console.log('res', res);
			if (res.status == 200) {
				const resStateText = res.data.status;
				if (resStateText == 'Create OK') {
					Notification('success', 'Face Vector Read Successfully', 'Thanks for using Anon ID, no further action needed, verify at conference for access.');
					Notification('info', 'CESS Address', res.data.wallet_address);
					// alert('wallet address:'+res.data.wallet_address);
					handleModalClose();
				} else if (resStateText == 'Already Exist') {
					Notification('info', '', 'Face Vector Already Registered. Please Verify.');
				} else if (resStateText == 'Move Closer') {
					Notification('warning', '', 'Please Move Closer!');
					restartCamCapture();
				} else if (resStateText == 'Go Back') {
					Notification('warning', '', 'Please Move Back!');						
					restartCamCapture();					
				} else if (resStateText == 'Liveness Failed') {
					Notification('warning', '', 'Liveness Failed!');						
					restartCamCapture();
				} else {
					Notification('error', '', 'Error');						
					restartCamCapture();
				}
			} else {						
				restartCamCapture();

			}
		}).catch(err=>{
			console.log('err', err);
			console.log('error');
			setIsDetected(false);
			// setWebcamStarted(true);
		})

	}
	useEffect(()=> {
		console.log('is detected', isDetected)
		if (isDetected) {

		// 	let curTime = new Date().getTime() / 1000;
			// setWebcamStarted(false);
			
			const imgSrc = WebCamRef.getScreenshot();
			console.log('cameraActiveType', CameraActiveType);
			// if (CameraActiveType == 1){
				createWallet(imgSrc);
			// } else {

			// }
		}
	}, [isDetected])
	return (
		<Modal
			title={title}
			open={isModalOpen}
			centered
			width={`calc(${width}px + 45px)`}
			onCancel={handleModalClose}
			footer={
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<div>{extra}</div>
                    <Button type="primary" disabled={!isDetected} onClick={captureImage}>{buttonText}</Button>
				</div>
			}>
			<ModalContent $hg={`calc(${height}px + 10px)`} style={{ position: "relative" }}>
				{!WebCamRef && (
					<SpinWrapper>
						<Spin size="large" />
					</SpinWrapper>
				)}
				<FaceCam />
			</ModalContent>
		</Modal>
	);
};
export default CamModal;
