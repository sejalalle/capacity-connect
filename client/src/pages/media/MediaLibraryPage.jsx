import { useCallback, useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { formatBytes } from "../../components/media/VideoLibrary";
import { errorMessage } from "../../services/api";
import { part3 } from "../../services/part3Service";

export default function MediaLibraryPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState({});

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await part3.media.list());
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (asset, status) => {
    setBusy(true);
    try {
      await part3.media.moderate(asset._id, {
        status,
        reason: reasons[asset._id] || "",
      });
      toast(
        status === "TAKEN_DOWN" ? "Recording taken down" : "Recording restored",
      );
      setReasons({ ...reasons, [asset._id]: "" });
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setBusy(false);
      await load();
    }
  };

  const storage = data?.storage;
  return (
    <>
      <PageHeader
        title="Media Library"
        eyebrow="Admin"
        description="Every uploaded recording across courses, with processing status, storage usage and takedown control. Direct uploads only — this build has no transcoding pipeline."
      />
      {error ? (
        <div className="error-banner" role="alert">
          {error}
          <Button onClick={load}>Retry</Button>
        </div>
      ) : !data ? (
        <LoadingState label="Loading media library…" />
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi">
              <span>Ready storage</span>
              <strong>{formatBytes(storage.totalBytes)}</strong>
            </div>
            <div className="kpi">
              <span>Ready</span>
              <strong>{storage.readyCount}</strong>
            </div>
            <div className="kpi">
              <span>Processing</span>
              <strong>{storage.processingCount}</strong>
            </div>
            <div className="kpi">
              <span>Failed or withdrawn</span>
              <strong>{storage.failedCount + storage.takenDownCount}</strong>
            </div>
          </div>
          <Card title="Uploaded recordings">
            {!data.assets.length ? (
              <EmptyState
                title="No recordings uploaded"
                description="Trainer uploads across courses appear here."
              />
            ) : (
              data.assets.map((asset) => (
                <div className="media-row" key={asset._id}>
                  <div className="media-heading">
                    <div>
                      <strong>{asset.title}</strong>
                      <p className="muted text-sm">
                        {asset.course?.title || "Course"} ·{" "}
                        {asset.owner?.name || "Uploader"} ·{" "}
                        {formatBytes(asset.size)}
                      </p>
                    </div>
                    <StatusBadge status={asset.status} />
                  </div>
                  {asset.status === "FAILED" && (
                    <p className="muted text-sm">
                      {asset.failureReason || "Upload failed."}
                    </p>
                  )}
                  {asset.status === "TAKEN_DOWN" && (
                    <p className="muted text-sm">
                      Withdrawn
                      {asset.moderatedBy?.name
                        ? ` by ${asset.moderatedBy.name}`
                        : ""}
                      {asset.moderationReason
                        ? `: ${asset.moderationReason}`
                        : "."}
                    </p>
                  )}
                  {(asset.status === "READY" ||
                    asset.status === "TAKEN_DOWN") && (
                    <form
                      className="auth-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        moderate(
                          asset,
                          asset.status === "READY" ? "TAKEN_DOWN" : "READY",
                        );
                      }}
                    >
                      <label>
                        Moderation reason
                        <textarea
                          required
                          minLength={4}
                          maxLength={3000}
                          value={reasons[asset._id] || ""}
                          onChange={(event) =>
                            setReasons({
                              ...reasons,
                              [asset._id]: event.target.value,
                            })
                          }
                        />
                      </label>
                      <Button type="submit" loading={busy}>
                        {asset.status === "READY"
                          ? "Take down"
                          : "Restore to trainees"}
                      </Button>
                    </form>
                  )}
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </>
  );
}
