import { useCallback, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import Brand from "../../components/ui/Brand";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

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
          "Use 10–72 characters with uppercase, lowercase and a number.";
      if (values.password !== values.confirmPassword)
        next.confirmPassword = "Passwords do not match.";
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
          <p className="eyebrow">Capacity Building Platform</p>
          <h1>
            Professional learning with <span>measurable outcomes.</span>
          </h1>
          <p>
            A meteorological learning and competency development platform.
            Connect role requirements, learning and human-reviewed evidence.
          </p>
          <div className="auth-principle">
            <ShieldCheck size={22} className="text-copper-600" />
            <div>
              <strong className="block text-ivory-900 font-semibold">
                Traceable Role Workspaces
              </strong>
              <span className="text-ivory-700 text-xs">
                Auditable decision records & access control
              </span>
            </div>
          </div>
        </div>
        <small className="text-ivory-700 text-xs">
          SAMARTHYA Capacity Building Platform · Synthetic Records Demo
        </small>
      </aside>

      <main className="auth-main">
        <div className="mb-4">
          <Link to="/" className="text-button text-xs">
            <ArrowLeft size={14} /> Back to platform
          </Link>
        </div>

        <div className="auth-form-wrap">
          {success ? (
            <div className="card text-center p-8">
              <CheckCircle2
                size={44}
                className="text-status-success mx-auto mb-3"
              />
              <h2 className="text-xl font-bold text-plum-900">
                Registration Submitted
              </h2>
              <p className="text-sm text-ivory-700 mt-2 mb-1">
                Your registration has been submitted for approval.
              </p>
              <p className="text-xs text-ivory-500 mb-6">
                You will be able to sign in once your account is approved.
              </p>
              <Link className="button button-primary inline-flex" to="/login">
                Back to login <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="card p-8">
              <p className="eyebrow">
                {register ? "START YOUR JOURNEY" : "ACCOUNT ACCESS"}
              </p>
              <h1 className="text-2xl font-bold text-plum-900 mt-1 mb-2">
                {register ? "Create your account" : "Welcome back."}
              </h1>
              <p className="text-sm text-ivory-700 mb-6">
                {register
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
                  {
                    type: "email",
                    required: true,
                    autoComplete: "email",
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
                    hint: register
                      ? "Min 10 chars with upper, lower & number."
                      : undefined,
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
                    <fieldset className="role-choices">
                      <legend>Workspace Role</legend>
                      <p>
                        Choose the access you want to request. Account approval
                        is required.
                      </p>
                      <div className="form-grid">
                        {[
                          [
                            "trainee",
                            "Trainee",
                            "Learn, practise and build reviewed evidence.",
                          ],
                          [
                            "trainer",
                            "Trainer",
                            "Create courses and deliver assigned training.",
                          ],
                        ].map(([value, title, description]) => (
                          <label
                            key={value}
                            className={
                              values.role === value
                                ? "role-choice selected"
                                : "role-choice"
                            }
                          >
                            <input
                              type="radio"
                              name="role"
                              value={value}
                              checked={values.role === value}
                              onChange={() =>
                                setValues({ ...values, role: value })
                              }
                            />
                            <strong>{title}</strong>
                            <span>{description}</span>
                          </label>
                        ))}
                      </div>
                      {errors.role && <p role="alert">{errors.role}</p>}
                      <p>
                        Administrator access is provisioned separately.{" "}
                        <Link to="/login">Sign in to an existing account</Link>.
                      </p>
                    </fieldset>

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
                  </>
                ) : (
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
                      className="text-button text-xs"
                      onClick={() => setForgot(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button loading={busy} className="w-full mt-2" type="submit">
                  {register ? "Submit registration" : "Login"}
                  <ArrowRight size={16} />
                </Button>
              </form>

              <div className="auth-switch mt-6">
                {register
                  ? "Already have an account?"
                  : "Don't have an account?"}{" "}
                <Link to={register ? "/login" : "/register"}>
                  {register ? "Sign in" : "Create account"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {forgot && (
        <Modal title="Password Recovery" onClose={close}>
          <p className="text-sm text-ivory-700 mb-4">
            For demonstration and security purposes, password reset requests are
            handled directly by your platform administrator.
          </p>
          <div className="modal-actions">
            <button className="button button-primary" onClick={close}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
