import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  Copy,
  Factory,
  GraduationCap,
  HeartPulse,
  Mail,
  ShieldCheck,
  Wheat
} from 'lucide-react';

const CONTACT_EMAIL = 'bitrashreyi97@gmail.com';

const solutions = [
  {
    icon: <Wheat size={20} />,
    title: 'Village intelligence',
    description: 'Bring community services, local needs, and public resources into one clearer view.'
  },
  {
    icon: <GraduationCap size={20} />,
    title: 'Education',
    description: 'Support students and institutions with focused AI assistance and useful insights.'
  },
  {
    icon: <Factory size={20} />,
    title: 'Industry',
    description: 'Turn operational signals into practical context for teams and decision-makers.'
  },
  {
    icon: <HeartPulse size={20} />,
    title: 'Healthcare',
    description: 'Explore health-service information and patterns with responsible AI support.'
  },
  {
    icon: <Building2 size={20} />,
    title: 'Smart cities',
    description: 'Connect city-scale information to help communities plan and respond.'
  }
];

export default function LandingPage({ onSignIn, onSignUp }) {
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setEmailCopied(true);
    } catch (error) {
      console.error('Unable to copy the Cognivex contact email:', error);
      window.location.href = `mailto:${CONTACT_EMAIL}`;
    }
  };

  return (
    <main className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="#home" aria-label="Cognivex AI home">
          <img src="/cognivex-icon-192.png" alt="" />
          <span>Cognivex <strong>AI</strong></span>
        </a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#solutions">Solutions</a>
          <a href="#how-it-works">Process</a>
          <a href="#security">Security</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-header-actions">
          <button className="landing-signin" type="button" onClick={onSignIn}>Sign in</button>
          <button className="landing-copy-email" type="button" onClick={handleCopyEmail}>
            {emailCopied ? <Check size={15} /> : <Copy size={15} />}
            {emailCopied ? 'Copied!' : 'Copy Email'}
          </button>
          <button className="landing-signup landing-signup-header" type="button" onClick={onSignUp}>
            Get Started <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <section className="landing-hero" id="home">
        <div className="landing-hero-glow" aria-hidden="true" />
        <div className="landing-hero-content">
          <p className="landing-eyebrow"><span /> Gemini Chat · Causal Reasoning · DSA AI Tutor</p>
          <h1>
            <span className="landing-heading-dark">Multi-Domain AI<br />Intelligence Platform</span>
            <span className="landing-heading-gradient">Built for Real-World<br className="landing-title-break" />Decisions</span>
          </h1>
          <p className="landing-hero-description">
            Bring Gemini-powered conversation, causal reasoning, saved chat history, and a dedicated DSA AI Tutor<br className="landing-description-break" />
            into one workspace, with focused intelligence for village, college, industry, healthcare,<br className="landing-description-break" />
            and smart-city applications.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-signup" type="button" onClick={onSignUp}>
              <ArrowRight size={17} /> Get Started
            </button>
            <a className="landing-secondary-action" href="#solutions">
              <Building2 size={16} /> Explore Solutions
            </a>
          </div>
          <div className="landing-contact-pill">
            <Mail size={15} />
            <span>Inquiries: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></span>
            <button type="button" onClick={handleCopyEmail}>
              {emailCopied ? 'Copied!' : '(Click to copy)'}
            </button>
          </div>
        </div>
      </section>

      <section className="landing-section landing-solutions" id="solutions">
        <div className="landing-section-heading">
          <p className="landing-section-kicker">One platform, many perspectives</p>
          <h2>Intelligence built around the world we live in.</h2>
          <p>Explore connected AI experiences designed for the needs of real communities and organizations.</p>
        </div>
        <div className="landing-solution-grid">
          {solutions.map((solution) => (
            <article className="landing-solution-card" key={solution.title}>
              <span className="landing-solution-icon">{solution.icon}</span>
              <h3>{solution.title}</h3>
              <p>{solution.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-process" id="how-it-works">
        <div className="landing-process-copy">
          <p className="landing-section-kicker">A clearer path from question to insight</p>
          <h2>Start with a question. Get a useful next step.</h2>
          <p>
            Choose a domain, ask Cognivex AI what you need to understand, and explore
            a response designed to help you move forward.
          </p>
          <button className="landing-text-action" type="button" onClick={onSignUp}>
            Explore Cognivex AI <ArrowRight size={16} />
          </button>
        </div>
        <div className="landing-process-steps">
          <div><span>01</span><strong>Choose a domain</strong><p>Focus the conversation on the area that matters to you.</p></div>
          <div><span>02</span><strong>Ask your question</strong><p>Describe the challenge or information you are looking for.</p></div>
          <div><span>03</span><strong>Explore the response</strong><p>Review AI-generated guidance and decide what to do next.</p></div>
        </div>
      </section>

      <section className="landing-trust" id="security">
        <span className="landing-trust-icon"><ShieldCheck size={22} /></span>
        <div>
          <h2>Your workspace starts with your account.</h2>
          <p>Sign in securely to access your Cognivex AI conversations and workspace.</p>
        </div>
        <div className="landing-trust-actions">
          <button className="landing-secondary-action" type="button" onClick={onSignIn}>Sign in securely <ArrowRight size={16} /></button>
          <button className="landing-trust-signup" type="button" onClick={onSignUp}>Get Started</button>
        </div>
      </section>

      <section className="landing-faq" id="faq">
        <p className="landing-section-kicker">Frequently asked questions</p>
        <h2>A few things to know.</h2>
        <details>
          <summary>What is Cognivex AI?</summary>
          <p>Cognivex AI is a conversational intelligence platform with focused experiences for five real-world domains.</p>
        </details>
        <details>
          <summary>Do I need an account to use the platform?</summary>
          <p>Sign up or sign in to access the AI workspace and your saved conversations.</p>
        </details>
        <details>
          <summary>How do I get started?</summary>
          <p>Select “Get Started” to sign up, or choose “Sign in” if you already have an account.</p>
        </details>
      </section>

      <footer className="landing-footer">
        <a className="landing-brand" href="#home" aria-label="Cognivex AI home">
          <img src="/cognivex-icon-192.png" alt="" />
          <span>Cognivex <strong>AI</strong></span>
        </a>
        <span>AI for connected, informed decisions.</span>
        <button type="button" onClick={onSignIn}>Open your workspace <ArrowRight size={15} /></button>
      </footer>
    </main>
  );
}
