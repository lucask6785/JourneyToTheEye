import type { PopupPosition } from '../types';
import './aboutPage.css';

const ABOUT_PAGE_HEIGHT = 300;

export function AboutPage({ 
  position, 
  onClose 
}: {
  position: PopupPosition;
  onClose: () => void;
}) {
  return (
    <>
      <svg className="popup-connector" style={{ width: '100%', height: '100%' }}>
        <line
          x1={position.starScreenPos.x}
          y1={position.starScreenPos.y}
          x2={position.x}
          y2={position.y + ABOUT_PAGE_HEIGHT / 2}
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      <div
        className="about-main"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div className="about-header">
          <h3>About</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="about-content">
          <p>Welcome to Journey to the Eye!</p>
          <p>This is an interactive star map visualization project.</p>
          <p>Click on stars to explore and navigate through space.</p>
          <p>By adjusting the fuel slider, you can find the optimal path
            between two stars using either Dijkstra or A* path finding algorithms.
          </p>
          <p>Inspired by Outer Wilds 🪐</p>
          <p>Made for COP3530 Project 2</p>
        </div>
      </div>
    </>
  );
}
