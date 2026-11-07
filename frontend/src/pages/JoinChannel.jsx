import SEO from '../components/SEO';
import AuthBackground from '../components/AuthBackground';

const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbElRy16buMRoT6DQF2v';

export default function JoinChannel() {
  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-4 font-sans">
      <SEO title="Join our Channel" description="Join the Growth Engine WhatsApp Channel for updates and tips on Save for Save." />
      <AuthBackground />
      <a
        href={CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-10 py-4 text-lg font-black text-white shadow-[0_0_25px_rgba(37,99,235,0.7)] transition hover:scale-105 hover:shadow-[0_0_45px_rgba(34,211,238,0.9)] animate-pulse"
      >
        Join Channel
      </a>
    </main>
  );
}
