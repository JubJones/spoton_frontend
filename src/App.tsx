// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import SelectZonePage from './pages/SelectZonePage';
import GroupViewPage from './pages/GroupViewPage';
import GroupViewPageRefactored from './pages/GroupViewPageRefactored';

function App() {
  return (
    <div>
      {/* Define your application routes */}
      <Routes>
        {/* Route for the initial selection page */}
        <Route path="/" element={<SelectZonePage />} />

        {/* Route for the main group view page */}
        <Route path="/group-view" element={<GroupViewPageRefactored />} />
        
        {/* Legacy route for comparison */}
        <Route path="/group-view-legacy" element={<GroupViewPage />} />

        {/* Add other routes as needed */}
      </Routes>
    </div>
  );
}

export default App;