import { useState, useEffect } from 'react';
import * as THREE from 'three';
import type { StarData, PopupPosition } from '../types';

const POPUP_WIDTH = 200;
const POPUP_HEIGHT = 220;
const POPUP_OFFSET = 120;
const PADDING = 20;
const BORDER_WIDTH = 2;

export function usePopupPosition(
  selectedStar: StarData | null,
  showPopup: boolean,
  camera: THREE.PerspectiveCamera | null
) {
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);

  useEffect(() => {
    if (!selectedStar || !camera || !showPopup) {
      setPopupPosition(null);
      return;
    }

    const updatePosition = () => {
      // Convert 3D star position to screen coordinates
      const starPos = new THREE.Vector3(selectedStar.x, selectedStar.y, selectedStar.z);
      const screenPos = starPos.clone().project(camera);
      
      const starX = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const starY = (screenPos.y * -0.5 + 0.5) * window.innerHeight;

      // Try to place popup to the right of star
      let popupX = starX + POPUP_OFFSET;
      let onLeftSide = false;
      
      // Overflow
      if (popupX + POPUP_WIDTH > window.innerWidth - PADDING) {
        popupX = starX - POPUP_OFFSET - POPUP_WIDTH;
        onLeftSide = true;
      }
      
      // Clamp to screen bounds
      popupX = Math.max(PADDING, Math.min(popupX, window.innerWidth - POPUP_WIDTH - PADDING));
      
      // Center popup vertically on star
      let popupY = starY - POPUP_HEIGHT / 2;
      popupY = Math.max(PADDING, Math.min(popupY, window.innerHeight - POPUP_HEIGHT - PADDING));

      // Calculate where line should connect to popup edge
      const connectionX = onLeftSide 
        ? popupX + POPUP_WIDTH + BORDER_WIDTH 
        : popupX - BORDER_WIDTH;
      
      const connectionY = Math.max(
        popupY + BORDER_WIDTH,
        Math.min(starY, popupY + POPUP_HEIGHT - BORDER_WIDTH)
      );

      setPopupPosition({
        x: popupX,
        y: popupY,
        starScreenPos: { x: starX, y: starY },
        connectionPoint: { x: connectionX, y: connectionY }
      });
    };

    updatePosition();
    const interval = setInterval(updatePosition, 50);
    return () => clearInterval(interval);
  }, [selectedStar, showPopup, camera]);

  return popupPosition;
}