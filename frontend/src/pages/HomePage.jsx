import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircleIcon, MailIcon, PhoneIcon, MapPinIcon, FacebookIcon, TwitterIcon, LinkedinIcon } from 'lucide-react';
import { useState } from 'react';
// Navbar
function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="w-full bg-white shadow p-4 flex justify-between items-center sticky top-0 z-40">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 text-xl md:text-2xl font-bold text-pink-400">
        <MessageCircleIcon className="w-8 h-8" />
        <span>ChatWeb</span>
      </Link>

      {/* Menu Mobile Button */}
      <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
        <div className="space-y-1.5">
          <div className="w-6 h-0.5 bg-gray-600"></div>
          <div className="w-6 h-0.5 bg-gray-600"></div>
          <div className="w-6 h-0.5 bg-gray-600"></div>
        </div>
      </button>

      {/* Menu Desktop */}
      <div className="hidden md:flex items-center gap-6 text-gray-700 font-medium">
        <a href="#about" className="hover:text-pink-400 text-xl">About</a>
        <a href="#contact" className="hover:text-pink-400 text-xl">Contact</a>
        <Link
          to="/login"
          className="px-4 py-2 bg-pink-400 text-white rounded hover:bg-pink-500"
        >
          Login / Sign Up
        </Link>
      </div>

      {/* Menu Mobile */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white shadow md:hidden flex flex-col gap-4 p-4">
          <a href="#about" onClick={() => setIsOpen(false)}>About</a>
          <a href="#contact" onClick={() => setIsOpen(false)}>Contact</a>
          <Link
            to="/login"
            onClick={() => setIsOpen(false)}
            className="text-pink-400 font-bold"
          >
            Login / Sign Up
          </Link>
        </div>
      )}
    </nav>
  );
}

// Home Page
export default function HomePage() {
  return (
    <div className="w-full h-full flex flex-col">
      <Navbar />

      <main className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <section className="h-[80vh] flex flex-col items-center justify-center text-center p-8
                     bg-[url('/sample.png')] bg-cover bg-center bg-gray-700 bg-blend-multiply">

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Welcome to ChatWebsite</h1>
            <p className="text-xl text-gray-200 mb-8">A modern way to connect with your friends online!</p>
            <Link to="/signup" className="px-8 py-3 bg-pink-400 text-white text-lg font-semibold rounded hover:bg-pink-500">Get Started</Link>
        </section>

        {/* About Section */}
        <section className="bg-white py-20 px-8">
          <div id="about" className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">About ChatWebsite</h2>
            <p className="text-lg text-gray-600 mb-4">
              ChatWebsite is a fast, secure, and modern chat platform.
            </p>
            <p className="text-lg text-gray-600">
              User-friendly interface allows you to easily send messages, share images, and stay connected with everyone.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="bg-gray-800 text-gray-300 py-12 px-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Location */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Location</h3>
              <p className="flex items-start mb-2">
                <MapPinIcon className="w-5 h-5 mr-2 text-pink-400 mt-1" />
                1 Dai Co Viet, Hai Ba Trung, Hanoi
              </p>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Contact</h3>
              <p className="flex items-center mb-2">
                <MailIcon className="w-5 h-5 mr-2 text-pink-400" />
                1@gmail.com
              </p>
              <p className="flex items-center">
                <PhoneIcon className="w-5 h-5 mr-2 text-pink-400" />
                +84 123 456 789
              </p>
            </div>

            {/* Social Media */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Follow Us</h3>
              <div className="flex gap-4">
                <a href="#" className="text-gray-300 hover:text-pink-400">
                  <FacebookIcon className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-pink-400">
                  <TwitterIcon className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-pink-400">
                  <LinkedinIcon className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-10 border-t border-gray-700 pt-6">
            <p>&copy; 2025 ChatWebsite. All rights reserved.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
