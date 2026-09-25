import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import LoadingState from "../ui/LoadingState";
import StatusBadge from "../ui/StatusBadge";
import { useToast } from "../ui/Toast";
import { errorMessage } from "../../services/api";
import { part3 } from "../../services/part3Service";

export const formatBytes = (bytes) =>
  `${((bytes || 0) / (1024 * 1024)).toFixed(1)} MB`;
export const formatClock = (seconds) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

function LecturePlayer({ asset, saved, onProgress }) {
  const resumed = useRef(false);
  const lastSent = useRef(0);
  const duration = useRef(0);
  const resumeAt = saved?.positionSeconds || 0;
  return (
    <>
      <video
        className="lecture-player"
        controls
        preload="metadata"
        src={part3.media.streamUrl(asset._id)}
        onLoadedMetadata={(event) => {
          duration.current = event.currentTarget.duration || 0;
          if (
            !resumed.current &&
            resumeAt > 0 &&
            resumeAt < duration.current - 1
          )
            event.currentTarget.currentTime = resumeAt;
          resumed.current = true;
        }}
        onTimeUpdate={(event) => {
          const now = Date.now();
          if (!onProgress || now - lastSent.current < 5000) return;
          lastSent.current = now;
          onProgress(
            asset._id,
            event.currentTarget.currentTime,
            duration.current,
          );
        }}
        onEnded={(event) =>
          onProgress?.(
            asset._id,
            event.currentTarget.duration || 0,
            duration.current,
          )
        }
      />
      <p className="muted text-sm">
        {saved?.completed
          ? "Completed"
          : `Playback resumes from ${formatClock(resumeAt)}`}
      </p>
    </>
  );
}

export default function VideoLibrary({ user }) {
  const toast = useToast();
  const canUpload = user.role === "trainer" || user.role === "admin";
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ course: "", title: "" });

  const load = useCallback(async () => {
    setError("");
    try {
      const [media, options] = await Promise.all([
        part3.media.list(),
        canUpload ? part3.media.uploadableCourses() : Promise.resolve([]),
      ]);
      setData(media);
      setCourses(options);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [canUpload]);
  useEffect(() => {
    load();
  }, [load]);

  const upload = async (event) => {
    event.preventDefault();
    if (!file || !form.course) return;
    setBusy(true);
    setPercent(0);
    try {
      await part3.media.upload(
        form.course,
        file,
        { title: form.title },
        (progressEvent) => {
          const total = progressEvent.total || file.size || 1;
          setPercent(Math.round((progressEvent.loaded / total) * 100));
        },
      );
      toast("Recording stored and available");
      setFile(null);
      setForm({ course: "", title: "" });
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setBusy(false);
      setPercent(0);
      await load();
    }
  };

  const remove = async (asset) => {
    setBusy(true);
    try {
      await part3.media.remove(asset._id);
      toast("Recording removed");
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setBusy(false);
      await load();
    }
  };

  const saveProgress = (id, positionSeconds, durationSeconds) =>
    part3.media
      .saveProgress(id, { positionSeconds, durationSeconds })
      .catch(() => {});

  if (error)
    return (
      <Card title="Recorded lectures">
        <div className="error-banner" role="alert">
          {error}
          <Button onClick={load}>Retry</Button>
        </div>
      </Card>
    );
  if (!data) return <LoadingState label="Loading recorded lectures…" />;
  const assets = data.assets || [];

  return (
    <>
      {canUpload && (
        <Card
          title="Add a recorded lecture"
          subtitle="Direct upload only in this build — no transcoding pipeline. Processing shows before a recording becomes available to trainees."
        >
          <form className="auth-form" onSubmit={upload}>
            <label>
              Course
              <select
                required
                value={form.course}
                onChange={(event) =>
                  setForm({ ...form, course: event.target.value })
                }
              >
                <option value="">Select a course you manage</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title} · {course.code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lecture title
              <input
                required
                minLength={4}
                maxLength={200}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>
            <label>
              Video file
              <input
                required
                type="file"
                accept="video/mp4,video/webm"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            <p className="muted text-sm">
              MP4 or WebM, up to 25 MB. Uploads stay private and follow course
              access.
            </p>
            {busy && percent > 0 && (
              <p className="muted text-sm">Uploading… {percent}%</p>
            )}
            <Button loading={busy} disabled={!file} type="submit">
              Upload recording
            </Button>
          </form>
        </Card>
      )}
      <Card
        title={user.role === "trainee" ? "Video lectures" : "Recorded lectures"}
        subtitle={
          user.role === "trainee"
            ? "Recordings published for your enrolled courses. Playback progress is saved."
            : "Upload status and processing state for your course recordings."
        }
      >
        {!assets.length ? (
          <EmptyState
            title="No recorded lectures"
            description={
              canUpload
                ? "Uploaded recordings appear here with their processing status."
                : "Recordings for your enrolled courses will appear here."
            }
          />
        ) : (
          assets.map((asset) => (
            <div className="media-row" key={asset._id}>
              <div className="media-heading">
                <div>
                  <strong>{asset.title}</strong>
                  <p className="muted text-sm">
                    {asset.course?.title || "Course"} ·{" "}
                    {formatBytes(asset.size)}
                  </p>
                </div>
                <StatusBadge status={asset.status} />
              </div>
              {asset.status === "READY" && (
                <LecturePlayer
                  asset={asset}
                  saved={data.progress?.[asset._id]}
                  onProgress={user.role === "trainee" ? saveProgress : undefined}
                />
              )}
              {asset.status === "PROCESSING" && (
                <p className="muted text-sm">
                  Processing — not yet available to trainees.
                </p>
              )}
              {asset.status === "FAILED" && (
                <p className="muted text-sm">
                  {asset.failureReason || "Upload failed."}
                </p>
              )}
              {asset.status === "TAKEN_DOWN" && (
                <p className="muted text-sm">
                  Withdrawn by a coordinator
                  {asset.moderationReason ? `: ${asset.moderationReason}` : "."}
                </p>
              )}
              {canUpload &&
                (user.role === "admin" || asset.owner?._id === user._id) && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => remove(asset)}
                  >
                    Remove
                  </Button>
                )}
            </div>
          ))
        )}
      </Card>
    </>
  );
}
