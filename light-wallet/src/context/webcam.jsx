import React, { createContext, useReducer } from "react";

const initialState = {
	isDetected: false,
	WebcamStarted: false,
	WebCamRef: false,
	CameraActiveType: 1,
	resolution: {
		width: 640,
		height: 480
	}
};

const defaultValues = {
	...initialState,
	setIsDetected: () => {},
	setWebcamStarted: () => {},
	setWebCamRef: () => {},
	setCameraActiveType: () => {},
	setResolution: () => {}
};

export const WebCamContext = createContext(defaultValues);
const WebcamReducer = (state, action) => {
	// eslint-disable-next-line default-case
	switch (action.type) {
		case "SET_DETECTED":
			return {
				...state,
				isDetected: action.payload
			};
		case "SET_WEBCAM":
			return {
				...state,
				WebcamStarted: action.payload
			};
		case "SET_WEBCAM_REF":
			return {
				...state,
				WebCamRef: action.payload
			};
		case "SET_RESOLUTION":
			return {
				...state,
				resolution: action.payload
			};
		case "SET_CAMERA_ACTIVE_TYPE":
			return {
				...state,
				CameraActiveType: action.payload
			}
	}
};
export const WebcamProvider = ({ children }) => {
	const [state, dispatch] = useReducer(WebcamReducer, initialState);
	const setIsDetected = value => dispatch({ type: "SET_DETECTED", payload: value });
	const setWebcamStarted = value => dispatch({ type: "SET_WEBCAM", payload: value });
	const setWebCamRef = ref => dispatch({ type: "SET_WEBCAM_REF", payload: ref });
	const setCameraActiveType = ref => dispatch({type: 'SET_CAMERA_ACTIVE_TYPE', payload:ref});
	const setResolution = value => dispatch({ type: "SET_RESOLUTION", payload: value });
	const value = { ...state, setIsDetected, setWebcamStarted, setWebCamRef, setResolution, setCameraActiveType };
	return <WebCamContext.Provider value={value}>{children}</WebCamContext.Provider>;
};
