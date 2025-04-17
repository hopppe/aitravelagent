import Link from 'next/link';
import { FaPlane, FaUser } from 'react-icons/fa';

export function Navbar() {
  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <FaPlane className="text-2xl" />
          <span>AI Travel Agent</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link href="/trips" className="hover:text-accent transition-colors">
            My Trips
          </Link>
          <Link href="/profile" className="flex items-center gap-1 hover:text-accent transition-colors">
            <FaUser />
            <span>Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  );
} 