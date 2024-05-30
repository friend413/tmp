import { useWebcamContext } from "@/hooks/useWebcam";
import Webcam from "react-webcam";

export const WebCam = () => {
	const { resolution} = useWebcamContext();
	const webcamRef = useRef(null);

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
    return (
        <Webcam
					audio={false}
					height={resolution.height}
					width={MainWidth}
					videoConstraints={{ width: MainWidth, height: resolution.height }}
					style={View}
					onLoadedMetadata={handleWebcamStream}
					ref={webcamRef}
				/>
    )
}