import { Routes, Route, Link } from "react-router-dom";
import MediaLibraryPage from "../pages/media/MediaLibraryPage";
import CapacityPage from "../pages/capacity/CapacityPage";
import CertificatesPage from "../pages/certificates/CertificatesPage";
import FeedbackPage from "../pages/feedback/FeedbackPage";
import AnnouncementsPage from "../pages/announcements/AnnouncementsPage";
import AchievementsPage from "../pages/achievements/AchievementsPage";
import TrainerMatchPage from "../pages/trainer/TrainerMatchPage";
import TraineeSupportPage from "../pages/trainee/TraineeSupportPage";
import TrainingDemandPage from "../pages/demand/TrainingDemandPage";
import TttPage from "../pages/ttt/TttPage";
import TttTraineePage from "../pages/ttt/TttTraineePage";
import PublicLayout from "../layouts/PublicLayout";
import TraineeLayout from "../layouts/TraineeLayout";
import TrainerLayout from "../layouts/TrainerLayout";
import AdminLayout from "../layouts/AdminLayout";
import LandingPage from "../pages/landing/LandingPage";
import AuthPage from "../pages/auth/AuthPage";
import TraineeDashboard from "../pages/trainee/TraineeDashboard";
import TraineeExperiencePage from "../pages/trainee/TraineeExperiencePage";
import TrainerDashboard from "../pages/trainer/TrainerDashboard";
import TrainerExperiencePage from "../pages/trainer/TrainerExperiencePage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminExperiencePage from "../pages/admin/AdminExperiencePage";
import UsersPage from "../pages/admin/UsersPage";
import ProfilePage from "../pages/profile/ProfilePage";
import ModulePage from "../pages/trainee/ModulePage";
import Part3ModulePage from "../pages/part3/Part3ModulePage";
import Part3BPage from "../pages/part3/Part3BPage";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import EmptyState from "../components/ui/EmptyState";
import { navigation } from "../utils/navigation";
const layouts = {
  trainee: TraineeLayout,
  trainer: TrainerLayout,
  admin: AdminLayout,
};
const dashboards = {
  trainee: TraineeDashboard,
  trainer: TrainerDashboard,
  admin: AdminDashboard,
};
const part3Paths = new Set([
  "trainer-assignments",
  "trainer-discovery",
  "trainer-profile",
  "availability",
  "assigned-batches",
  "training-sessions",
  "learning",
  "question-bank",
  "assessments",
  "evaluations",
  "results",
]);
const part3bPaths = new Set([
  "evidence",
  "competency-history",
  "follow-ups",
  "skill-suggestions",
  "evidence-review",
  "competency-decisions",
  "ai-question-drafts",
  "review-oversight",
  "organizational-capability",
  "follow-up-oversight",
  "ai-activity",
]);
// The candidate's Train-the-Trainer workspace. The Sidebar reveals the group
// only after an admin-created nomination; the page refuses to render without one.
const tttTraineePaths = new Set([
  "ttt-dashboard",
  "ttt-program",
  "ttt-modules",
  "ttt-practice",
  "ttt-submissions",
  "ttt-progress",
]);
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
      </Route>
      <Route path="login" element={<AuthPage key="login" />} />
      <Route path="register" element={<AuthPage key="register" register />} />
      <Route element={<ProtectedRoute />}>
        {Object.keys(layouts).map((role) => {
          const Layout = layouts[role],
            Dashboard = dashboards[role];
          return (
            <Route key={role} element={<RoleRoute roles={[role]} />}>
              <Route path={role} element={<Layout />}>
                <Route index element={<Dashboard />} />
                {role === "trainee" && <Route path="support" element={<TraineeSupportPage />} />}
                <Route path="profile" element={<ProfilePage />} />
                <Route path="training-needs/:id" element={<ModulePage />} />
                <Route path="courses/:id" element={<ModulePage />} />
                <Route path="nominations/:id" element={<ModulePage />} />
                <Route path="batches/:id" element={<ModulePage />} />
                {navigation[role]
                  .filter(([, path]) => path && path !== "profile" && path !== "support")
                  .map(([, path]) => (
                    <Route
                      key={path}
                      path={path}
                      element={
                        role === "admin" && ["users", "competencies", "job-role-requirements", "organizational-capability", "training-demand", "courses", "assessments", "certificates", "batches", "calendar", "results", "feedback", "audit-logs"].includes(path) ? (
                          <AdminExperiencePage view={path} />
                        ) : role === "trainer" && ["courses", "assigned-batches", "learning", "assessments", "question-bank", "training-sessions", "availability", "calendar", "results", "feedback", "train-the-trainer", "ttt-candidates"].includes(path) ? (
                          <TrainerExperiencePage view={path} />
                        ) : tttTraineePaths.has(path) ? (
                          <TttTraineePage />
                        ) : role === "trainee" && ["competency-passport", "competency-history", "skill-gaps", "learning-paths", "courses", "learning", "assessments", "evidence", "follow-ups", "certificates", "feedback", "notifications"].includes(path) ? (
                          <TraineeExperiencePage view={path} />
                        ) : path === "trainer-capacity" ? (
                          <CapacityPage />
                        ) : path === "certificates" ? (
                          <CertificatesPage />
                        ) : path === "feedback" ? (
                          <FeedbackPage />
                        ) : path === "announcements" ? (
                          <AnnouncementsPage />
                        ) : path === "achievements" ? (
                          <AchievementsPage />
                        ) : path === "trainer-match" ? (
                          <TrainerMatchPage />
                        ) : path === "training-demand" ? (
                          <TrainingDemandPage />
                        ) : path === "media-library" ? (
                          <MediaLibraryPage />
                        ) : path === "train-the-trainer" ||
                          path === "ttt-candidates" ? (
                          <TttPage />
                        ) : role === "admin" && path === "users" ? (
                          <UsersPage />
                        ) : part3bPaths.has(path) ? (
                          <Part3BPage />
                        ) : part3Paths.has(path) ? (
                          <Part3ModulePage />
                        ) : (
                          <ModulePage />
                        )
                      }
                    />
                  ))}
              </Route>
            </Route>
          );
        })}
      </Route>
      <Route
        path="*"
        element={
          <EmptyState
            title="Page not found"
            description="The page you are looking for does not exist."
            action={
              <Link className="button button-primary" to="/">
                Return home
              </Link>
            }
          />
        }
      />
    </Routes>
  );
}
