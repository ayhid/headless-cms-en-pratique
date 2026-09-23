import { Page } from '@strapi/strapi/admin';
import { Route, Routes } from 'react-router-dom';

import { DashboardPage } from './DashboardPage';

const App = () => {
  return (
    <Routes>
      <Route index element={<DashboardPage />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export default App;
