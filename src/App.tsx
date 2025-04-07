// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import SelectZonePage from './pages/SelectZonePage'; // Create this page component
import GroupViewPage from './pages/GroupViewPage'; // Create this placeholder page

function App() {
  return (
    <div>
      {/* Define your application routes */}
      <Routes>
        {/* Route for the initial selection page */}
        <Route path="/" element={<SelectZonePage />} />

        {/* Route for the page you navigate TO (placeholder) */}
        {/* You might want different paths later, e.g., /group/campus */}
        <Route path="/group-view" element={<GroupViewPage />} />

        {/* Add other routes as needed */}
      </Routes>
    </div>
  );
}

export default App;