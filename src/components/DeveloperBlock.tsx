import type { PopupPosition } from '../types';

export function DeveloperBlock({ 
  position, 
  developerName,
  year,
  major,
  imageUrl,
  linkedinUrl,
}: {
  position: PopupPosition;
  developerName: string;
  year?: string;
  major?: string;
  imageUrl?: string;
  linkedinUrl?: string;
  onClose: () => void;
}) {
  return (
    <>
      <svg className="popup-connector" style={{ width: '100%', height: '100%' }}>
        <line
          x1={position.starScreenPos.x}
          y1={position.starScreenPos.y}
          x2={position.connectionPoint.x}
          y2={position.connectionPoint.y}
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      <div
        className="dev-block-individual"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div className="dev-image-holder">
          {imageUrl ? (
            <img src={imageUrl} alt={developerName} />
          ) : (
            <div className="dev-image-placeholder">?</div>
          )}
        </div>
        
        <div className="dev-name-section">
          <h4>{developerName}</h4>
          {linkedinUrl && (
            <a 
              href={linkedinUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="linkedin-btn"
              title="LinkedIn Profile"
            >
              in
            </a>
          )}
        </div>
        
        <div className="dev-info">
          {year && <div className="dev-year">{year}</div>}
          {major && <div className="dev-major">{major}</div>}
        </div>
      </div>
    </>
  );
}
