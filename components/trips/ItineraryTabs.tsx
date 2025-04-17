'use client';

import React, { useState } from 'react';
import { FaCalendarAlt, FaMapMarkedAlt, FaWallet } from 'react-icons/fa';
import ItineraryCalendarView from './ItineraryCalendarView';
import ItineraryMapView from './ItineraryMapView';

// Types imported from other files
type Activity = {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  coordinates: { lat: number; lng: number };
  cost: number;
  image?: string;
};

type Day = {
  date: string;
  activities: Activity[];
};

type Budget = {
  accommodation: number;
  food: number;
  activities: number;
  transport: number;
  total: number;
};

interface ItineraryTabsProps {
  days: Day[];
  budget: Budget;
}

export default function ItineraryTabs({ days, budget }: ItineraryTabsProps) {
  const [activeView, setActiveView] = useState<'calendar' | 'map' | 'budget'>('calendar');
  
  return (
    <div>
      {/* View toggle tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button 
            className={`border-b-2 px-1 py-4 font-medium flex items-center ${
              activeView === 'calendar' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveView('calendar')}
          >
            <FaCalendarAlt className="mr-2" />
            Calendar View
          </button>
          <button 
            className={`border-b-2 px-1 py-4 font-medium flex items-center ${
              activeView === 'map' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveView('map')}
          >
            <FaMapMarkedAlt className="mr-2" />
            Map View
          </button>
          <button 
            className={`border-b-2 px-1 py-4 font-medium flex items-center ${
              activeView === 'budget' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveView('budget')}
          >
            <FaWallet className="mr-2" />
            Budget
          </button>
        </nav>
      </div>

      {/* Calendar View - Import remaining components from existing files */}
      {activeView === 'calendar' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Itinerary</h2>
          <CalendarView days={days} />
        </div>
      )}

      {/* Map View */}
      {activeView === 'map' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Map Overview</h2>
          <ItineraryMapView days={days} />
        </div>
      )}

      {/* Budget View */}
      {activeView === 'budget' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Budget Breakdown</h2>
          <BudgetView budget={budget} />
        </div>
      )}
    </div>
  );
}

// Internal component for calendar view
function CalendarView({ days }: { days: Day[] }) {
  return (
    <div className="space-y-6">
      {days.map((day, index) => (
        <div key={day.date} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-primary text-white p-4">
            <h3 className="font-bold text-lg">
              Day {index + 1}: {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
          </div>
          <div className="divide-y">
            {day.activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Internal component for activity card
function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex justify-between">
        <p className="font-medium text-gray-500">{activity.time}</p>
        <p className="text-primary">${activity.cost}</p>
      </div>
      <h4 className="font-bold mb-1">{activity.title}</h4>
      <p className="text-gray-600 mb-2">{activity.description}</p>
      <p className="text-sm text-gray-500 flex items-center">
        <span className="mr-1">📍</span> {activity.location}
      </p>
      <div className="mt-2 flex justify-end">
        <button className="text-sm text-primary hover:text-accent">
          Change this activity
        </button>
      </div>
    </div>
  );
}

// Internal component for budget view
function BudgetView({ budget }: { budget: Budget }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <p className="text-3xl font-bold text-primary">${budget.total}</p>
        <p className="text-gray-500">Total trip budget</p>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b">
          <p className="font-medium">Category</p>
          <p className="font-medium">Amount</p>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span>Accommodation</span>
          </p>
          <p>${budget.accommodation}</p>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>Food</span>
          </p>
          <p>${budget.food}</p>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
            <span>Activities</span>
          </p>
          <p>${budget.activities}</p>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span>Transport</span>
          </p>
          <p>${budget.transport}</p>
        </div>
      </div>
      
      <div className="mt-8 pt-4 border-t">
        <p className="text-sm text-gray-500 mb-2">Budget distribution</p>
        <div className="w-full h-4 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${(budget.accommodation / budget.total) * 100}%` }}
          ></div>
          <div
            className="h-full bg-green-500"
            style={{ width: `${(budget.food / budget.total) * 100}%` }}
          ></div>
          <div
            className="h-full bg-yellow-500"
            style={{ width: `${(budget.activities / budget.total) * 100}%` }}
          ></div>
          <div
            className="h-full bg-red-500"
            style={{ width: `${(budget.transport / budget.total) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
} 