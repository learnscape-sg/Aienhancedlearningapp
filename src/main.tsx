import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { CoursePage } from './components/student/CoursePage';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/course/:id" element={<CoursePage />} />
    </Routes>
  </BrowserRouter>
);
