import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Ensure the app renders correctly
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA and mobile optimizations
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Prevent zoom on iOS when focusing inputs
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});

// Prevent touch callouts and improve touch performance
document.addEventListener('touchstart', function() {}, { passive: true });
document.addEventListener('touchmove', function() {}, { passive: true });
