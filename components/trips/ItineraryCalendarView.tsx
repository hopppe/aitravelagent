import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { FaClock, FaMapMarkerAlt, FaDollarSign, FaInfoCircle, FaChevronDown, FaChevronUp, FaUtensils } from 'react-icons/fa';

// Activity type with all details
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

// Day with activities
type Day = {
  date: string;
  activities: Activity[];
};

// Props for the calendar component
interface ItineraryCalendarViewProps {
  days: Day[];
}

export default function ItineraryCalendarView({ days }: ItineraryCalendarViewProps) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

  // Toggle expanded state for a day
  const toggleDay = (dayDate: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayDate]: !prev[dayDate]
    }));
  };

  // Toggle expanded state for an activity
  const toggleActivity = (activityId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedActivities(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }));
  };

  // Format date to display
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Get activity icon based on time/title
  const getActivityIcon = (activity: Activity) => {
    const title = activity.title.toLowerCase();
    const time = activity.time.toLowerCase();

    if (title.includes('lunch') || title.includes('dinner') || title.includes('eat') || 
        title.includes('restaurant') || title.includes('café') || title.includes('cafe')) {
      return <FaUtensils className="text-orange-500" />;
    }

    if (time === 'morning') {
      return <FaClock className="text-blue-500" />;
    } else if (time === 'afternoon') {
      return <FaClock className="text-yellow-500" />;
    } else if (time === 'evening') {
      return <FaClock className="text-purple-500" />;
    }

    return <FaInfoCircle className="text-gray-500" />;
  };

  // Render activity cost
  const renderCost = (cost: number) => {
    if (cost === 0) return <span className="text-green-600">Free</span>;
    return <span>${cost}</span>;
  };

  // Group activities by day
  const groupActivitiesByDay = (days: Day[]) => {
    return days.map((day, index) => {
      // Sort activities by time of day (morning, afternoon, evening)
      const sortedActivities = [...day.activities].sort((a, b) => {
        const timeOrder: Record<string, number> = { 'morning': 1, 'afternoon': 2, 'evening': 3 };
        const aTime = a.time.toLowerCase();
        const bTime = b.time.toLowerCase();
        return (timeOrder[aTime] || 99) - (timeOrder[bTime] || 99);
      });

      return {
        ...day,
        activities: sortedActivities,
        dayNumber: index + 1
      };
    });
  };

  const organizedDays = groupActivitiesByDay(days);

  return (
    <div className="space-y-4">
      {/* Summary view: all days in compact form */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Trip Overview</h2>
        <div className="grid grid-cols-1 gap-2">
          {organizedDays.map((day) => (
            <div 
              key={day.date} 
              className="border border-gray-200 rounded p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleDay(day.date)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Day {day.dayNumber}: {formatDate(day.date)}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    {day.activities.length} activities planned
                  </div>
                </div>
                <div>
                  {expandedDays[day.date] ? 
                    <FaChevronUp className="text-gray-400" /> : 
                    <FaChevronDown className="text-gray-400" />
                  }
                </div>
              </div>
              
              {/* Expanded day view */}
              {expandedDays[day.date] && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="space-y-3">
                    {day.activities.map((activity) => (
                      <div 
                        key={activity.id}
                        className="hover:bg-gray-100 p-2 rounded transition-colors cursor-pointer"
                        onClick={(e) => toggleActivity(activity.id, e)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start">
                            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center mr-2 mt-1">
                              {getActivityIcon(activity)}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="font-medium text-sm bg-gray-100 text-gray-700 px-2 py-0.5 rounded mr-2">
                                  {activity.time}
                                </span>
                                <h4 className="font-medium">{activity.title}</h4>
                              </div>
                              
                              {!expandedActivities[activity.id] && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-sm font-medium">
                              {renderCost(activity.cost)}
                            </div>
                            {expandedActivities[activity.id] ? 
                              <FaChevronUp className="text-gray-400" size={12} /> : 
                              <FaChevronDown className="text-gray-400" size={12} />
                            }
                          </div>
                        </div>
                        
                        {/* Expanded activity details */}
                        {expandedActivities[activity.id] && (
                          <div className="mt-2 pl-8">
                            <p className="text-sm text-gray-700 mb-2">{activity.description}</p>
                            <div className="text-sm text-gray-600 flex items-start mb-1">
                              <FaMapMarkerAlt className="mr-2 mt-1 flex-shrink-0" size={14} />
                              <span>{activity.location}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 