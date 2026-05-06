import { Wheat } from 'lucide-react'
import { Link } from 'react-router-dom'

function InstagramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#D69A3A] rounded-lg flex items-center justify-center">
              <Wheat size={13} className="text-white" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-gray-900">Starter Analyzer</span>
              <span className="block text-[9px] uppercase tracking-widest text-gray-400 font-bold leading-none">by Breadagain</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <a
              href="https://instagram.com/breadagain__"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-[#D69A3A] transition-colors font-medium"
            >
              <InstagramIcon /> @breadagain__
            </a>
            <Link to="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-gray-900 transition-colors">Contact</Link>
          </div>
          <p className="text-xs text-gray-400">© 2026 Breadagain. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
