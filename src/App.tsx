import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AppContent from '@/components/AppContent';

import GuestInfoPage from '@/pages/guest/GuestInfoPage';
import GuestShopDetailsPage from '@/pages/guest/GuestShopDetailsPage';
import GuestServiceSelectionPage from '@/pages/guest/GuestServiceSelectionPage';
import GuestStaffSelectionPage from '@/pages/guest/GuestStaffSelectionPage';
import GuestDatetimePage from '@/pages/guest/GuestDatetimePage';
import GuestPaymentPage from '@/pages/guest/GuestPaymentPage';
import GuestBookingPage from '@/pages/guest/GuestBookingPage';
import GuestBookingSuccessPage from '@/pages/guest/GuestBookingSuccessPage';
import GuestBookingCancellationPage from '@/pages/guest/GuestBookingCancellationPage';
import GuestBookingHistoryPage from '@/pages/guest/GuestBookingHistoryPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<AppContent />} />

        <Route path="/guest-info/:merchantId" element={<GuestInfoPage />} />
        <Route path="/guest-shop/:merchantId" element={<GuestShopDetailsPage />} />
        <Route path="/guest-services/:merchantId" element={<GuestServiceSelectionPage />} />
        <Route path="/guest-staff/:merchantId" element={<GuestStaffSelectionPage />} />
        <Route path="/guest-datetime/:merchantId" element={<GuestDatetimePage />} />
        <Route path="/guest-payment/:merchantId" element={<GuestPaymentPage />} />
        <Route path="/guest-booking/:merchantId" element={<GuestBookingPage />} />
        <Route path="/guest-booking-success" element={<GuestBookingSuccessPage />} />
        <Route path="/guest-cancel-booking" element={<GuestBookingCancellationPage />} />
        <Route path="/guest-booking-history" element={<GuestBookingHistoryPage />} />
      </Routes>
    </Router>
  );
};

export default App;
