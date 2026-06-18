import { createContext } from 'react';
import { APP_MODES, APP_ACCENTS } from './engine.js';

export const ThemeCtx = createContext({ 
  ...APP_MODES[0], 
  accent: APP_ACCENTS[0].hex, 
  zoom: 1.0, 
  logoText: "LS", 
  logoData: null 
});