"use client";

import Link from "next/link";
import { useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Desktop */}
        <div className="h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="font-black text-xl tracking-tight text-black">
              iPS
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-semibold text-black hover:opacity-60 transition-opacity">
              Blog
            </Link>
            <Link href="#" className="text-sm font-semibold text-black hover:opacity-60 transition-opacity">
              Contact
            </Link>
          </nav>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-1.5"
          >
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="md:hidden border-t border-black/5 bg-white px-6 py-4 space-y-3">
          <Link href="/" className="block text-sm font-semibold text-black" onClick={() => setMenuOpen(false)}>
            Blog
          </Link>
          <Link href="#" className="block text-sm font-semibold text-black" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
        </div>
      )}
    </header>
  );
}
