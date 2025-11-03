import type { StarData, PopupPosition } from '../types';

const POPUP_HEIGHT = 220;
const SMALL_SCREEN_BREAKPOINT = 768;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

export function StarPopup({ 
  star, 
  position, 
  onSetStart, 
  onSetDestination, 
  onClose 
}: {
  star: StarData;
  position: PopupPosition;
  onSetStart: () => void;
  onSetDestination: () => void;
  onClose: () => void;
}) {
  const isSmallScreen = window.innerWidth < SMALL_SCREEN_BREAKPOINT;
  const popupWidth = isSmallScreen ? 200 : 300;
  
  return (
    <>
      <svg className="popup-connector" style={{ width: '100%', height: '100%' }}>
        <line
          x1={position.starScreenPos.x}
          y1={position.starScreenPos.y}
          x2={position.x}
          y2={position.y + POPUP_HEIGHT}
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      <div
        className="star-popup"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${popupWidth}px`,
        }}
      >
        <div className="star-popup-header">
          <h3>{star.name}</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="star-popup-content">
          <div className="star-info">
            <InfoRow label="ID" value={star.id.toString()} />
            <InfoRow label="Magnitude" value={star.magnitude.toFixed(2)} />
            <InfoRow 
              label="Position" 
              value={`(${star.x.toFixed(1)}, ${star.y.toFixed(1)}, ${star.z.toFixed(1)})`} 
            />
          </div>
          
          <div className="star-popup-actions">
            <button className="action-btn start-btn" onClick={onSetStart}>
              Set as Start
            </button>
            <button className="action-btn dest-btn" onClick={onSetDestination}>
              Set as Destination
            </button>
          </div>
        </div>
      </div>
    </>
  );
}