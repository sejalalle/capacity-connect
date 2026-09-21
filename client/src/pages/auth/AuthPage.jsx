import { useCallback, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import Brand from "../../components/ui/Brand";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import useAuth from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import { errorMessage, fieldErrors } from "../../services/api";

export default function AuthPage({ register = false }) {
  const { user, login } = useAuth(),
    navigate = useNavigate();
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "trainee",
    department: "",
    designation: "",
    phone: "",
  });
  const [errors, setErrors] = useState({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false),
    [remember, setRemember] = useState(false),
    [forgot, setForgot] = useState(false);

  const close = useCallback(() => setForgot(false), []);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  const field = (key, label, props = {}) => (
    <Input
      label={label}
      name={key}
      value={values[key]}
      error={errors[key]}
      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
      {...props}
    />
  );

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      next.email = "Enter a valid email address.";
    if (register) {
      for (const key of ["name", "department", "designation"])
        if (!values[key].trim()) next[key] = "This field is required.";
      if (
        values.password.length < 10 ||
        new TextEncoder().encode(values.password).length > 72 ||
        !/[a-z]/.test(values.password) ||
        !/[A-Z]/.test(values.password) ||
        !/\d/.test(values.password)
      )
        next.password =
          "Use 10–72 characters with uppercase, lowercase and a number (maximum 72 bytes).";
          "Use 10–72 characters with uppercase, lowercase and a number.";
      if (values.password !== values.confirmPassword)
        next.confirmPassword = "Passwords do not match.";
      if (!/^[+\d\s()-]*$/.test(values.phone))
      if (values.phone && !/^[+\d\s()-]*$/.test(values.phone))
        next.phone = "Enter a valid phone number.";
    } else if (!values.password) next.password = "Enter your password.";

    setErrors(next);
    setError("");
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      if (register) {
        await authService.register(values);
        setSuccess(true);
      } else {
        const account = await login(
          { email: values.email, password: values.password },
          remember,
        );
        navigate(`/${account.role}`, { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
      setErrors(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand />
        <div>
          <p className="eyebrow">LEARNING WITH PURPOSE</p>
          <p className="eyebrow">Capacity Building Platform</p>
          <h1>
            Stronger expertise.
            <br />
            Stronger institutions.
            Professional learning with <span>measurable outcomes.</span>
          </h1>
          <p>
            A shared foundation for meteorological training and professional
            development.
            A unified institutional framework connecting role competencies,
            interactive assessments, and verified evidence.
          </p>
          <div className="auth-principle">
            <ShieldCheck size={23} />
            <span>
              Secure access.
              <br />
              <strong>Purpose-built workspaces.</strong>
            </span>
            <ShieldCheck size={22} className="text-copper-600" />
            <div>
              <strong className="block text-white font-semibold">
                Traceable Role Workspaces
              </strong>
              <span className="text-ivory-200 text-xs">
                Auditable decision records & access control
              </span>
            </div>
          </div>
        </div>
        <small>
          SAMARTHYA demonstration environment
          <br />
          Synthetic training records only
        <small className="text-ivory-200 text-xs">
          SAMARTHYA Capacity Building Platform · Synthetic Records Demo
        </small>
      </aside>

      <main className="auth-main">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to platform
        </Link>
        <div className="mb-4">
          <Link to="/" className="text-button text-xs">
            <ArrowLeft size={14} /> Back to platform
          </Link>
        </div>

        <div className="auth-form-wrap">
          {success ? (
            <div className="registration-success" role="status">
              <CheckCircle2 size={42} />
              <h1>Registration submitted</h1>
              <p>Your registration has been submitted for approval.</p>
              <p className="muted">
                You can sign in once an administrator approves your account.
            <div className="card text-center p-8">
              <CheckCircle2 size={44} className="text-status-success mx-auto mb-3" />
              <h2 className="text-xl font-bold text-plum-900">Registration Submitted</h2>
              <p className="text-sm text-ivory-700 mt-2 mb-1">
                Your account registration has been submitted for administrator review.
              </p>
              <Link className="button button-primary" to="/login">
                Back to login <ArrowRight size={16} />
              <p className="text-xs text-ivory-500 mb-6">
                You will be able to sign in once your account is approved.
              </p>
              <Link className="button button-primary inline-flex" to="/login">
                Back to Sign in <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
            <div className="card p-8">
              <p className="eyebrow">
                {register ? "START YOUR JOURNEY" : "WELCOME TO SAMARTHYA"}
                {register ? "START YOUR JOURNEY" : "ACCOUNT ACCESS"}
              </p>
              <h1>{register ? "Create your account" : "Welcome back."}</h1>
              <p className="muted">
              <h1 className="text-2xl font-bold text-plum-900 mt-1 mb-2">
                {register ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-sm text-ivory-700 mb-6">
                {register
                  ? "Tell us about your professional background."
                  : "Sign in to your capacity-building workspace."}
                  ? "Register for institutional training and capability management."
                  : "Sign in to access your role workspace."}
              </p>

              <form onSubmit={submit} noValidate className="auth-form">
                {error && (
                  <div className="error-banner" role="alert">
                    {error}
                  </div>
                )}

                {register &&
                  field("name", "Full Name", {
                    required: true,
                    autoComplete: "name",
                    maxLength: 100,
                  })}

                {field(
                  "email",
                  register ? "Official / Professional Email" : "Email",
                  register ? "Professional Email" : "Email",
                  {
                    type: "email",
                    required: true,
                    autoComplete: "email",
                    placeholder: "you@example.org",
                    placeholder: "user@example.test",
                    maxLength: 254,
                  },
                )}

                <div className={register ? "form-grid" : ""}>
                  {field("password", "Password", {
                    type: "password",
                    required: true,
                    autoComplete: register
                      ? "new-password"
                      : "current-password",
                    ...(register && {
                      hint: "10–72 characters, uppercase, lowercase and a number.",
                    }),
                    autoComplete: register ? "new-password" : "current-password",
                    hint: register ? "Min 10 chars with upper, lower & number." : undefined,
                  })}
                  {register &&
                    field("confirmPassword", "Confirm Password", {
                      type: "password",
                      required: true,
                      autoComplete: "new-password",
                    })}
                </div>

                {register ? (
                  <>
                    <Select
                      label="Role"
                      label="Workspace Role"
                      value={values.role}
                      onChange={(e) =>
                        setValues({ ...values, role: e.target.value })
                      }
                      onChange={(e) => setValues({ ...values, role: e.target.value })}
                      error={errors.role}
                    >
                      <option value="trainee">Trainee</option>
                      <option value="trainer">Trainer</option>
                    </Select>

                    <div className="form-grid">
                      {field("department", "Department", {
                        required: true,
                        maxLength: 200,
                        placeholder: "e.g. Forecasting",
                      })}
                      {field("designation", "Designation", {
                        required: true,
                        maxLength: 200,
                        placeholder: "e.g. Meteorologist",
                      })}
                    </div>

                    {field("phone", "Phone (optional)", {
                      type: "tel",
                      autoComplete: "tel",
                      maxLength: 25,
                    })}
                    <p className="text-xs muted">
                      All registrations are reviewed by an administrator before
                      access is granted.
                    </p>
                  </>
                ) : (
                  <div className="flex justify-between items-center gap-4">
                  <div className="flex justify-between items-center text-xs">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      className="text-button text-sm"
                      className="text-button text-xs"
                      onClick={() => setForgot(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                <Button loading={busy} className="w-full" type="submit">
                  {register ? "Submit registration" : "Login"}

                <Button loading={busy} className="w-full mt-2" type="submit">
                  {register ? "Submit Registration" : "Sign In"}
                  <ArrowRight size={16} />
                </Button>
              </form>
              <p className="auth-switch">
                {register
                  ? "Already have an account?"
                  : "Don't have an account?"}{" "}

              <div className="auth-switch mt-6">
                {register ? "Already have an account?" : "Don't have an account?"}{" "}
                <Link to={register ? "/login" : "/register"}>
                  {register ? "Login" : "Create account"}
                  {register ? "Sign in" : "Create account"}
                </Link>
              </p>
            </>
              </div>
            </div>
          )}
          <div className="auth-bottom">
            Protected access · Role-based permissions
          </div>
        </div>
      </main>

      {forgot && (
        <Modal title="Password assistance" onClose={close}>
          <p className="muted">
            Self-service password recovery is not available in this release.
            Contact your platform administrator for assistance with account
            access.
        <Modal title="Password Recovery" onClose={close}>
          <p className="text-sm text-ivory-700 mb-4">
            For demonstration and security purposes, password reset requests are
            handled directly by your platform administrator.
          </p>
          <div className="modal-actions">
            <Button onClick={close}>Understood</Button>
            <button className="button button-primary" onClick={close}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
