
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, DollarSign, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import OneSignalTestButton from '@/components/OneSignalTestButton';
import OneSignalDiagnostic from '@/components/OneSignalDiagnostic';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: "Today's Bookings",
      value: "12",
      icon: Calendar,
      change: "+20%",
    },
    {
      title: "Total Customers",
      value: "543",
      icon: Users,
      change: "+12%",
    },
    {
      title: "Revenue",
      value: "₹15,240",
      icon: DollarSign,
      change: "+8%",
    },
    {
      title: "Growth",
      value: "23%",
      icon: TrendingUp,
      change: "+5%",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.email}!</p>
        </div>
        <div className="flex gap-2">
          <OneSignalTestButton />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-booqit-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-green-600 mt-1">
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* OneSignal Diagnostic Panel */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Notification Testing</h2>
        <OneSignalDiagnostic />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New booking from John Doe</p>
                <p className="text-xs text-gray-500">Hair Cut - 2:00 PM</p>
              </div>
              <span className="text-xs text-gray-400">5 min ago</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Payment received</p>
                <p className="text-xs text-gray-500">₹500 from Sarah Wilson</p>
              </div>
              <span className="text-xs text-gray-400">15 min ago</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Appointment rescheduled</p>
                <p className="text-xs text-gray-500">Mike Johnson - Tomorrow 3 PM</p>
              </div>
              <span className="text-xs text-gray-400">1 hour ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
