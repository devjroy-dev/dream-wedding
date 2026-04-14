'use client';
import Link from 'next/link';
import { Camera, Home, Scissors, Star, Music, Video, Headphones, Briefcase, Circle, ArrowRight, Shield, Lock, CheckCircle } from 'react-feather';

const categories = [
  { icon: Camera, label: 'Photographers', count: '22+', desc: 'Candid, traditional & cinematic' },
  { icon: Scissors, label: 'Makeup Artists', count: '14+', desc: 'Bridal & party makeup' },
  { icon: Home, label: 'Venues', count: '20+', desc: 'Banquets, farmhouses & hotels' },
  { icon: Star, label: 'Designers', count: '15+', desc: 'Bridal & groom wear' },
  { icon: Circle, label: 'Jewellery', count: '11+', desc: 'Bridal & custom jewellery' },
  { icon: Music, label: 'Choreographers', count: '10+', desc: 'Sangeet & performance prep' },
  { icon: Headphones, label: 'DJs', count: '9+', desc: 'Live music & DJ services' },
  { icon: Video, label: 'Content Creators', count: '11+', desc: 'BTS reels & short films' },
  { icon: Briefcase, label: 'Event Managers', count: '12+', desc: 'Luxury & destination weddings' },
];

const features = [
  { icon: ArrowRight, title: 'Curated Discovery', desc: 'Swipe through handpicked vendors. Every card tells a complete story — portfolio, pricing, vibe. No noise.' },
  { icon: Shield, title: 'Serious Enquiries Only', desc: 'Every enquiry is backed by a Rs.999 commitment. No tyre-kickers. Only couples who mean business reach your inbox.' },
  { icon: Lock, title: 'Payment Shield', desc: 'Vendor\'s final payment is secured before the wedding day. Cash or digital settlement — vendor chooses, couple commits. Protected by TDW.' },
  { icon: CheckCircle, title: 'Verified Vendors Only', desc: 'Every vendor is personally vetted. Premium portfolios. Real reviews from app-confirmed bookings only.' },
];

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--cream)', overflowX: 'hidden' }}>

      <style>{`
        @keyframes heroFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .hero-fade {
          animation: heroFade 0.6s ease forwards;
        }
        .cat-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 28px 24px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
        }
        .cat-card:hover {
          border-color: var(--gold);
          background: var(--light-gold);
          transform: translateY(-2px);
        }
        .nav-vendor-link {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: var(--grey);
          text-decoration: none;
          letter-spacing: 0.2px;
          transition: color 0.15s;
        }
        .nav-vendor-link:hover { color: var(--dark); }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: 'rgba(245,240,232,0.97)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 48px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '17px', fontWeight: 300,
          color: 'var(--dark)', letterSpacing: '2.5px',
          textTransform: 'uppercase',
        }}>
          The Dream Wedding
        </span>
        <Link href="/vendor/login" className="nav-vendor-link">
          Vendor Portal →
        </Link>
      </nav>

      {/* Hero */}
      <section className="hero-fade" style={{
        paddingTop: '160px', paddingBottom: '110px',
        paddingLeft: '48px', paddingRight: '48px',
        maxWidth: '1100px', margin: '0 auto', textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: '50px', padding: '5px 18px', marginBottom: '44px',
        }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--gold)' }} />
          <span style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
            fontWeight: 500, color: 'var(--gold)',
            letterSpacing: '1.5px', textTransform: 'uppercase',
          }}>
            Founding Vendor Program — 50 spots only
          </span>
        </div>

        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(40px, 6vw, 72px)',
          fontWeight: 300, color: 'var(--dark)',
          lineHeight: 1.1, marginBottom: '28px',
          letterSpacing: '-0.3px',
        }}>
          Not just happily married.
          <br />
          <span style={{ color: 'var(--gold)' }}>Getting married happily.</span>
        </h1>

        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '17px', fontWeight: 300,
          color: 'var(--grey)', lineHeight: 1.85,
          maxWidth: '520px', margin: '0 auto 52px',
        }}>
          India's first premium wedding vendor platform.
          Discover verified photographers, venues, designers and more —
          through a curated experience built for the way you actually make decisions.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#download" style={{
            background: 'var(--dark)', color: 'var(--cream)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            fontWeight: 500, letterSpacing: '1.5px',
            padding: '15px 36px', borderRadius: '10px',
            textDecoration: 'none', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
          }}>
            Download the App
          </a>
          <Link href="/vendor/login" style={{
            background: 'transparent', color: 'var(--gold)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            fontWeight: 400, letterSpacing: '0.5px',
            padding: '15px 36px', borderRadius: '10px',
            textDecoration: 'none', border: '1px solid var(--gold)',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
          }}>
            Join as a Vendor <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ backgroundColor: 'var(--dark)', padding: '36px 48px' }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-around',
          flexWrap: 'wrap', gap: '28px',
        }}>
          {[
            { num: 'Handpicked', label: 'Verified Vendors' },
            { num: '9', label: 'Categories' },
            { num: 'Rs.999', label: 'Enquiry Protection' },
            { num: 'Pan India', label: 'Coverage' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '30px', fontWeight: 300,
                color: 'var(--gold)', marginBottom: '6px',
              }}>{stat.num}</div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px', fontWeight: 300,
                color: 'var(--grey)', letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section style={{ padding: '100px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <p className="section-label" style={{ textAlign: 'center', marginBottom: '14px' }}>Every vendor you need</p>
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(26px, 4vw, 44px)',
          fontWeight: 300, color: 'var(--dark)',
          textAlign: 'center', marginBottom: '52px', letterSpacing: '0.3px',
        }}>
          One platform. Every category.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.label} className="cat-card">
                <div style={{
                  width: '38px', height: '38px', borderRadius: '9px',
                  backgroundColor: 'var(--light-gold)',
                  border: '1px solid var(--gold-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '14px',
                }}>
                  <Icon size={15} color="var(--gold)" />
                </div>
                <div style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '15px', fontWeight: 400,
                  color: 'var(--dark)', marginBottom: '5px',
                }}>{cat.label}</div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px', fontWeight: 300,
                  color: 'var(--grey)', marginBottom: '10px', lineHeight: 1.5,
                }}>{cat.desc}</div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px', fontWeight: 500,
                  color: 'var(--gold)', letterSpacing: '0.5px',
                }}>{cat.count} vendors</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section style={{ backgroundColor: 'var(--dark)', padding: '100px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p className="section-label" style={{ textAlign: 'center', marginBottom: '14px', color: 'var(--grey)' }}>
            Why The Dream Wedding
          </p>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(26px, 4vw, 44px)',
            fontWeight: 300, color: 'var(--cream)',
            textAlign: 'center', marginBottom: '52px',
          }}>
            Built from a real wedding.
            <br /><span style={{ color: 'var(--gold)' }}>Solving real problems.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px', padding: '32px 28px',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    backgroundColor: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '18px',
                  }}>
                    <Icon size={16} color="var(--gold)" />
                  </div>
                  <div style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: '17px', fontWeight: 400,
                    color: 'var(--cream)', marginBottom: '10px',
                  }}>{f.title}</div>
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px', fontWeight: 300,
                    color: 'var(--grey)', lineHeight: 1.8,
                  }}>{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Vendor CTA */}
      <section style={{ padding: '100px 48px', maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          background: 'var(--light-gold)',
          border: '1px solid var(--gold-border)',
          borderRadius: '20px', padding: '72px 48px',
        }}>
          <p className="section-label" style={{ marginBottom: '18px' }}>For Vendors</p>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(24px, 3vw, 38px)',
            fontWeight: 300, color: 'var(--dark)',
            marginBottom: '18px', letterSpacing: '0.3px',
          }}>
            Founding Partner Program
          </h2>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px', fontWeight: 300,
            color: 'var(--grey)', lineHeight: 1.85,
            maxWidth: '480px', margin: '0 auto 40px',
          }}>
            We are personally selecting our first 50 founding partners.
            Full platform access. Three months free. Price locked forever.
            Limited spots remaining.
          </p>
          <Link href="/vendor/login" style={{
            background: 'var(--dark)', color: 'var(--cream)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            fontWeight: 500, letterSpacing: '1.5px',
            padding: '15px 40px', borderRadius: '10px',
            textDecoration: 'none', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: '10px',
          }}>
            Apply as Founding Partner <ArrowRight size={13} color="var(--gold)" />
          </Link>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px', color: 'var(--grey-light)',
            marginTop: '24px', fontStyle: 'italic',
          }}>
            Co-founded by Swati Tomar — Celebrity MUA · 10+ years industry experience
          </p>
        </div>
      </section>

      {/* Download */}
      <section id="download" style={{ backgroundColor: 'var(--dark)', padding: '100px 48px', textAlign: 'center' }}>
        <p className="section-label" style={{ color: 'var(--grey)', marginBottom: '18px' }}>For Couples</p>
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(28px, 4vw, 50px)',
          fontWeight: 300, color: 'var(--cream)',
          marginBottom: '18px', letterSpacing: '0.3px',
        }}>
          Your wedding starts here.
        </h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px', fontWeight: 300,
          color: 'var(--grey)', lineHeight: 1.85,
          maxWidth: '420px', margin: '0 auto 48px',
        }}>
          Download The Dream Wedding app and start discovering verified vendors today.
        </p>
        <a href="https://expo.dev/accounts/devjroy/projects/DreamWedding/builds"
          target="_blank" rel="noreferrer"
          style={{
            background: 'var(--gold)', color: 'var(--dark)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            fontWeight: 500, letterSpacing: '1.5px',
            padding: '15px 40px', borderRadius: '10px',
            textDecoration: 'none', textTransform: 'uppercase',
            display: 'inline-block',
          }}>
          Download for Android
        </a>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px', color: 'var(--grey)',
          marginTop: '16px', fontStyle: 'italic',
        }}>iOS coming soon</p>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '32px 48px',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '16px',
        backgroundColor: 'var(--cream)',
      }}>
        <span style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '14px', fontWeight: 300,
          color: 'var(--dark)', letterSpacing: '2px',
          textTransform: 'uppercase',
        }}>The Dream Wedding</span>
        <span style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px', fontWeight: 300,
          color: 'var(--grey)', fontStyle: 'italic',
        }}>Getting married happily.</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/vendor/login" style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px', color: 'var(--grey-light)',
            textDecoration: 'none', letterSpacing: '0.3px',
          }}>Vendor Portal</Link>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px', color: 'var(--grey-light)',
          }}>© 2026 The Dream Wedding</span>
        </div>
      </footer>

    </div>
  );
}
