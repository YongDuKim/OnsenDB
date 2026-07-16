import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/shippori-mincho/700.css'
import '@fontsource/zen-kaku-gothic-new/400.css'
import '@fontsource/zen-kaku-gothic-new/500.css'
import '@fontsource/zen-kaku-gothic-new/700.css'
import './styles.css'
import App from './components/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
