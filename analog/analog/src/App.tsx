import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlatformProvider } from './context/PlatformContext';
import { TopNav } from './components/Layout/TopNav';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { LaunchMissionPage } from './pages/LaunchMissionPage';
import { LearnPage } from './pages/LearnPage';
import { ResearchPage } from './pages/ResearchPage';

export const App: React.FC = () => {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

  return (
    <PlatformProvider>
      <BrowserRouter basename={basename}>
        <TopNav />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore/launch-mission" element={<LaunchMissionPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PlatformProvider>
  );
};

export default App;

