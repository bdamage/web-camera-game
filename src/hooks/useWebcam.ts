import {useCallback, useEffect, useState} from "react";
import type {WebcamStatus} from "../types/game";

interface UseWebcamResult {
  stream: MediaStream | null;
  status: WebcamStatus;
  errorMessage: string | null;
  requestAccess: () => Promise<void>;
}

export const useWebcam = (): UseWebcamResult => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<WebcamStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setErrorMessage("Your browser does not support webcam access.");
      return;
    }

    setStatus("requesting");
    setErrorMessage(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: {ideal: 960},
          height: {ideal: 540},
        },
        audio: false,
      });

      setStream(mediaStream);
      setStatus("ready");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to access webcam.";
      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError");

      setStatus(denied ? "denied" : "error");
      setErrorMessage(message);
    }
  }, []);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return {
    stream,
    status,
    errorMessage,
    requestAccess,
  };
};
