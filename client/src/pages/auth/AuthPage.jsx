import { useCallback, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  BarChart3,
  Users,
} from "lucide-react";
import Brand, { AshokaEmblem } from "../../components/ui/Brand";
import VerticalDecorativeTag from "../../components/ui/VerticalDecorativeTag";
import { ObservatoryGraphic } from "../../components/ui/QuoteCallout";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import useAuth from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import { errorMessage, fieldErrors } from "../../services/api";

export default function AuthPage({ register = false }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") || "trainee";

  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: initialRole,
    department: "",
    designation: "",
    phone: "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [remember, setRemember] = useState(false);
  const [forgot, setForgot] = useState(false);

  const close = useCallback(() => setForgot(false), []);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  const field = (key, label, props = {}) => (
    <Input
      label={label}
      id={key}
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
    <div className="min-h-screen bg-[#F5F8FC] flex flex-col lg:flex-row">
      {/* Left Story / Graphic Panel */}
      <div className="w-full lg:w-[42%] bg-[#EFF4FC] border-r border-[#D9E3F0] p-6 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-start justify-between">
            <Brand showTagline />
            <VerticalDecorativeTag className="hidden sm:flex" />
          </div>

          <div className="my-8 text-center sm:text-left">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#101B46] tracking-tight mb-2 leading-tight">
              Building Competent People for a Weather-Ready India
            </h1>
            <p className="text-xs text-[#475875]">
              Connecting role requirements, competency frameworks, and verified evidence.
            </p>
          </div>

          <div className="flex justify-center my-6">
            <ObservatoryGraphic className="w-32 h-32 text-[#155CC4]" />
          </div>

          <div className="space-y-4 max-w-md mx-auto sm:mx-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white border border-[#D9E3F0] flex items-center justify-center text-[#155CC4] shrink-0">
                <BookOpen size={16} />
              </div>
              <span className="text-xs font-semibold text-[#101B46]">Learn from expert trainers</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white border border-[#D9E3F0] flex items-center justify-center text-[#155CC4] shrink-0">
                <BarChart3 size={16} />
              </div>
              <span className="text-xs font-semibold text-[#101B46]">Develop real-world skills</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white border border-[#D9E3F0] flex items-center justify-center text-[#155CC4] shrink-0">
                <Users size={16} />
              </div>
              <span className="text-xs font-semibold text-[#101B46]">Contribute to a safer, more resilient India</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[#D9E3F0] flex justify-between items-center text-[11px] text-[#687181]">
          <span>INDIAN METEOROLOGICAL DEPARTMENT</span>
          <span>Ministry of Earth Sciences</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 bg-white p-6 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#155CC4] hover:underline">
              <ArrowLeft size={14} /> Back to home
            </Link>
          </div>

          {success ? (
            <div className="bg-white border border-[#D9E3F0] rounded-2xl p-8 text-center shadow-sm">
              <CheckCircle2 size={48} className="text-[#16A34A] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#101B46] mb-2">Registration Submitted</h2>
              <p className="text-sm text-[#475875] mb-2">
                Your registration has been submitted for approval.
              </p>
              <p className="text-xs text-[#687181] mb-6">
                You will be able to sign in once an administrator approves your account.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#155CC4] hover:bg-[#104A9E] text-white text-xs font-bold rounded-xl no-underline"
              >
                Back to login <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-[#D9E3F0] rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-extrabold text-[#101B46] tracking-tight mb-1">
                  {register ? "Create your account" : "Welcome back."}
                </h2>
                <p className="text-xs text-[#475875]">
                  {register ? "Register for IMD competency development." : "Sign in to continue your learning journey"}
                </p>
              </div>

              {/* Login / Sign Up Tab Toggle */}
              <div className="flex border-b border-[#D9E3F0] mb-6">
                <Link
                  to="/login"
                  className={`flex-1 pb-2.5 text-center text-xs font-bold no-underline transition-colors ${
                    !register
                      ? "text-[#155CC4] border-b-2 border-[#155CC4]"
                      : "text-[#687181] hover:text-[#101B46]"
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className={`flex-1 pb-2.5 text-center text-xs font-bold no-underline transition-colors ${
                    register
                      ? "text-[#155CC4] border-b-2 border-[#155CC4]"
                      : "text-[#687181] hover:text-[#101B46]"
                  }`}
                >
                  Sign Up
                </Link>
              </div>

              <form onSubmit={submit} noValidate className="space-y-4">
                {error && (
                  <div className="p-3 bg-[#FEF3F2] border border-[#FECDD3] rounded-lg text-xs text-[#B42318] font-medium" role="alert">
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
                  }
                )}

                <div className={register ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}>
                  {field("password", "Password", {
                    type: "password",
                    required: true,
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
                    <fieldset className="p-3 border border-[#D9E3F0] rounded-xl">
                      <legend className="text-xs font-bold text-[#101B46] px-1">Workspace Role</legend>
                      <p className="text-[11px] text-[#687181] mb-2">
                        Choose the access you want to request. Account approval is required.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-xs font-semibold ${
                            values.role === "trainee" ? "border-[#155CC4] bg-[#EAF3FF] text-[#155CC4]" : "border-[#D9E3F0] text-[#475875]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value="trainee"
                            checked={values.role === "trainee"}
                            onChange={() => setValues({ ...values, role: "trainee" })}
                            className="text-[#155CC4]"
                          />
                          <span>Trainee</span>
                        </label>
                        <label
                          className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-xs font-semibold ${
                            values.role === "trainer" ? "border-[#155CC4] bg-[#EAF3FF] text-[#155CC4]" : "border-[#D9E3F0] text-[#475875]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value="trainer"
                            checked={values.role === "trainer"}
                            onChange={() => setValues({ ...values, role: "trainer" })}
                            className="text-[#155CC4]"
                          />
                          <span>Trainer</span>
                        </label>
                      </div>
                      {errors.role && <p className="text-[11px] text-[#B42318] mt-1">{errors.role}</p>}
                    </fieldset>

                    <div className="grid grid-cols-2 gap-3">
                      {field("department", "Department", {
                        required: true,
                        maxLength: 200,
                        placeholder: "e.g. Forecasting",
                      })}
                      {field("designation", "Designation", {
                        required: true,
                        maxLength: 200,
                        placeholder: "e.g. Officer (Trainee)",
                      })}
                    </div>

                    {field("phone", "Phone (optional)", {
                      type: "tel",
                      autoComplete: "tel",
                      maxLength: 25,
                    })}
                  </>
                ) : (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-[#475875] font-medium select-none">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="rounded text-[#155CC4] focus:ring-[#155CC4]"
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgot(true)}
                      className="text-[#155CC4] font-semibold hover:underline bg-transparent border-0 p-0 cursor-pointer"
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

              {!register && (
                <>
                  <div className="flex items-center gap-4 my-5">
                    <div className="flex-1 h-px bg-[#D9E3F0]" />
                    <span className="text-[11px] text-[#687181] font-semibold uppercase">or</span>
                    <div className="flex-1 h-px bg-[#D9E3F0]" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setValues({ ...values, email: "asha.sharma@example.test", password: "DemoOnly!2026" });
                    }}
                    className="w-full py-2.5 px-4 bg-white hover:bg-[#F5F8FC] border border-[#D9E3F0] text-[#101B46] text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2.5"
                  >
                    <AshokaEmblem className="w-4 h-4 text-[#155CC4]" />
                    <span>Continue with IMD SSO</span>
                  </button>

                  <p className="text-center text-[11px] text-[#687181] mt-6 mb-0">
                    Don&apos;t have an account?{" "}
                    <Link to="/register" className="text-[#155CC4] font-bold hover:underline">
                      Contact your administrator
                    </Link>
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {forgot && (
        <Modal title="Password Recovery" onClose={close}>
          <p className="text-xs text-[#475875] mb-4">
            For institutional security, password reset requests are handled directly by your IMD Platform Administrator.
          </p>
          <div className="flex justify-end">
            <button
              onClick={close}
              className="px-4 py-2 bg-[#155CC4] text-white text-xs font-bold rounded-lg"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
