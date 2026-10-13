import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { AudioProvider } from './audio/AudioProvider';
import './styles/tokens.css';
import './styles/app.css';
import './styles/experience.css';
import './styles/audio.css';
import './styles/gallery.css';
import './styles/illustrated-rooms.css';
import './styles/iphone.css';

for (const [property, filename] of Object.entries({ '--paper-art': 'ornate-paper-panel', '--brass-art': 'brass-nameplate', '--mechanism-art': 'mechanism-panel' })) {
  document.documentElement.style.setProperty(property, `url("${import.meta.env.BASE_URL}images/props/${filename}.webp")`);
}

createRoot(document.getElementById('root')!).render(<StrictMode><AudioProvider><App /></AudioProvider></StrictMode>);
