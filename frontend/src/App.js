import { useState, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { PipelineToolbar } from './toolbar';
import { PipelineUI } from './ui';
import { SubmitButton } from './submit';
import { SplashScreen } from './SplashScreen';
import { UserDashboard } from './UserDashboard';
import { LoginModal } from './LoginModal';
import { useStore } from './store';

function App() {
  const currentUser = useStore(state => state.currentUser);
  const login = useStore(state => state.login);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const tourRun = useStore(state => state.tourRun);
  const setTourRun = useStore(state => state.setTourRun);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourError, setTourError] = useState(null);
  
  const tourSteps = [
    {
      target: 'body',
      title: 'Welcome (1/13)',
      content: 'Welcome to Vector Shift! Let\'s take a quick tour to show you how to build powerful AI pipelines. Click Next to begin!',
      placement: 'center'
    },
    {
      target: '.user-avatar-btn',
      title: 'User Dashboard (2/13)',
      content: 'This is your User Dashboard. Here you can customize your profile, see your saved pipelines, and manage your account.',
      disableBeacon: true,
      placement: 'bottom'
    },
    {
      target: '.toolbar',
      title: 'Node Palette (3/13)',
      content: 'This is the Node Palette. It contains all the tools you need to build your pipelines.',
      placement: 'top'
    },
    {
      target: '.add-custom-node-btn',
      title: 'Custom Nodes (4/13)',
      content: 'Want to build your own blocks? Click the + button to create reusable Custom Nodes with custom UI fields!',
      placement: 'top'
    },
    {
      target: '.react-flow-wrapper',
      title: 'The Canvas (5/13)',
      content: 'This is the Canvas. Drop your nodes here and drag a line between the colored dots to connect them together.',
      placement: 'center'
    },
    {
      target: '.custom-minimap',
      title: 'Minimap (6/13)',
      content: 'Use the Minimap to easily navigate around large, complex pipelines.',
      placement: 'left'
    },
    {
      target: '.custom-controls',
      title: 'View Controls (7/13)',
      content: 'Use these controls to zoom in and out, or automatically fit the entire pipeline into view.',
      placement: 'left'
    },
    {
      target: '.save-dropdown-container',
      title: 'Save Pipeline (8/13)',
      content: 'Once your masterpiece is built, don\'t forget to save it here so you can load it later!',
      placement: 'top'
    },
    {
      target: '.export-btn',
      title: 'Export (9/13)',
      content: 'Need to share your pipeline? Click Export to download a high-quality image of your canvas.',
      placement: 'top'
    },
    {
      target: '.dock-btn-new',
      title: 'New Pipeline (10/13)',
      content: 'Want to start from scratch? Click New to clear the canvas and start a brand new pipeline.',
      placement: 'top'
    },
    {
      target: '.dock-btn-clear',
      title: 'Clear (11/13)',
      content: 'Made a mess? Use the Clear button to instantly wipe everything off your canvas.',
      placement: 'top'
    },
    {
      target: '.submit-btn',
      title: 'Run Pipeline (12/13)',
      content: 'Ready to run? Click the Rocket button to execute your pipeline and see the results!',
      placement: 'top'
    },
    {
      target: '.tutorial-btn',
      title: 'Replay Tour (13/13)',
      content: 'If you ever need a refresher, just click the Info button here to replay this tour. Happy building!',
      placement: 'bottom'
    }
  ];

  const [forceShowModal, setForceShowModal] = useState(false);
  const [manualShowLogin, setManualShowLogin] = useState(false);

  useEffect(() => {
    const open = () => setManualShowLogin(true);
    const close = () => setManualShowLogin(false);
    window.addEventListener('open-login-modal', open);
    window.addEventListener('close-login-modal', close);
    return () => {
        window.removeEventListener('open-login-modal', open);
        window.removeEventListener('close-login-modal', close);
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset_token');
    const verifyToken = urlParams.get('verify_token');

    if (resetToken || verifyToken) {
        window.history.replaceState({}, document.title, "/");
    }

    if (resetToken) {
        setForceShowModal(true);
    } else if (verifyToken) {
        // Process Email Verification headlessly so we don't need LoginModal to render
        fetch(`https://vector-shift-backend.fly.dev/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: verifyToken })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                login(data.user, data.token);
                // Dispatch a toast so the user knows they were logged in automatically!
                window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', text: "Email verified! You are now logged in." } }));
                
                // Attempt to automatically close this new tab so the user is returned to their original session
                setTimeout(() => {
                    window.close();
                }, 1500);
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', text: data.detail || "Invalid or expired verification link." } }));
            }
        })
        .catch(err => console.error("Verification error:", err));
    }
  }, [login]);

  // Sync state across browser tabs instantly using localStorage events
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'vector-shift-auth-storage') {
        try {
          const newState = JSON.parse(e.newValue);
          if (newState && newState.state) {
            useStore.setState(newState.state);
          }
        } catch (err) {
          console.error("Failed to sync state from other tab:", err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const cached = localStorage.getItem('demo_config_cache');
        let configData = null;

        if (cached) {
          const parsed = JSON.parse(cached);
          // Check if cache is less than 1 hour old (3600000 ms)
          if (Date.now() - parsed.timestamp < 3600000) {
            configData = parsed.data;
          }
        }

        if (!configData) {
          // Cache missed or expired, fetch from server
          const response = await fetch(`https://vector-shift-backend.fly.dev/config`);
          configData = await response.json();
          // Save to cache with current timestamp
          localStorage.setItem('demo_config_cache', JSON.stringify({
            data: configData,
            timestamp: Date.now()
          }));
        }

        if (configData.is_demo) {
          setIsDemoMode(true);
          // If they aren't logged in, force them into Demo User
          if (!useStore.getState().currentUser) {
            login({ id: 'demo', username: 'Demo User', avatar_url: null });
          }
        } else {
          setIsDemoMode(false);
          // If demo was turned off but they are still the Demo User, kick them out of the user account but preserve the pipeline
          if (useStore.getState().currentUser?.id === 'demo') {
            useStore.getState().login(null, null);
          }
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };

    checkConfig();
  }, [login]);

  useEffect(() => {
    if (tourRun) {
      setTourStepIndex(0); // Reset to first step when tour starts
      
      // Validate targets
      setTimeout(() => {
        const missing = tourSteps.filter(s => s.target !== 'body' && !document.querySelector(s.target));
        if (missing.length > 0) {
          setTourError("Missing targets: " + missing.map(m => m.target).join(", "));
        } else {
          setTourError(null);
        }
      }, 500);
    }
  }, [tourRun]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Joyride moved to bottom */}
      <SplashScreen />
      {(!currentUser && !isDemoMode) || forceShowModal || manualShowLogin ? (
          <LoginModal onClose={manualShowLogin ? () => setManualShowLogin(false) : undefined} />
      ) : null}
      
      <div style={{ position: 'absolute', top: '20px', left: '16px', right: '16px', zIndex: 2000, display: 'flex', gap: '16px', pointerEvents: tourRun ? 'auto' : 'none', alignItems: 'center' }}>
        <UserDashboard />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-start' }} className="tour-toolbar">
          <PipelineToolbar />
        </div>
      </div>

      <div className="tour-canvas" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PipelineUI />
      </div>
      <div className="dock-wrapper tour-submit">
        <SubmitButton />
      </div>
      <div style={{
          position: 'absolute',
          bottom: '4px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          color: 'var(--text-muted)',
          fontSize: '0.65rem',
          pointerEvents: 'none',
          opacity: 0.7,
          whiteSpace: 'nowrap'
      }}>
          &copy; 2026 Wilson Antony. All rights reserved.
      </div>
      {tourRun && (
      <div style={{ position: 'absolute', zIndex: 999999 }}>
        <Joyride
          run={true}
          disableScrolling={true}
          disableBeacon={true}
          disableOverlayClose={true}
          spotlightPadding={4}
          locale={{ last: 'Close' }}
          floaterProps={{ styles: { floater: { zIndex: 999999 } } }}
          steps={tourSteps}
          continuous={true}
          showProgress={true}
          showSkipButton={true}
          styles={{
            options: {
              arrowColor: 'rgba(30, 32, 45, 0.95)',
              backgroundColor: 'rgba(30, 32, 45, 0.95)',
              overlayColor: 'rgba(0, 0, 0, 0.85)',
              primaryColor: '#3b82f6',
              textColor: '#fff',
              zIndex: 999999,
            },
            tooltip: {
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
            },
            buttonNext: {
              borderRadius: '8px',
            },
            buttonBack: {
              color: '#94a3b8'
            },
            buttonSkip: {
              color: '#94a3b8'
            }
          }}
          callback={(data) => {
            console.log("Joyride callback:", data);
            const { status, action, type } = data;
            
            if (type === 'error' || type === 'target:not_found') {
              setTourError(`Joyride Internal Error: ${type} on target: ${data.step?.target}`);
            }
            
            if (['finished', 'skipped', 'error'].includes(status) || action === 'close' || type === 'error' || type === 'tour:end') {
              setTourRun(false);
            }
          }}
        />
      </div>
      )}
    </div>
  );
}

export default App;
