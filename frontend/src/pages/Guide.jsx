import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import AuthBackground from '../components/AuthBackground';

const GUIDE_TITLE = 'Whatsapp Save for Save? A Beginner Guide to Growing Your WhatsApp Status for free.';
const GUIDE_DESCRIPTION =
  'Learn what Save for Save means, how swapping WhatsApp contacts with consenting people can grow your Status audience, and how to stay safe.';

export default function Guide() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 py-4 font-sans">
      <SEO title="Save for Save Guide" description={GUIDE_DESCRIPTION} />
      <AuthBackground />
      <article className="relative z-10 mx-auto max-w-[1300px] rounded-2xl border border-gray-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="flex justify-between text-sm font-bold text-blue-600">
          <Link to="/" className="hover:underline">Home page</Link>
          <Link to="/register" className="hover:underline">Get started</Link>
        </div>

        <header className="mb-8 mt-5 border-b border-gray-100 pb-6 dark:border-slate-800">
          <h1 className="text-3xl font-black leading-tight text-gray-900 dark:text-white">
            What is Save for Save? A Beginner Guide to Growing Your WhatsApp Status
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Growth Engine · Guide
          </p>
        </header>

        <div className="space-y-6 text-base leading-8 text-gray-700 dark:text-gray-300">
          <p>
            If you post on WhatsApp Status, you have probably noticed that most of your viewers are people
            who already have your number saved. "Save for Save" is the simple idea behind a lot of creators'
            growth: you save someone's contact, they save yours, and both of you see each other's Status
            updates. It is a trade of visibility, made by people who agree to it.
          </p>

          <h2 className="pt-4 text-2xl font-bold text-gray-900 dark:text-white">Why contacts matter for Status</h2>
          <p>
            WhatsApp Status is shown mainly to the people in your phone's contacts. If someone has not saved
            your number, your updates will not reach them through their Status feed. That makes the contact
            list the real reach of your account. Growing it by hand, by asking friends in comment sections
            or group chats, is slow and often awkward.
          </p>

          <h2 className="pt-4 text-2xl font-bold text-gray-900 dark:text-white">How Save for Save works</h2>
          <p>
            The traditional way is to find people in your niche, send a message, and wait for a reply. The
            problem is that many people never answer, and some do not want unsolicited contacts at all. A
            Save for Save platform removes that guesswork. Everyone in the pool has said yes to the exchange
            ahead of time, so every match is mutual.
          </p>
          <p>On Growth Engine, the process looks like this:</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Create a free account and complete your profile, including your niche and WhatsApp number.</li>
            <li>Opt in to the pool so the app can suggest people who also want to swap contacts.</li>
            <li>Review your matches and save each other's numbers.</li>
            <li>Keep posting. The more relevant contacts you have, the more your Status reaches.</li>
          </ol>
          <p>
            The platform works in phases. As more active members join, the pool grows and the matching
            improves. You do not need to wait for a particular phase to start.
          </p>

          <h2 className="pt-4 text-2xl font-bold text-gray-900 dark:text-white">Stay safe while you grow</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Only save contacts from people who agreed to the exchange. Never add strangers from random lists.</li>
            <li>Share only the WhatsApp number you are comfortable making public to your pool.</li>
            <li>Be careful with anyone who asks for money, a deposit, or your login codes. Legitimate swaps are free.</li>
            <li>Mute or remove contacts who spam you. Your Status feed should stay useful to you too.</li>
          </ul>

          <h2 className="pt-4 text-2xl font-bold text-gray-900 dark:text-white">Set honest expectations</h2>
          <p>
            Saving contacts gives your Status a chance to be seen. It does not guarantee views, followers, or
            sales. Your results depend on what you post and how consistently you post it. Treat a swap as the
            first step, and invest in content that people want to watch again.
          </p>

          <h2 className="pt-4 text-2xl font-bold text-gray-900 dark:text-white">Getting started</h2>
          <p>
            You can join Growth Engine for free, in a few minutes, from your phone or computer.{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:underline">Create your account</Link>
            {' '}and complete your profile to begin.
          </p>
        </div>

        <footer className="mt-10 border-t border-gray-100 pt-5 text-center text-sm text-gray-500 dark:border-slate-800 dark:text-gray-400">
          <Link to="/terms" className="font-bold text-blue-600 hover:underline">Terms</Link>
          {' · '}
          <Link to="/privacy" className="font-bold text-blue-600 hover:underline">Privacy</Link>
        </footer>
      </article>
    </main>
  );
}
