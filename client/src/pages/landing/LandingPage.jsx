import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  GraduationCap,
  Presentation,
  ShieldCheck,
  FileCheck2,
  BrainCircuit,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const steps = [
    "Identify training need",
    "Review and approve need",
    "Assign learning path",
    "Check eligibility",
    "Nominate and confirm admission",
  const [activeTab, setActiveTab] = useState(0);

  const previewSteps = [
    {
      label: "Role Requirement",
      title: "Meteorological Analyst · Level 4 Required",
      detail: "SYN-MET-01 · Numerical Weather Prediction Interpretation",
      badge: "Target: L4",
      status: "Required",
      note: "Standard baseline for operational forecasters",
    },
    {
      label: "Diagnostic Estimate",
      title: "Diagnostic Assessment Completed",
      detail: "Preliminary indicative score: 78% (Estimated L3 proficiency)",
      badge: "Estimated: L3",
      status: "Separate Indicator",
      note: "Estimates guide learning and never overwrite verified evidence",
    },
    {
      label: "Targeted Learning",
      title: "Advanced Radar & Satellite Data Processing",
      detail: "Assigned batch with confirmed seat admission and scheduled modules",
      badge: "Enrolled",
      status: "In Progress",
      note: "Modules, practical exercises, and supervised simulations",
    },
    {
      label: "Evidence & Decision",
      title: "Operational Weather Chart Analysis Submission",
      detail: "Trainer evaluated with rubric · Coordinator reviewed and verified L4",
      badge: "Demonstrated L4",
      status: "Verified Record",
      note: "Full audit trail linking assessor, evidence file, and verified level",
    },
  ];

  return (
    <>
      <section className="hero institutional-hero">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            METEOROLOGICAL TRAINING AND CAPACITY BUILDING
          </p>
          <p className="eyebrow">Capacity Building & Competency Assurance</p>
          <h1>
            Structured learning decisions.
            <br />
            <span>Traceable training journeys.</span>
            Turn training needs into <span>demonstrated capability.</span>
          </h1>
          <p>
            SAMARTHYA connects professional-role requirements, competency
            records, training needs, learning paths, course nominations and
            batch admission.
            Connect role requirements, relevant learning, suitable trainers and
            reviewed evidence in one traceable training journey.
          </p>
          <div className="flex gap-4 flex-wrap">
          <div className="flex gap-3 flex-wrap">
            <Link className="button button-primary" to="/login">
              Sign in <ArrowRight size={17} />
              Sign in <ArrowRight size={16} />
            </Link>
            <Link className="button button-secondary" to="/register">
              Create account
            </Link>
          </div>
          <p className="context-note">
            Demonstration environment using clearly labelled synthetic records.
            Demonstration environment with clearly labelled synthetic records.
          </p>
        </div>
        <div className="journey-visual">
          <div className="visual-heading">
            <span>CAPACITY-BUILDING WORKFLOW</span>
            <ClipboardList size={20} />

        <div className="product-preview-card" aria-label="Product preview">
          <div className="preview-card-header">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-copper-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-plum-900">
                Traceable Training Lifecycle
              </span>
            </div>
            <span className="demo-label">Illustrative example</span>
          </div>
          <ol>
            {steps.map((step, index) => (
              <li key={step}>
                <span className="step-number">0{index + 1}</span>
                <div>
                  <strong>{step}</strong>
                  <small>
                    {
                      [
                        "Record a known gap, missing evidence or justified request.",
                        "A coordinator reviews the stated development goal.",
                        "Published course steps explain why they were selected.",
                        "Pinned batch rules produce an eligibility checklist.",
                        "A human decision allocates a seat without overbooking.",
                      ][index]
                    }

          <div className="preview-card-body">
            {previewSteps.map((step, idx) => (
              <div
                key={step.label}
                className={`preview-step ${activeTab === idx ? "active" : ""}`}
                onClick={() => setActiveTab(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setActiveTab(idx);
                }}
              >
                <span
                  className={`preview-step-num ${
                    idx === 3 ? "accent" : ""
                  }`}
                >
                  0{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm text-plum-900">{step.title}</strong>
                    <span className="badge teal text-xs">{step.badge}</span>
                  </div>
                  <p className="text-xs text-ivory-700 mt-0.5">{step.detail}</p>
                  <small className="text-xs text-ivory-500 block mt-1">
                    {step.note}
                  </small>
                </div>
                {index < steps.length - 1 && (
                  <span className="flow-connector" />
                )}
              </li>
              </div>
            ))}
          </ol>
          </div>
        </div>
      </section>

      <section id="platform" className="landing-section">
        <div className="section-intro">
          <p className="eyebrow">THE PLATFORM</p>
          <h2>Information first, with a clear decision trail.</h2>
          <p className="eyebrow">Platform Capabilities</p>
          <h2>Information first, with an auditable decision trail.</h2>
          <p>
            Part 2 supports the journey through confirmed admission. Competency
            verification and assessment workflows remain separate future
            capabilities.
            From diagnostic gap identification to evidence-backed decisions,
            SAMARTHYA guarantees transparency and role-specific clarity.
          </p>
        </div>

        <div className="feature-grid">
          {[
            [
              BookOpen,
              "Versioned rules",
              "Active batches keep their approved rule version.",
            ],
            [
              ClipboardList,
              "Explainable eligibility",
              "Each check names its source, outcome and next step.",
            ],
            [
              ShieldCheck,
              "Controlled admission",
              "Authorized decisions, capacity safeguards and audit records stay aligned.",
            ],
          ].map(([Icon, title, text]) => (
            <article className="feature" key={title}>
              <span className="icon-box blue">
                <Icon size={22} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
          <article className="feature">
            <span className="icon-box plum">
              <BookOpen size={20} />
            </span>
            <h3>Explainable Eligibility</h3>
            <p>
              Rule-driven checklists inspect prerequisites, existing records,
              and capacity limits without black-box rejections.
            </p>
          </article>

          <article className="feature">
            <span className="icon-box copper">
              <BrainCircuit size={20} />
            </span>
            <h3>Separated Estimates & Evidence</h3>
            <p>
              Diagnostic assessment estimates provide helpful learning guidance
              while verified competency records require reviewed evidence.
            </p>
          </article>

          <article className="feature">
            <span className="icon-box teal">
              <FileCheck2 size={20} />
            </span>
            <h3>Traceable Decisions & Audit</h3>
            <p>
              Every admission approval, score evaluation, and competency decision
              records actor identity, timestamp, and justification.
            </p>
          </article>
        </div>
      </section>

      <section id="how-it-works" className="roles-section">
        <div className="section-intro">
          <p className="eyebrow">ROLE WORKSPACES</p>
          <h2>Focused access for each responsibility.</h2>
          <p className="eyebrow">Role-Specific Workspaces</p>
          <h2>Purpose-built tools for each participant.</h2>
        </div>

        <div className="role-grid">
          {[
            [
              GraduationCap,
              "Trainee",
              "Review records, raise needs, follow paths and submit nominations.",
            ],
            [
              Presentation,
              "Trainer",
              "Browse published course information and the training calendar.",
            ],
            [
              ShieldCheck,
              "Admin / Coordinator",
              "Maintain frameworks, review requests and manage safe batch admission.",
            ],
          ].map(([Icon, title, text]) => (
            <article key={title}>
              <Icon size={26} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
          <article>
            <span className="icon-box plum mb-3">
              <GraduationCap size={22} />
            </span>
            <h3>Trainee</h3>
            <p>
              Track your competency passport, review verified versus estimated
              skill gaps, nominate for courses, submit evidence, and take
              scheduled assessments.
            </p>
          </article>

          <article>
            <span className="icon-box copper mb-3">
              <Presentation size={22} />
            </span>
            <h3>Trainer</h3>
            <p>
              Design and publish courses with mapped competencies, manage
              learning resources, author question banks, and evaluate practical
              assessments.
            </p>
          </article>

          <article>
            <span className="icon-box teal mb-3">
              <ShieldCheck size={22} />
            </span>
            <h3>Coordinator / Admin</h3>
            <p>
              Manage competency frameworks, approve training needs, match
              trainers by objective suitability, and oversee organizational
              capability.
            </p>
          </article>
        </div>
      </section>
      <section id="about" className="journey-section">
        <div>
          <p className="eyebrow">PRODUCT BOUNDARY</p>
          <h2>
            Learning progress and demonstrated competency remain distinct.

      <section id="about" className="landing-section">
        <div className="card text-center p-8 bg-surface border border-border">
          <p className="eyebrow">Ready to begin?</p>
          <h2 className="text-2xl font-bold text-plum-900 mt-2 mb-3">
            Join the SAMARTHYA platform today
          </h2>
          <p>
            The workflow and synthetic thresholds shown here are proposed
            application rules to be validated with domain stakeholders.
          <p className="text-sm text-ivory-700 max-w-lg mx-auto mb-6">
            Access your personalized role workspace, review institutional
            competencies, and build demonstrated capability.
          </p>
          <div className="flex justify-center gap-3">
            <Link className="button button-primary" to="/register">
              Create an account <ArrowRight size={16} />
            </Link>
            <Link className="button button-secondary" to="/login">
              Sign in to workspace
            </Link>
          </div>
        </div>
        <Link to="/register" className="button button-light">
          Get started <ArrowRight size={17} />
        </Link>
      </section>
    </>
  );
}
