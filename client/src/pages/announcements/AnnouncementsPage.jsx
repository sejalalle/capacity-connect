import { useCallback, useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { part2 } from "../../services/part2Service";
import { errorMessage } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";

const CATEGORIES = [
  "ANNOUNCEMENT",
  "NOTIFICATION",
  "ACHIEVEMENT",
  "NEW_CONTENT",
];
const AUDIENCES = ["ALL", "TRAINEE", "TRAINER", "ADMIN"];

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === "admin";
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    category: "ANNOUNCEMENT",
    audience: "ALL",
    showOnHomepage: true,
    pinned: false,
  });

  const load = useCallback(async () => {
    setError("");
    try {
      setRows(await part2.get("/announcements"));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(op, message) {
    setBusy(true);
    try {
      await op();
      toast(message);
      await load();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Coordinator-published notifications, announcements, achievements and new learning content. Published items marked for the homepage also appear on the public landing page."
      />
      {error ? (
        <div className="error-banner" role="alert">
          {error}
          <Button onClick={load}>Retry</Button>
        </div>
      ) : !rows ? (
        <LoadingState />
      ) : (
        <>
          {isAdmin && (
            <Card title="Publish an announcement">
              <form
                className="auth-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await act(
                    () => part2.post("/announcements", form),
                    "Announcement saved as draft",
                  );
                  setForm({
                    category: "ANNOUNCEMENT",
                    audience: "ALL",
                    showOnHomepage: true,
                    pinned: false,
                  });
                }}
              >
                <label>
                  Title
                  <input
                    required
                    minLength={4}
                    value={form.title || ""}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </label>
                <label>
                  Message
                  <textarea
                    required
                    minLength={4}
                    value={form.body || ""}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                  />
                </label>
                <label>
                  Short summary (optional)
                  <input
                    value={form.summary || ""}
                    onChange={(e) =>
                      setForm({ ...form, summary: e.target.value })
                    }
                  />
                </label>
                <label>
                  Category
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Audience
                  <select
                    value={form.audience}
                    onChange={(e) =>
                      setForm({ ...form, audience: e.target.value })
                    }
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.showOnHomepage}
                    onChange={(e) =>
                      setForm({ ...form, showOnHomepage: e.target.checked })
                    }
                  />
                  Show on the public homepage
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.pinned}
                    onChange={(e) =>
                      setForm({ ...form, pinned: e.target.checked })
                    }
                  />
                  Pin to the top
                </label>
                <Button loading={busy} type="submit">
                  Save draft
                </Button>
              </form>
            </Card>
          )}

          {!rows.length ? (
            <EmptyState
              title="No announcements"
              description={
                isAdmin
                  ? "Create a draft above, then publish it to notify the selected audience."
                  : "Published announcements for your role will appear here."
              }
            />
          ) : (
            rows.map((row) => (
              <Card
                key={row._id}
                title={`${row.pinned ? "📌 " : ""}${row.title}`}
                subtitle={`${row.category.replaceAll("_", " ")} · audience ${row.audience}`}
                action={<StatusBadge status={row.status} />}
              >
                <p>{row.body}</p>
                <p className="muted">
                  {row.publishAt
                    ? `Published ${new Date(row.publishAt).toLocaleDateString()}`
                    : "Not yet published"}
                  {row.createdBy?.name ? ` · ${row.createdBy.name}` : ""}
                </p>
                {isAdmin && (
                  <div className="button-row">
                    {row.status === "DRAFT" && (
                      <Button
                        loading={busy}
                        onClick={() =>
                          act(
                            () =>
                              part2.post(`/announcements/${row._id}/publish`, {
                                reason: "Published from the announcements workspace",
                              }),
                            "Announcement published",
                          )
                        }
                      >
                        Publish
                      </Button>
                    )}
                    {row.status !== "ARCHIVED" && (
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() =>
                          act(
                            () =>
                              part2.post(`/announcements/${row._id}/archive`, {
                                reason: "Archived from the announcements workspace",
                              }),
                            "Announcement archived",
                          )
                        }
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </>
      )}
    </>
  );
}
