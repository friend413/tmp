import { Modal, Button, Spin } from "antd";
import Axios from "axios";
import { useEffect, useState } from "react";
import FaceCam from "./FaceCam";
import { useWebcamContext } from "@/hooks/useWebcam";
import { SpinWrapper, ModalContent } from "./cam.style";
import { Notification } from "@/components/Notification";
import * as antdHelper from "@/utils/antd-helper";

const CamModal = ({ title = "Capture face", buttonText = "Capture", isModalOpen, handleModalClose, captureImage, extra = false, setCessAddr }) => {
	const { resolution, isDetected, WebCamRef } = useWebcamContext();
	const { width, height } = resolution;

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
				<FaceCam />
			</ModalContent>
		</Modal>
	);
};
export default CamModal;
