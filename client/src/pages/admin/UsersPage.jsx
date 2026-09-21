import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Select from "../../components/ui/Select";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import useUsers from "../../hooks/useUsers";
import UserTable from "./UserTable";
export default function UsersPage() {
  const [role, setRole] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1);
  const { data, loading, error, refresh } = useUsers({ role, status, page });
  return (
    <>
      <PageHeader
        eyebrow="ACCESS MANAGEMENT"
        title="Users"
        description="Review registrations and manage access to the platform."
      />
      <Card>
        <div className="filter-bar">
          <Select
            label="Role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {["trainee", "trainer", "admin"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            label="Account status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {["pending", "approved", "rejected", "suspended"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>
        {loading ? (
          <LoadingState label="Loading users…" />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : data.users.length ? (
          <UserTable users={data.users} refresh={refresh} />
        ) : (
          <EmptyState
            title="No users found"
            description="Try another role or account status filter."
          />
        )}
        {data && !loading && !error && (
          <div className="pagination">
            <span>
              {data.pagination.total} users · Page {page} of{" "}
              {Math.max(1, data.pagination.pages)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= data.pagination.pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
