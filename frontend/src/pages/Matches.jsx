import React from 'react';

export default function Matches() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 max-w-md w-full shadow-lg">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Community & Support</h1>
        <p className="text-sm font-medium text-gray-500 mb-6">
          We are building a new space for WhatsApp group links, FAQs, and feedback.
        </p>
        <span className="inline-block px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 text-xs font-black uppercase tracking-widest rounded-xl">
          Coming Soon
        </span>
      </div>
    </div>
  );
}