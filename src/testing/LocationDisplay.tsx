import { useLocation } from "react-router-dom";

export const LocationDisplay = () => {
  const location = useLocation();
  return (
    <div data-testid="location-display">
      {decodeURIComponent(location.pathname)}
    </div>
  );
};
