import Link from 'next/link';
import { FaPlus, FaSuitcase } from 'react-icons/fa';
import TripList from '../components/trips/TripList';

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="bg-primary text-white rounded-lg p-8 shadow-lg">
        <h1 className="text-4xl font-bold mb-4">Plan Your Perfect Trip with AI</h1>
        <p className="text-xl mb-6">
          Let our AI travel agent create personalized itineraries based on your preferences.
        </p>
        <Link 
          href="/trips/new" 
          className="inline-flex items-center gap-2 bg-accent hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-full transition-all shadow-md"
        >
          <FaPlus />
          <span>Create New Trip</span>
        </Link>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FaSuitcase />
            <span>Your Trips</span>
          </h2>
          <Link 
            href="/trips/new"
            className="text-primary hover:text-accent transition-colors"
          >
            View All
          </Link>
        </div>
        
        <TripList />
      </section>
    </div>
  );
} 