import { ArrowRight, Menu, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { cn } from '@/lib/utils'

const NAV = [
  { to: '/team-diagnostic', label: 'Team Diagnostic' },
  { to: '/message-coach', label: 'Message Coach' },
  { to: '/research', label: 'Research' },
]

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="195 95 470 355" className={className} aria-hidden="true">
      <path d="M514 164C423 62 238 112 218 263C195 422 386 495 491 376C402 443 267 399 264 289C259 171 397 106 514 164Z" fill="currentColor" />
      <g fill="none" stroke="#E9B44C" strokeLinecap="round" strokeLinejoin="round">
        <path d="M388 412C425 340 477 229 519 141C524 130 531 131 535 143C563 237 593 340 627 405" strokeWidth="23" />
        <path d="M361 346C436 314 531 352 640 291" strokeWidth="15" />
      </g>
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
          <Logo className={cn('h-7 w-9', dark ? 'text-white' : 'text-navy')} />
          <span className="text-[17px] font-semibold tracking-tight">CommsAlign</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('relative text-sm font-medium transition-opacity hover:opacity-100', isActive ? 'opacity-100' : 'opacity-70')}>
              {({ isActive }) => (<>{n.label}{isActive && <span className={cn('absolute -bottom-[25px] left-0 h-0.5 w-full', dark ? 'bg-brand-gold' : 'bg-brand-accent')} />}</>)}
            </NavLink>
          ))}
        </nav>
        <Link to="/message-coach" className={cn('ml-auto hidden items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors md:inline-flex', dark ? 'bg-brand-gold text-navy hover:bg-white' : 'bg-navy text-white hover:bg-navy/90')}>
          Review a message <ArrowRight className="size-4" />
        </Link>
        <button className="ml-auto md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </Container>
      {open && (
        <nav className="border-t border-navy/10 bg-white md:hidden">
          <Container className="flex flex-col py-3">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} className="py-3 text-base font-medium text-navy">{n.label}</NavLink>)}
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
            <Logo className="h-7 w-9 text-white" />
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
