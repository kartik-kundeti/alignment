import { ArrowRight, Eye, Menu, X } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { setColorBlind, useColorBlind } from '@/lib/colorblind'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/team-diagnostic', label: 'Team Diagnostic' },
  { to: '/message-coach', label: 'Message Coach' },
  { to: '/research', label: 'Research' },
]

/** Logo B (DECISIONS.md G2 row 15): a speech bubble with two lines of text and a gold dot.
 * The lines are cut out of the bubble, so the mark works on white and on navy. */
export function Logo({ className }: { className?: string }) {
  const id = 'logo' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <mask id={id}>
        <rect width="64" height="64" fill="white" />
        <path d="M17 22h30M17 32h18" stroke="black" strokeWidth="4.5" strokeLinecap="round" />
      </mask>
      <path d="M18 8H46a12 12 0 0 1 12 12v14a12 12 0 0 1-12 12H30l-12 10v-10a12 12 0 0 1-12-12V20A12 12 0 0 1 18 8z" fill="currentColor" mask={`url(#${id})`} />
      <circle cx="44" cy="32" r="4" fill="#E9B44C" />
    </svg>
  )
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-6 md:px-8', className)}>{children}</div>
}

/** Small uppercase section label. Green on light backgrounds, gold on navy, where green would be too dark to read. */
export function Eyebrow({ children, className, onDark }: { children: ReactNode; className?: string; onDark?: boolean }) {
  return <div className={cn('mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em]', onDark ? 'text-brand-gold' : 'text-brand-accent', className)}><span className={cn('h-px w-8', onDark ? 'bg-brand-gold' : 'bg-brand-accent')} />{children}</div>
}

/** Swaps red and green for colour-blind-safe colours across the whole site (G2 row 16). */
function ColorBlindToggle({ dark, className }: { dark?: boolean; className?: string }) {
  const on = useColorBlind()
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => setColorBlind(!on)}
      title="Swap red and green for colours that are easier to tell apart with colour blindness" aria-label="Colour-blind friendly colours"
      className={cn('shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap ring-1 transition-colors', on
        ? (dark ? 'bg-white text-navy ring-white' : 'bg-navy text-white ring-navy')
        : (dark ? 'text-white ring-white/30 hover:bg-white/10' : 'text-navy ring-navy/15 hover:bg-navy/5'), className)}>
      <Eye className="size-4" />
      <span className="sr-only xl:not-sr-only">Colour-blind friendly</span>
      <span className={cn('relative ml-1 inline-block h-4 w-7 rounded-full transition-colors', on ? 'bg-brand-gold' : dark ? 'bg-white/25' : 'bg-navy/15')}>
        <span className={cn('absolute top-0.5 size-3 rounded-full bg-white shadow transition-all', on ? 'left-3.5' : 'left-0.5')} />
      </span>
    </button>
  )
}

function Header() {
  const { pathname } = useLocation()
  const home = pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => { setOpen(false) }, [pathname])
  const dark = home && !scrolled && !open

  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-colors duration-300', dark ? 'bg-transparent text-white' : 'border-b border-navy/10 bg-white/85 text-navy backdrop-blur-xl')}>
      <Container className="flex h-18 items-center gap-10">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className={cn('size-8', dark ? 'text-white' : 'text-navy')} />
          <span className="text-[17px] font-semibold tracking-tight">CommsAlign</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('relative text-sm font-medium whitespace-nowrap transition-opacity hover:opacity-100', isActive ? 'opacity-100' : 'opacity-70')}>
              {({ isActive }) => (<>{n.label}{isActive && <span className={cn('absolute -bottom-[25px] left-0 h-0.5 w-full', dark ? 'bg-brand-gold' : 'bg-brand-accent')} />}</>)}
            </NavLink>
          ))}
        </nav>
        <ColorBlindToggle dark={dark} className="ml-auto hidden md:inline-flex" />
        <Link to="/message-coach" className={cn('hidden shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors md:inline-flex', dark ? 'bg-brand-gold text-navy hover:bg-white' : 'bg-navy text-white hover:bg-navy/90')}>
          Review a message <ArrowRight className="size-4" />
        </Link>
        <button className="ml-auto md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </Container>
      {open && (
        <nav className="border-t border-navy/10 bg-white md:hidden">
          <Container className="flex flex-col py-3">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} className="py-3 text-base font-medium text-navy">{n.label}</NavLink>)}
            <ColorBlindToggle className="my-3 inline-flex self-start" />
          </Container>
        </nav>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="bg-navy text-white">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo className="size-8 text-white" />
            <span className="text-lg font-semibold">CommsAlign</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            Communication analytics for managers: find where a team's communication falls short, then write the next message well.
          </p>
        </div>
        <div>
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Product</div>
          <ul className="space-y-2.5 text-sm text-white/75">
            <li><Link to="/team-diagnostic" className="hover:text-white">Team Diagnostic</Link></li>
            <li><Link to="/message-coach" className="hover:text-white">Message Coach</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Method</div>
          <ul className="space-y-2.5 text-sm text-white/75">
            <li><Link to="/research" className="hover:text-white">Research and evidence standard</Link></li>
            <li><Link to="/research#sources" className="hover:text-white">Sources</Link></li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-wrap justify-between gap-3 py-6 text-xs text-white/40">
          <span>DNSC 6317 Business Analytics Practicum · Gallup case competition</span>
          <span>Demonstration data. Survey results shown are simulated.</span>
        </Container>
      </div>
    </footer>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

/** Light page hero used by the inner pages. */
export function PageHero({ eyebrow, title, children, aside }: { eyebrow: string; title: string; children?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-navy/10 bg-white pt-36 pb-16">
      <div className="pointer-events-none absolute -top-40 right-[-10%] size-[520px] rounded-full bg-brand-accent/10 blur-3xl" />
      <Container className={cn('relative grid gap-10', aside && 'md:grid-cols-[1.5fr_1fr] md:items-end')}>
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-navy md:text-6xl">{title}</h1>
          {children && <div className="mt-6 max-w-xl text-lg leading-relaxed text-navy/65">{children}</div>}
        </div>
        {aside}
      </Container>
    </section>
  )
}
