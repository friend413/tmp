import { Modal, Button, Spin } from "antd";
import FaceCam from "./FaceCam";
import { useWebcamContext } from "../hooks/useWebcam";
import { SpinWrapper, ModalContent } from "./cam.style";
const CamModal = ({ title = "Capture", buttonText = "Capture", isModalOpen, handleModalClose, captureImage, extra = false }) => {
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
			<ModalContent $hg={`calc(${height}px + 10px)`}>
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
