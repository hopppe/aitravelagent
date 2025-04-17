'use client';

import React, { useState } from 'react';
import { FaPlane, FaBed, FaUmbrellaBeach, FaEllipsisH, FaExternalLinkAlt } from 'react-icons/fa';

interface BookingServiceLink {
  id: string;
  name: string;
  type: 'flight' | 'hotel' | 'experience' | 'other';
  url: string;
  icon: React.ReactNode;
}

interface BookingServicesProps {
  destination: string;  // Destination name for searches
  startDate: string;    // ISO date string
  endDate: string;      // ISO date string
}

export default function BookingServices({ destination, startDate, endDate }: BookingServicesProps) {
  const [serviceType, setServiceType] = useState<'flight' | 'hotel' | 'experience' | 'all'>('all');
  
  // Generate URLs for booking services
  // In a real app, these would be more sophisticated with proper parameters
  const bookingLinks: BookingServiceLink[] = [
    {
      id: 'skyscanner',
      name: 'Skyscanner',
      type: 'flight',
      url: `https://www.skyscanner.com/transport/flights/nyc/${destination.substring(0, 3)}/${startDate}/${endDate}/`,
      icon: <FaPlane />
    },
    {
      id: 'kayak',
      name: 'Kayak',
      type: 'flight',
      url: `https://www.kayak.com/flights/NYC-${destination.substring(0, 3)}/${startDate}/${endDate}`,
      icon: <FaPlane />
    },
    {
      id: 'booking',
      name: 'Booking.com',
      type: 'hotel',
      url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}&checkin=${startDate}&checkout=${endDate}`,
      icon: <FaBed />
    },
    {
      id: 'airbnb',
      name: 'Airbnb',
      type: 'hotel',
      url: `https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes?checkin=${startDate}&checkout=${endDate}`,
      icon: <FaBed />
    },
    {
      id: 'viator',
      name: 'Viator',
      type: 'experience',
      url: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(destination)}`,
      icon: <FaUmbrellaBeach />
    },
    {
      id: 'getYourGuide',
      name: 'GetYourGuide',
      type: 'experience',
      url: `https://www.getyourguide.com/-l${encodeURIComponent(destination)}/`,
      icon: <FaUmbrellaBeach />
    },
  ];
  
  // Filter services based on selected type
  const filteredServices = serviceType === 'all'
    ? bookingLinks
    : bookingLinks.filter(service => service.type === serviceType);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Book Your Trip</h2>
      
      {/* Service type filter buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button 
          onClick={() => setServiceType('all')}
          className={`px-4 py-2 rounded-full text-sm flex items-center gap-1 ${
            serviceType === 'all' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <FaEllipsisH /> All
        </button>
        <button 
          onClick={() => setServiceType('flight')}
          className={`px-4 py-2 rounded-full text-sm flex items-center gap-1 ${
            serviceType === 'flight' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <FaPlane /> Flights
        </button>
        <button 
          onClick={() => setServiceType('hotel')}
          className={`px-4 py-2 rounded-full text-sm flex items-center gap-1 ${
            serviceType === 'hotel' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <FaBed /> Accommodation
        </button>
        <button 
          onClick={() => setServiceType('experience')}
          className={`px-4 py-2 rounded-full text-sm flex items-center gap-1 ${
            serviceType === 'experience' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <FaUmbrellaBeach /> Experiences
        </button>
      </div>
      
      {/* Booking services list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map(service => (
          <a 
            key={service.id}
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="border p-4 rounded-lg hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="text-primary text-xl">
                {service.icon}
              </div>
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-xs text-gray-500">
                  {service.type === 'flight' && 'Book flights'}
                  {service.type === 'hotel' && 'Find accommodation'}
                  {service.type === 'experience' && 'Discover activities'}
                </p>
              </div>
            </div>
            <FaExternalLinkAlt className="text-gray-400" />
          </a>
        ))}
      </div>
      
      {/* Disclaimer */}
      <p className="text-xs text-gray-500 mt-6">
        Note: We are not affiliated with any of these booking services. Links open in a new tab.
      </p>
    </div>
  );
} 