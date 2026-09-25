import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, BarChart3, Users, GraduationCap, Presentation, Settings } from "lucide-react";
import api from "../../services/api";
import Brand from "../../components/ui/Brand";
import VerticalDecorativeTag from "../../components/ui/VerticalDecorativeTag";

export default function LandingPage() {
  const [selectedRole, setSelectedRole] = useState("trainee");
  const [announcements, setAnnouncements] = useState([]);
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate(`/register?role=${selectedRole}`);
  };

  useEffect(() => {
    let active = true;
    api
      .get("/announcements/public")
      .then((response) => {
        if (active) setAnnouncements(response.data.data || []);
      })
      .catch(() => {
        if (active) setAnnouncements([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F8FC] flex flex-col lg:flex-row">
      {/* Left Benefit Panel (~40% width) */}
      <div className="w-full lg:w-[40%] bg-[#EFF4FC] border-r border-[#D9E3F0] p-6 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="mb-8">
            <Brand showTagline />
          </div>

          <div className="w-12 h-1 bg-[#155CC4] mb-6 rounded-full" />

          <h1 className="text-3xl lg:text-4xl font-extrabold text-[#101B46] tracking-tight mb-2 leading-tight">
            Turn training needs into demonstrated capability
          </h1>
          <h2 className="text-xl font-bold text-[#155CC4] mb-4">
            Build Skills for a Weather-Ready India
          </h2>

          <p className="text-sm text-[#475875] leading-relaxed mb-8">
            Samarthya is the learning and competency development platform for the Indian Meteorological Department,
            designed to enhance skills, build expertise and strengthen our people.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-white border border-[#D9E3F0] flex items-center justify-center text-[#155CC4] shrink-0 shadow-sm">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#101B46] m-0 mb-0.5">Learn from expert trainers</h3>
                <p className="text-xs text-[#687181] m-0 leading-normal">Access high-quality learning resources</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-white border border-[#D9E3F0] flex items-center justify-center text-[#155CC4] shrink-0 shadow-sm">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#101B46] m-0 mb-0.5">Develop role-relevant skills</h3>
                <p className="text-xs text-[#687181] m-0 leading-normal">Build and demonstrate competencies</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-white border border-[#D9E3F0] flex items-center justify-center text-[#155CC4] shrink-0 shadow-sm">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#101B46] m-0 mb-0.5">Contribute to a safer, more resilient India</h3>
                <p className="text-xs text-[#687181] m-0 leading-normal">Be part of a stronger weather future</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#D9E3F0]">
          <p className="text-[11px] font-bold text-[#475875] uppercase tracking-wider m-0">
            Indian Meteorological Department
          </p>
          <p className="text-[11px] text-[#687181] m-0">Ministry of Earth Sciences, Government of India</p>
        </div>
      </div>

      {/* Right Content Panel (White) */}
      <div className="flex-1 bg-white p-6 lg:p-12 flex flex-col justify-between">
        <div className="flex justify-end mb-6">
          <VerticalDecorativeTag />
        </div>

        <div className="max-w-xl mx-auto w-full">
          {/* 3-Step Horizontal Stepper */}
          <div className="flex items-center justify-center mb-10">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#155CC4] text-white flex items-center justify-center text-xs font-bold ring-4 ring-[#EAF3FF]">
                  1
                </div>
                <span className="text-[11px] font-bold text-[#155CC4] mt-1.5 whitespace-nowrap">Choose Profile</span>
              </div>

              <div className="w-16 h-0.5 bg-[#D9E3F0] -mt-5" />

              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-[#D9E3F0] text-[#6B7280] flex items-center justify-center text-xs font-semibold">
                  2
                </div>
                <span className="text-[11px] font-medium text-[#687181] mt-1.5 whitespace-nowrap">Create Account</span>
              </div>

              <div className="w-16 h-0.5 bg-[#D9E3F0] -mt-5" />

              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-[#D9E3F0] text-[#6B7280] flex items-center justify-center text-xs font-semibold">
                  3
                </div>
                <span className="text-[11px] font-medium text-[#687181] mt-1.5 whitespace-nowrap">Get Started</span>
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-[#101B46] mb-2 tracking-tight">Create Your Account</h2>
            <p className="text-sm text-[#475875] m-0">Select your role to get started</p>
          </div>

          {/* 3 Selectable Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Trainee Card */}
            <div
              onClick={() => setSelectedRole("trainee")}
              className={`border-2 rounded-2xl p-5 cursor-pointer flex flex-col items-center text-center transition-all ${
                selectedRole === "trainee"
                  ? "border-[#155CC4] bg-[#F5F8FC] shadow-sm"
                  : "border-[#D9E3F0] bg-white hover:border-[#155CC4]/50"
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-[#EAF3FF] text-[#155CC4] flex items-center justify-center mb-3">
                <GraduationCap size={28} />
              </div>
              <h3 className="text-base font-bold text-[#101B46] mb-1">Trainee</h3>
              <p className="text-xs text-[#687181] leading-relaxed mb-4 flex-1">
                I want to learn, improve my skills and build my competencies.
              </p>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedRole === "trainee" ? "border-[#155CC4] bg-[#155CC4]" : "border-[#D9E3F0] bg-white"
                }`}
              >
                {selectedRole === "trainee" && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            {/* Trainer Card */}
            <div
              onClick={() => setSelectedRole("trainer")}
              className={`border-2 rounded-2xl p-5 cursor-pointer flex flex-col items-center text-center transition-all ${
                selectedRole === "trainer"
                  ? "border-[#155CC4] bg-[#F5F8FC] shadow-sm"
                  : "border-[#D9E3F0] bg-white hover:border-[#155CC4]/50"
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center mb-3">
                <Presentation size={28} />
              </div>
              <h3 className="text-base font-bold text-[#101B46] mb-1">Trainer</h3>
              <p className="text-xs text-[#687181] leading-relaxed mb-4 flex-1">
                I want to create and deliver training, mentor learners and contribute to capability building.
              </p>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedRole === "trainer" ? "border-[#155CC4] bg-[#155CC4]" : "border-[#D9E3F0] bg-white"
                }`}
              >
                {selectedRole === "trainer" && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            {/* Administrator Card */}
            <div
              onClick={() => setSelectedRole("admin")}
              className={`border-2 rounded-2xl p-5 cursor-pointer flex flex-col items-center text-center transition-all ${
                selectedRole === "admin"
                  ? "border-[#155CC4] bg-[#F5F8FC] shadow-sm"
                  : "border-[#D9E3F0] bg-white hover:border-[#155CC4]/50"
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mb-3">
                <Settings size={28} />
              </div>
              <h3 className="text-base font-bold text-[#101B46] mb-1">Administrator</h3>
              <p className="text-xs text-[#687181] leading-relaxed mb-4 flex-1">
                I want to manage the platform, users, content and overall operations.
              </p>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedRole === "admin" ? "border-[#155CC4] bg-[#155CC4]" : "border-[#D9E3F0] bg-white"
                }`}
              >
                {selectedRole === "admin" && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="w-full py-3 px-6 bg-[#155CC4] hover:bg-[#104A9E] text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 mb-6"
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#D9E3F0]" />
            <span className="text-xs text-[#687181] font-medium uppercase">or</span>
            <div className="flex-1 h-px bg-[#D9E3F0]" />
          </div>

          <p className="text-center text-sm text-[#475875]">
            Already have an account?{" "}
            <Link to="/login" className="text-[#155CC4] font-bold hover:underline">
              Sign In
            </Link>
          </p>

          {announcements.length > 0 && (
            <div className="mt-10 pt-6 border-t border-[#D9E3F0]">
              <h3 className="text-[11px] font-bold text-[#475875] uppercase tracking-wider mb-4">
                Latest updates
              </h3>
              <div className="space-y-3">
                {announcements.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-xl border border-[#D9E3F0] bg-[#F5F8FC] p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {item.pinned && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#155CC4]">
                          Pinned
                        </span>
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#687181]">
                        {item.category?.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#101B46] m-0 mb-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#475875] m-0 leading-relaxed">
                      {item.summary || item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div />
      </div>
    </div>
  );
}
