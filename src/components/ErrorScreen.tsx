export function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="center-container error">
      <div>Error loading stars:</div>
      <div>{error}</div>
      <div className="subtext">
        Make sure backend is running: uvicorn api:app --reload
      </div>
    </div>
  );
}