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
  {
    icon: ArrowRight,
    title: 'Swipe to Discover',
    desc: 'Find your perfect vendor through a curated swipe experience. Every card tells a complete story — portfolio, pricing, vibe.',
  },
  {
    icon: Shield,
    title: 'Serious Enquiries Only',
    desc: 'Every enquiry is backed by a Rs.999 commitment. No tyre kickers. Only couples who mean business reach your inbox.',
  },
  {
    icon: Lock,
    title: 'Secure Booking Token',
    desc: 'Confirm bookings with a Rs.10,000 token through secure escrow. Your date is locked the moment both parties confirm.',
  },
  {
    icon: CheckCircle,
    title: 'Verified Vendors Only',
    desc: 'Every vendor is personally vetted. Premium portfolios. Real reviews from app-confirmed bookings only.',
  },
];

function DownloadButton() {
  const style = { textDecoration: 'none' as const, padding: '18px 40px', fontSize: '12px', letterSpacing: '1.5px', background: 'var(--gold)', color: 'var(--dark)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, borderRadius: '10px', textTransform: 'uppercase' as const, display: 'inline-block' };
  return (
    <a href="https://expo.dev/accounts/devjroy/projects/DreamWedding/builds" target="_blank" rel="noreferrer" style={style}>
      Download for Android
    </a>
  );
}

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--cream)' }}>

      {/* Navigation */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: 'rgba(245,240,232,0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 48px',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '18px',
          fontWeight: 300,
          color: 'var(--dark)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}>
          The Dream Wedding
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/vendor/login" style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: 'var(--grey)',
            textDecoration: 'none',
            fontWeight: 300,
            letterSpacing: '0.2px',
          }}>
            Vendor Login
          </Link>
          <Link href="/vendor/login" style={{
            background: 'var(--dark)',
            color: 'var(--cream)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '1.2px',
            padding: '10px 22px',
            borderRadius: '8px',
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}>
            Join as Vendor
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        paddingTop: '140px',
        paddingBottom: '100px',
        paddingLeft: '48px',
        paddingRight: '48px',
        maxWidth: '1200px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: '50px',
          padding: '6px 20px',
          marginBottom: '40px',
        }}>
          <div style={{
            width: '6px', height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--gold)',
          }} />
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--gold)',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}>
            Founding Vendor Program — 50 spots only
          </span>
        </div>

        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(42px, 6vw, 76px)',
          fontWeight: 300,
          color: 'var(--dark)',
          lineHeight: 1.12,
          marginBottom: '28px',
          letterSpacing: '0.3px',
        }}>
          Not just happily married.
          <br />
          <span style={{ color: 'var(--gold)' }}>Getting married happily.</span>
        </h1>

        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '18px',
          fontWeight: 300,
          color: 'var(--grey)',
          lineHeight: 1.8,
          maxWidth: '580px',
          margin: '0 auto 52px',
          letterSpacing: '0.2px',
        }}>
          India's first premium wedding vendor platform.
          Discover verified photographers, venues, designers and more —
          through a curated experience built for the way you actually make decisions.
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#download" style={{
            background: 'var(--dark)',
            color: 'var(--cream)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '1.5px',
            padding: '16px 36px',
            borderRadius: '10px',
            textDecoration: 'none',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            Download the App
          </a>
          <Link href="/vendor/login" style={{
            background: 'transparent',
            color: 'var(--gold)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 400,
            letterSpacing: '0.5px',
            padding: '16px 36px',
            borderRadius: '10px',
            textDecoration: 'none',
            border: '1px solid var(--gold)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            Join as a Vendor
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ backgroundColor: 'var(--dark)', padding: '40px 48px' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: '32px',
        }}>
          {[
            { num: '120+', label: 'Verified Vendors' },
            { num: '9', label: 'Categories' },
            { num: 'Rs.999', label: 'Enquiry Protection' },
            { num: 'Pan India', label: 'Coverage' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '36px',
                fontWeight: 300,
                color: 'var(--gold)',
                marginBottom: '6px',
              }}>
                {stat.num}
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px',
                fontWeight: 300,
                color: 'var(--grey)',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section style={{ padding: '100px 48px', maxWidth: '1200px', margin: '0 auto' }}>
        <p className="section-label" style={{ textAlign: 'center', marginBottom: '16px' }}>
          Every vendor you need
        </p>
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(28px, 4vw, 48px)',
          fontWeight: 300,
          color: 'var(--dark)',
          textAlign: 'center',
          marginBottom: '56px',
          letterSpacing: '0.3px',
        }}>
          One platform. Every category.
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}>
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.label} style={{
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '28px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--gold)';
                  el.style.backgroundColor = 'var(--light-gold)';
                  el.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--border)';
                  el.style.backgroundColor = 'var(--white)';
                  el.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--light-gold)',
                  border: '1px solid var(--gold-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Icon size={16} color="var(--gold)" />
                </div>
                <div style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '15px',
                  fontWeight: 400,
                  color: 'var(--dark)',
                  marginBottom: '6px',
                }}>
                  {cat.label}
                </div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 300,
                  color: 'var(--grey)',
                  marginBottom: '10px',
                  lineHeight: 1.5,
                }}>
                  {cat.desc}
                </div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--gold)',
                  letterSpacing: '0.5px',
                }}>
                  {cat.count} vendors
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section style={{ backgroundColor: 'var(--dark)', padding: '100px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p className="section-label" style={{
            textAlign: 'center',
            marginBottom: '16px',
            color: 'var(--grey)',
          }}>
            Why The Dream Wedding
          </p>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 300,
            color: 'var(--cream)',
            textAlign: 'center',
            marginBottom: '56px',
          }}>
            Built from a real wedding.
            <br />
            <span style={{ color: 'var(--gold)' }}>Solving real problems.</span>
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
          }}>
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px',
                  padding: '32px 28px',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '11px',
                    backgroundColor: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                  }}>
                    <Icon size={18} color="var(--gold)" />
                  </div>
                  <div style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: '18px',
                    fontWeight: 400,
                    color: 'var(--cream)',
                    marginBottom: '12px',
                  }}>
                    {f.title}
                  </div>
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: 300,
                    color: 'var(--grey)',
                    lineHeight: 1.8,
                  }}>
                    {f.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Vendor CTA */}
      <section style={{ padding: '100px 48px', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          background: 'var(--light-gold)',
          border: '1px solid var(--gold-border)',
          borderRadius: '20px',
          padding: '72px 48px',
        }}>
          <p className="section-label" style={{ marginBottom: '20px' }}>For Vendors</p>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(26px, 3vw, 40px)',
            fontWeight: 300,
            color: 'var(--dark)',
            marginBottom: '20px',
            letterSpacing: '0.3px',
          }}>
            Founding Partner Program
          </h2>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 300,
            color: 'var(--grey)',
            lineHeight: 1.8,
            maxWidth: '520px',
            margin: '0 auto 40px',
          }}>
            We are personally selecting our first 50 founding partners.
            Full platform access. Three months free. Price locked forever.
            Limited spots remaining.
          </p>
          <Link href="/vendor/login" style={{
            background: 'var(--dark)',
            color: 'var(--cream)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '1.5px',
            padding: '16px 40px',
            borderRadius: '10px',
            textDecoration: 'none',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            Apply as Founding Partner
            <ArrowRight size={14} color="var(--gold)" />
          </Link>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: 'var(--grey-light)',
            marginTop: '24px',
            fontStyle: 'italic',
          }}>
            Co-founded by Swati Tomar — Celebrity MUA · 10+ years industry experience
          </p>
        </div>
      </section>

      {/* Download */}
      <section id="download" style={{
        backgroundColor: 'var(--dark)',
        padding: '100px 48px',
        textAlign: 'center',
      }}>
        <p className="section-label" style={{ color: 'var(--grey)', marginBottom: '20px' }}>
          For Couples
        </p>
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(28px, 4vw, 52px)',
          fontWeight: 300,
          color: 'var(--cream)',
          marginBottom: '20px',
          letterSpacing: '0.3px',
        }}>
          Your wedding starts here.
        </h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '16px',
          fontWeight: 300,
          color: 'var(--grey)',
          marginBottom: '48px',
          maxWidth: '480px',
          margin: '0 auto 48px',
          lineHeight: 1.8,
        }}>
          Download The Dream Wedding app and start discovering verified vendors today.
        </p>
        <DownloadButton />
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          color: 'var(--grey)',
          marginTop: '20px',
          fontStyle: 'italic',
        }}>
          iOS coming soon
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '36px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        backgroundColor: 'var(--cream)',
      }}>
        <span style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '15px',
          fontWeight: 300,
          color: 'var(--dark)',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
        }}>
          The Dream Wedding
        </span>
        <span style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          fontWeight: 300,
          color: 'var(--grey)',
          fontStyle: 'italic',
        }}>
          Not just happily married — getting married happily.
        </span>
        <span style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          fontWeight: 300,
          color: 'var(--grey-light)',
        }}>
          © 2026 The Dream Wedding
        </span>
      </footer>

    </div>
  );
}
