import { BookOpen, MessageCircle, ShieldCheck, Mail, ArrowRight } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import { Link } from "react-router-dom";

const topics = [
  { icon: BookOpen, title: "Finding and joining courses", body: "Browse published courses, review their competency levels and apply through My Learning. Your enrollment status appears with your courses." },
  { icon: ShieldCheck, title: "Understanding competency status", body: "Only a reviewed human decision verifies a competency level. Course completion and assessment scores are learning records, not competency decisions." },
  { icon: MessageCircle, title: "Submitting evidence", body: "Use your Evidence Portfolio to submit assessment or practical evidence. A reviewer will record a decision and any feedback there." },
];

export default function TraineeSupportPage() {
  return <div className="trainee-support-page">
    <PageHeader eyebrow="HELP & SUPPORT" title="How can we help?" description="Guidance for your learning journey, competency records and evidence." />
    <div className="support-hero"><div><span className="support-eyebrow">SAMARTHYA HELP CENTER</span><h2>Make your next step clear.</h2><p>Find quick answers or reach the programme coordinator for account and training support.</p></div><div className="support-orbit" aria-hidden="true"><BookOpen size={54}/><span>✦</span></div></div>
    <div className="support-topic-grid">{topics.map(({icon:Icon,title,body})=><Card key={title}><div className="support-topic-icon"><Icon size={20}/></div><h3>{title}</h3><p>{body}</p></Card>)}</div>
    <Card title="Frequently asked questions" subtitle="A few useful notes to get started.">
      <details className="support-faq"><summary>Does completing a course update my competency level?</summary><p>No. Completion records learning. A competency level changes only after an authorized reviewer makes an explicit decision based on reviewed evidence.</p></details>
      <details className="support-faq"><summary>Where can I see my upcoming sessions?</summary><p>Open Training Calendar for upcoming sessions, assessment dates and learning deadlines.</p></details>
      <details className="support-faq"><summary>Who can help with my account or role details?</summary><p>Contact your programme coordinator or administrator. Your organizational job role is managed separately from your account access role.</p></details>
    </Card>
    <div className="support-contact"><div className="support-topic-icon"><Mail size={20}/></div><div><h3>Still need help?</h3><p>Contact your programme coordinator for account, course or training support.</p></div><Link to="/trainee/notifications" className="button button-secondary">View notifications <ArrowRight size={16}/></Link></div>
  </div>;
}
