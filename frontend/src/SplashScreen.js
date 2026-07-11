import { useState, useEffect } from 'react';

export const SplashScreen = () => {
  const [show, setShow] = useState(true);
  const [render, setRender] = useState(true);

  useEffect(() => {
    // Start fade out after 3.5 seconds
    const hideTimer = setTimeout(() => {
      setShow(false);
    }, 3500);

    // Completely unmount after 4.5 seconds to clean up DOM
    const unmountTimer = setTimeout(() => {
      setRender(false);
    }, 4500);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!render) return null;

  return (
    <div className={`splash-overlay ${!show ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <h1 className="splash-title">VectorShift</h1>
        <p className="splash-subtitle">The Ultimate Visual Pipeline Builder</p>
        
        <div className="splash-features">
          <div className="splash-feature">Drag & Drop Nodes</div>
          <div className="splash-feature">Build Complex Flows</div>
          <div className="splash-feature">Analyze DAGs</div>
        </div>
      </div>
    </div>
  );
};
