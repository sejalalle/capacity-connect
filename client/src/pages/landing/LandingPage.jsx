import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Users, FileCheck2 } from "lucide-react";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
export default function LandingPage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Learning with a clear purpose</p>
          <h1>Turn training needs into demonstrated capability.</h1>
          <p>
            Connect learning, suitable trainers and reviewed evidence in one
            traceable training journey.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link className="button button-primary" to="/login">
              Sign in <ArrowRight size={16} />
            </Link>
            <Link className="button button-secondary" to="/register">
              Create account
            </Link>
          </div>
          <p className="context-note">
            A proposed platform for meteorological training and capacity
            building.
          </p>
        </div>
        <Card
          title="A connected learning journey"
          subtitle="Illustrative example · synthetic data"
          className="product-preview-card"
        >
          {[
            ["Identify a need", "Radar interpretation practice", "APPROVED"],
            [
              "Learn and apply",
              "Sample weather radar programme",
              "IN_PROGRESS",
            ],
            [
              "Review the evidence",
              "Practical task reviewed by an assigned reviewer",
              "UNDER_REVIEW",
            ],
          ].map(([title, detail, status], i) => (
            <div className="batch-option" key={title}>
              <div>
                <small>Step {i + 1}</small>
                <strong>{title}</strong>
                <p className="muted">{detail}</p>
              </div>
              <StatusBadge status={status} />
            </div>
          ))}
          <p className="context-note mt-4">
            Course completion and demonstrated competency are separate outcomes.
          </p>
        </Card>
      </section>
      <section id="platform" className="landing-section">
        <div className="section-intro">
          <h2>One journey. Clear responsibilities.</h2>
          <p>
            Keep the next action, supporting evidence and human decision in
            view.
          </p>
        </div>
        <div className="feature-grid">
          {[
            [
              BookOpen,
              "Relevant learning",
              "Connect training requests to course outcomes, schedules and available places.",
            ],
            [
              Users,
              "Suitable trainers",
              "Review expertise and availability before an authorized coordinator assigns a trainer.",
            ],
            [
              FileCheck2,
              "Reviewed evidence",
              "Keep assessment results, evidence acceptance and competency decisions distinct.",
            ],
          ].map(([Icon, title, copy]) => (
            <Card key={title} title={title}>
              <Icon size={22} className="muted mb-3" />
              <p className="muted">{copy}</p>
            </Card>
          ))}
        </div>
      </section>
      <section id="how-it-works" className="roles-section">
        <div className="section-intro">
          <h2>A workspace for every participant</h2>
        </div>
        <div className="role-grid">
          {[
            [
              "Trainee",
              "Find learning, track nominations, complete assessments and submit evidence.",
            ],
            [
              "Trainer",
              "Publish your courses, prepare resources and evaluate assigned submissions.",
            ],
            [
              "Administrator / Coordinator",
              "Manage access, training arrangements and authorized review workflows.",
            ],
          ].map(([title, copy]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="about" className="landing-section">
        <Card title="Ready for your next step?">
          <p className="muted mb-6">
            Sign in to continue your training journey, or register for a trainee
            or trainer account.
          </p>
          <Link className="button button-primary" to="/register">
            Get started <ArrowRight size={16} />
          </Link>
        </Card>
      </section>
    </>
  );
}
