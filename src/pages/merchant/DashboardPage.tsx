
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock data for dashboard
const dashboardStats = [
  { id: 1, title: 'Bookings Today', value: 5, color: 'bg-booqit-primary/10 text-booqit-primary' },
  { id: 2, title: 'Total Earnings', value: '₹2,500', color: 'bg-green-100 text-green-700' },
  { id: 3, title: 'Customers', value: 28, color: 'bg-blue-100 text-blue-700' },
  { id: 4, title: 'Services', value: 7, color: 'bg-amber-100 text-amber-700' }
];

// Mock data for recent bookings
const recentBookings = [
  { id: 1, customer: 'Rahul Sharma', service: 'Haircut', time: '10:00 AM', status: 'confirmed' },
  { id: 2, customer: 'Priya Patel', service: 'Hair Color', time: '11:30 AM', status: 'confirmed' },
  { id: 3, customer: 'Amit Kumar', service: 'Beard Trim', time: '1:15 PM', status: 'pending' }
];

const DashboardPage: React.FC = () => {
  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="p-6 pb-20">
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome back, Merchant!</p>
        </div>
        <div className="h-10 w-10 bg-booqit-primary/10 text-booqit-primary rounded-full flex items-center justify-center">
          <span className="font-medium">M</span>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {dashboardStats.map(stat => (
              <Card key={stat.id} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className={`inline-flex rounded-lg p-2 mb-2 ${stat.color}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Today's Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentBookings.length > 0 ? (
                  recentBookings.map(booking => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div>
                        <h4 className="font-medium">{booking.customer}</h4>
                        <div className="flex gap-2 items-center">
                          <span className="text-sm text-gray-500">{booking.service}</span>
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-gray-500">{booking.time}</span>
                        </div>
                      </div>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No bookings for today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-4 bg-booqit-primary/10 text-booqit-primary rounded-lg text-left hover:bg-booqit-primary/20 transition-colors">
                  <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add Service
                </button>
                <button className="p-4 bg-gray-100 text-gray-700 rounded-lg text-left hover:bg-gray-200 transition-colors">
                  <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  Manage Schedule
                </button>
                <button className="p-4 bg-gray-100 text-gray-700 rounded-lg text-left hover:bg-gray-200 transition-colors">
                  <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                  Customers
                </button>
                <button className="p-4 bg-gray-100 text-gray-700 rounded-lg text-left hover:bg-gray-200 transition-colors">
                  <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                  </svg>
                  Analytics
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
