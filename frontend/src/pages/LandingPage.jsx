// The base ESLint no-unused-vars rule does not count JSX member expressions as usage.
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  Download,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    number: '01',
    title: 'Create your profile',
    description: 'Add the details you want other members to see and choose a category that fits you.',
    Icon: MessageCircle,
  },
  {
    number: '02',
    title: 'Choose a pool',
    description: 'Join a contact pool when you are ready. Your place in the queue is shown as it progresses.',
    Icon: UsersRound,
  },
  {
    number: '03',
    title: 'Review and unlock',
    description: 'When your batch is ready, review the price and available token discount before checkout.',
    Icon: WalletCards,
  },
];

const faqs = [
  {
    question: 'How does a contact pool work?',
    answer: 'Members choose to join a pool and are matched with other participating members. When a batch is ready, you can review it and decide whether to unlock it.',
  },
  {
    question: 'Will I be charged as soon as I join?',
    answer: 'Joining a pool is not checkout. The app shows the applicable price and any available token discount when your batch is ready and before you choose to pay or unlock it.',
  },
  {
    question: 'How are tokens used?',
    answer: 'Tokens can reduce the amount due at checkout. Your account balance and the available discount are calculated for checkout, and the final amount is shown before payment.',
  },
  {
    question: 'Can I choose what contact details I share?',
    answer: 'Review your profile before joining. Information you submit may be included in a matched member’s contact file if they unlock the batch. You can read the Privacy Policy for details.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

function SectionHeading({ eyebrow, title, description }) {
  return (
    <motion.div 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeUp}
      className="mx-auto mb-12 max-w-2xl text-center"
    >
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">{eyebrow}</p>
      <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>}
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-950">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-white px-4 py-3 font-bold text-blue-700 shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur-sm">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-8 sm:py-4"
          aria-label="Main navigation"
        >
          <Link to="/" className="flex min-w-0 shrink items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-black tracking-tight text-white sm:h-10 sm:w-10" aria-hidden="true">
              GE
            </span>
            <span className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-xl"> WhatsApp Growth Engine</span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <a href="#how-it-works" className="text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
              How it works
            </a>
            <a href="#why-growth-engine" className="text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
              Why Growth Engine
            </a>
            <a href="#faq" className="text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
              FAQs
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-lg px-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:min-h-11 sm:rounded-xl sm:px-4 sm:text-sm"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-blue-700 px-2.5 py-2 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:min-h-11 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm"
            >
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Get started</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>
      <div className="h-[65px] sm:h-[77px]" aria-hidden="true" />

      <main id="main-content">
        <section className="relative isolate overflow-hidden bg-gradient-to-b from-blue-50/80 via-white to-white">
          <div className="pointer-events-none absolute -right-40 -top-36 -z-10 h-[30rem] w-[30rem] rounded-full bg-blue-100/70 blur-3xl" aria-hidden="true" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
            
            <motion.div 
              initial="hidden" 
              animate="visible" 
              variants={staggerContainer}
              className="max-w-2xl"
            >
              <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3.5 py-2 text-xs font-bold text-blue-800 shadow-sm">
                <Sparkles size={15} aria-hidden="true" />
                A more thoughtful way to grow your network
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Grow your WhatsApp network with <span className="text-blue-700">meaningful connections.</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Growth Engine helps you discover and exchange contacts with people who choose to join the same networking pool. Set up your profile, follow your progress, and decide when a ready batch is right for you.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/register"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-base font-extrabold text-white shadow-lg shadow-blue-700/15 transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-blue-700/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Download Free Contacs <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  See how it works <ArrowDown size={17} aria-hidden="true" />
                </a>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="mx-auto w-full max-w-xl lg:max-w-none" 
              aria-label="Illustration of the contact matching dashboard"
            >
              <div className="relative rounded-[2rem] border border-blue-100 bg-white p-3 shadow-2xl shadow-blue-950/10 sm:p-5">
                <div className="rounded-[1.4rem] bg-slate-50 p-4 sm:p-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Your workspace</p>
                      <p className="mt-1 text-lg font-black text-slate-900">Save for Save Made Easy</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <UsersRound size={20} aria-hidden="true" />
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-500">Pool status</p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-extrabold text-slate-900">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
                        Track progress
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-500">Your choice</p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-extrabold text-slate-900">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" />
                        Unlock when ready
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">A network that fits your goals</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Join a category pool and follow the matching process.</p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Zap size={20} aria-hidden="true" />
                      </span>
                    </div>
                    <div className="mt-5 flex items-center gap-2" aria-hidden="true">
                      <motion.span initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ delay: 0.8, duration: 1 }} className="h-2 flex-1 rounded-full bg-blue-700" />
                      <motion.span initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ delay: 0.9, duration: 1 }} className="h-2 flex-1 rounded-full bg-blue-200" />
                      <span className="h-2 flex-1 rounded-full bg-slate-100" />
                      <span className="h-2 flex-1 rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Queue progress</span>
                      <span>Updates as members join</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
                      <Download size={19} aria-hidden="true" />
                    </span>
                    <p className="text-xs leading-5 text-blue-950">
                      <strong className="block text-sm">Your contacts, ready when you are</strong>
                      Review the batch and the checkout total before you decide.
                    </p>
                  </div>
                </div>
                <div className="pointer-events-none absolute -bottom-5 -left-3 -z-10 h-24 w-24 rounded-full bg-violet-200/60 blur-2xl" aria-hidden="true" />
              </div>
              <p className="mt-4 text-center text-xs text-slate-500">A simple flow from profile to pool to contact file.</p>
            </motion.div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
          <SectionHeading
            eyebrow="Simple by design"
            title="From profile to introductions"
            description="You stay in control at every step. Joining a pool starts the matching process; unlocking a ready batch is a separate choice."
          />
          <motion.ol 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3"
          >
            {steps.map(({ number, title, description, Icon }) => (
              <motion.li variants={fadeUp} key={number} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black tracking-widest text-blue-700">{number}</span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </motion.li>
            ))}
          </motion.ol>
        </section>

        <section id="why-growth-engine" className="scroll-mt-24 bg-slate-50 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Built around your choices"
              title="A clearer, more considered way to connect"
              description="Tools to organize your networking experience—without promises of guaranteed leads or results."
            />
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              <motion.article variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-6 transition-transform hover:-translate-y-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={22} aria-hidden="true" /></span>
                <h3 className="mt-5 font-extrabold text-slate-950">Clear participation</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">You choose whether to join a pool and whether to unlock a batch when it is ready.</p>
              </motion.article>
              <motion.article variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-6 transition-transform hover:-translate-y-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><WalletCards size={22} aria-hidden="true" /></span>
                <h3 className="mt-5 font-extrabold text-slate-950">Upfront checkout details</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">See the batch price, available token discount, and amount due before you confirm payment.</p>
              </motion.article>
              <motion.article variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-6 transition-transform hover:-translate-y-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><LockKeyhole size={22} aria-hidden="true" /></span>
                <h3 className="mt-5 font-extrabold text-slate-950">Privacy in plain language</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Learn what profile details may be shared in the <Link to="/privacy" className="font-bold text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-900">Privacy Policy</Link> before you participate.</p>
              </motion.article>
            </motion.div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-24">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto grid max-w-6xl items-center gap-10 rounded-3xl bg-slate-950 px-6 py-10 text-white shadow-2xl sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:gap-14"
          >
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-300">Your network, your call</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Ready to grow with intention?</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Set up your profile and explore the pools available to you. Review the details and choose what works for you.
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-slate-950 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Get started <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </motion.div>
        </section>

        <section id="faq" className="scroll-mt-24 bg-blue-50/60 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              eyebrow="Good to know"
              title="Frequently asked questions"
              description="A few details to help you decide if Growth Engine is right for you."
            />
            <div className="space-y-3">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group rounded-2xl border border-blue-100 bg-white px-5 py-4 shadow-sm transition-all open:ring-2 open:ring-blue-100">
                  <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
                    {question}
                    <ChevronDown size={18} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="max-w-2xl pt-3 text-sm leading-6 text-slate-600 animate-in fade-in slide-in-from-top-2 duration-300">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Link to="/" className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-xs font-black text-white" aria-hidden="true">GE</span>
              <span className="font-black tracking-tight text-slate-950">Growth Engine</span>
            </Link>
            <p className="mt-3 text-sm leading-6 text-slate-600">A networking tool for people who want to build business connections thoughtfully.</p>
            <p className="mt-4 text-xs text-slate-500">© {new Date().getFullYear()} RA_Technologies. All rights reserved.</p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
            <a href="#how-it-works" className="text-slate-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">How it works</a>
            <a href="#faq" className="text-slate-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">FAQs</a>
            <Link to="/terms" className="text-slate-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Terms</Link>
            <Link to="/privacy" className="text-slate-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Privacy</Link>
            <a href="mailto:ra.technologies.co.ke@gmail.com" className="text-slate-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}