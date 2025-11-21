import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { COURSES } from "../../api/endpoints";

interface Course {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  join_code: string | null;
  join_code_enabled: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

interface CourseMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

const ROLE_OPTIONS: CourseMember["role"][] = [
  "OWNER",
  "INSTRUCTOR",
  "TA",
  "STUDENT",
];

interface StatusMessage {
  type: "success" | "error";
  text: string;
}

const initialAddMemberState = {
  email: "",
  userId: "",
  role: "STUDENT" as CourseMember["role"],
};

const initialRemoveMemberState = {
  userId: "",
};

function formatError(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as { response?: { data?: unknown; status?: number } };
    const data = axiosErr.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      return JSON.stringify(data);
    }
    if (axiosErr.response?.status) {
      return `Request failed (${axiosErr.response.status})`;
    }
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

const CourseCard = ({
  course,
  onActionComplete,
  onDelete,
}: {
  course: Course;
  onActionComplete: () => void;
  onDelete: (courseId: string, courseTitle: string) => void;
}) => {
  const [members, setMembers] = useState<CourseMember[] | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [addMemberForm, setAddMemberForm] = useState(initialAddMemberState);
  const [removeMemberForm, setRemoveMemberForm] = useState(
    initialRemoveMemberState,
  );

  const setSuccess = (text: string) =>
    setStatusMessage({ type: "success", text });
  const setErrorMessage = (text: string) =>
    setStatusMessage({ type: "error", text });

  const runAction = async (
    endpoint: string,
    payload?: Record<string, unknown>,
  ) => {
    try {
      await privateApi.post(endpoint, payload ?? {});
      setSuccess("Action completed");
      onActionComplete();
    } catch (err) {
      setErrorMessage(formatError(err));
    }
  };

  const handleLoadMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data } = await privateApi.get<CourseMember[]>(
        COURSES.MEMBERS(course.id),
      );
      setMembers(data);
      setSuccess(`Loaded ${data.length} member(s)`);
    } catch (err) {
      setErrorMessage(formatError(err));
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addMemberForm.email && !addMemberForm.userId) {
      setErrorMessage("Provide an email or user ID");
      return;
    }
    try {
      await privateApi.post(COURSES.ADD_MEMBER(course.id), {
        email: addMemberForm.email || undefined,
        user_id: addMemberForm.userId || undefined,
        role: addMemberForm.role,
      });
      setSuccess("Member added/updated");
      setAddMemberForm(initialAddMemberState);
      await handleLoadMembers();
    } catch (err) {
      setErrorMessage(formatError(err));
    }
  };

  const handleRemoveMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!removeMemberForm.userId) {
      setErrorMessage("Provide a user ID");
      return;
    }
    try {
      await privateApi.post(COURSES.REMOVE_MEMBER(course.id), {
        user_id: removeMemberForm.userId,
      });
      setSuccess("Member removed (if they existed)");
      setRemoveMemberForm(initialRemoveMemberState);
      await handleLoadMembers();
    } catch (err) {
      setErrorMessage(formatError(err));
    }
  };

  return (
    <div className="rounded-xl bg-gray-900/70 p-6 shadow-lg shadow-black/50 w-full max-w-4xl">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-semibold text-white">{course.title}</h3>
        <span
          className={`text-sm font-semibold ${
            course.status === "ACTIVE"
              ? "text-emerald-400"
              : course.status === "ARCHIVED"
              ? "text-rose-400"
              : "text-amber-300"
          }`}
        >
          {course.status}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-300">
        Members: {course.member_count} · Join code:{" "}
        {course.join_code ? (
          <span className="font-mono text-emerald-300">{course.join_code}</span>
        ) : (
          <span className="italic text-gray-400">None yet</span>
        )}{" "}
        {course.join_code_enabled ? (
          <span className="text-xs text-emerald-300 ml-1">enabled</span>
        ) : (
          <span className="text-xs text-rose-300 ml-1">disabled</span>
        )}
      </p>

      {statusMessage && (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-sm text-white">
        {course.status !== "ACTIVE" && (
          <button
            className="rounded bg-emerald-500/20 px-3 py-1 hover:bg-emerald-500/30"
            onClick={() => runAction(COURSES.ACTIVATE(course.id))}
          >
            Activate
          </button>
        )}
        {course.status !== "ARCHIVED" && (
          <button
            className="rounded bg-rose-500/20 px-3 py-1 hover:bg-rose-500/30"
            onClick={() => runAction(COURSES.ARCHIVE(course.id))}
          >
            Archive
          </button>
        )}
        <button
          className="rounded bg-indigo-500/20 px-3 py-1 hover:bg-indigo-500/30"
          onClick={() => runAction(COURSES.ROTATE_JOIN_CODE(course.id))}
        >
          Rotate code
        </button>
        <button
          className="rounded bg-sky-500/20 px-3 py-1 hover:bg-sky-500/30"
          onClick={() => runAction(COURSES.ENABLE_JOIN_CODE(course.id))}
        >
          Enable code
        </button>
        <button
          className="rounded bg-orange-500/20 px-3 py-1 hover:bg-orange-500/30"
          onClick={() => runAction(COURSES.DISABLE_JOIN_CODE(course.id))}
        >
          Disable code
        </button>
        <button
          className="rounded border border-white/20 px-3 py-1 hover:bg-white/10"
          onClick={onActionComplete}
        >
          Refresh data
        </button>
        <button
          className="rounded bg-red-600/20 px-3 py-1 text-red-300 hover:bg-red-600/30"
          onClick={() => onDelete(course.id, course.title)}
        >
          Delete
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4 md:flex-row">
        <form className="flex-1 space-y-2" onSubmit={handleAddMember}>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
            Add/Update Member
          </h4>
          <input
            className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="Email"
            value={addMemberForm.email}
            onChange={(event) =>
              setAddMemberForm((prev) => ({
                ...prev,
                email: event.target.value,
              }))
            }
          />
          <input
            className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="User ID (UUID)"
            value={addMemberForm.userId}
            onChange={(event) =>
              setAddMemberForm((prev) => ({
                ...prev,
                userId: event.target.value,
              }))
            }
          />
          <select
            className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
            value={addMemberForm.role}
            onChange={(event) =>
              setAddMemberForm((prev) => ({
                ...prev,
                role: event.target.value as CourseMember["role"],
              }))
            }
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full rounded bg-emerald-600/80 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Add/Update Member
          </button>
        </form>

        <form className="flex-1 space-y-2" onSubmit={handleRemoveMember}>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
            Remove Member
          </h4>
          <input
            className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/50"
            placeholder="User ID (UUID)"
            value={removeMemberForm.userId}
            onChange={(event) =>
              setRemoveMemberForm({ userId: event.target.value })
            }
          />
          <button
            type="submit"
            className="w-full rounded bg-rose-600/80 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600"
          >
            Remove Member
          </button>
        </form>
      </div>

      <div className="mt-6">
        <button
          onClick={handleLoadMembers}
          className="rounded bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
        >
          {loadingMembers ? "Loading members..." : "Load members"}
        </button>
        {members && (
          <div className="mt-3 max-h-60 overflow-y-auto rounded bg-gray-800/60 p-3 text-sm text-white">
            {members.length === 0 ? (
              <p className="text-gray-400">No members yet.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="uppercase text-gray-400">
                  <tr>
                    <th className="py-1 pr-2">User ID</th>
                    <th className="py-1 pr-2">Role</th>
                    <th className="py-1">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-white/5 last:border-none"
                    >
                      <td className="py-1 pr-2 font-mono text-[11px] text-gray-300">
                        {member.user_id}
                      </td>
                      <td className="py-1 pr-2">{member.role}</td>
                      <td className="py-1 text-gray-400">
                        {new Date(member.joined_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CoursesDemoPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageMessage, setPageMessage] = useState<StatusMessage | null>(null);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinResult, setJoinResult] = useState<StatusMessage | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const sortedCourses = useMemo(
    () =>
      Array.isArray(courses)
        ? [...courses].sort((a, b) =>
            a.created_at < b.created_at ? 1 : -1,
          )
        : [],
    [courses],
  );

  const notify = useCallback((message: StatusMessage | null) => {
    setPageMessage(message);
    if (message) {
      setTimeout(() => {
        setPageMessage(null);
      }, 4000);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch non-archived courses (default)
      const { data: nonArchivedData } = await privateApi.get<
        Course[] | { results: Course[] }
      >(COURSES.LIST);

      const nonArchivedArray = Array.isArray(nonArchivedData)
        ? nonArchivedData
        : nonArchivedData && typeof nonArchivedData === "object" && "results" in nonArchivedData
          ? (nonArchivedData.results as Course[])
          : [];

      // If showing archived, also fetch archived courses
      if (showArchived) {
        const { data: archivedData } = await privateApi.get<
          Course[] | { results: Course[] }
        >(`${COURSES.LIST}?status=ARCHIVED`);

        const archivedArray = Array.isArray(archivedData)
          ? archivedData
          : archivedData && typeof archivedData === "object" && "results" in archivedData
            ? (archivedData.results as Course[])
            : [];

        // Combine and deduplicate by id
        const allCourses = [...nonArchivedArray, ...archivedArray];
        const uniqueCourses = Array.from(
          new Map(allCourses.map((course) => [course.id, course])).values(),
        );
        setCourses(uniqueCourses);
      } else {
        setCourses(nonArchivedArray);
      }
    } catch (err) {
      notify({ type: "error", text: formatError(err) });
      setCourses([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, [notify, showArchived]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const handleCreateCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCourseTitle.trim()) {
      notify({ type: "error", text: "Course title is required" });
      return;
    }
    try {
      await privateApi.post(COURSES.LIST, {
        title: newCourseTitle.trim(),
      });
      setNewCourseTitle("");
      notify({ type: "success", text: "Course created" });
      await fetchCourses();
    } catch (err) {
      notify({ type: "error", text: formatError(err) });
    }
  };

  const handleJoinCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!joinCode.trim()) {
      setJoinResult({ type: "error", text: "Enter a join code" });
      return;
    }
    try {
      const { data } = await privateApi.post(COURSES.ENROLLMENT_JOIN, {
        join_code: joinCode.trim(),
      });
      setJoinResult({
        type: "success",
        text: `Joined course ${data.course_id} as ${data.role}`,
      });
      setJoinCode("");
      await fetchCourses();
    } catch (err) {
      setJoinResult({ type: "error", text: formatError(err) });
    }
  };

  const handleDeleteCourse = useCallback(
    async (courseId: string, courseTitle: string) => {
      if (
        !window.confirm(
          `Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`,
        )
      ) {
        return;
      }
      try {
        await privateApi.delete(COURSES.DETAIL(courseId));
        notify({ type: "success", text: "Course deleted" });
        await fetchCourses();
      } catch (err) {
        notify({ type: "error", text: formatError(err) });
      }
    },
    [notify, fetchCourses],
  );

  return (
    <div className="flex w-full flex-col items-center gap-6 px-4 py-10 text-white">
      <div className="w-full max-w-5xl rounded-2xl bg-gray-950/80 p-6 shadow-2xl shadow-black/60">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-emerald-300">
              Labs / Demo
            </p>
            <h1 className="text-3xl font-bold text-white">
              Courses API Playground
            </h1>
            <p className="text-sm text-gray-300">
              Use this page to sanity-check the new Courses backend endpoints.
              You must be logged in with a staff or instructor account.
            </p>
          </div>
          <Link
            to="/profile"
            className="text-sm text-sky-300 underline underline-offset-4 hover:text-sky-200"
          >
            Back to Profile
          </Link>
        </div>

        {pageMessage && (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm ${
              pageMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-rose-500/10 text-rose-300"
            }`}
          >
            {pageMessage.text}
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <form
            onSubmit={handleCreateCourse}
            className="rounded-xl border border-white/10 bg-gray-900/60 p-4 shadow-inner shadow-black/30"
          >
            <h2 className="text-lg font-semibold text-white">
              Create a course
            </h2>
            <p className="text-sm text-gray-400">
              New courses start in the DRAFT state and add you as the owner.
            </p>
            <input
              className="mt-4 w-full rounded bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Course title"
              value={newCourseTitle}
              onChange={(event) => setNewCourseTitle(event.target.value)}
            />
            <button
              type="submit"
              className="mt-3 w-full rounded bg-emerald-600/90 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Create
            </button>
          </form>

          <form
            onSubmit={handleJoinCourse}
            className="rounded-xl border border-white/10 bg-gray-900/60 p-4 shadow-inner shadow-black/30"
          >
            <h2 className="text-lg font-semibold text-white">
              Join via code
            </h2>
            <p className="text-sm text-gray-400">
              Works only for active courses with join codes enabled.
            </p>
            <input
              className="mt-4 w-full rounded bg-gray-800 px-3 py-2 text-sm uppercase tracking-widest text-white outline-none focus:ring-2 focus:ring-sky-500/50"
              placeholder="JOINCODE"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
            />
            <button
              type="submit"
              className="mt-3 w-full rounded bg-sky-600/90 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
            >
              Join course
            </button>
            {joinResult && (
              <p
                className={`mt-3 text-sm ${
                  joinResult.type === "success"
                    ? "text-emerald-300"
                    : "text-rose-300"
                }`}
              >
                {joinResult.text}
              </p>
            )}
          </form>
        </div>
      </div>

      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Your courses</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => {
                  setShowArchived(e.target.checked);
                }}
                className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
              />
              Show archived
            </label>
            <button
              onClick={() => void fetchCourses()}
              className="rounded border border-white/20 px-3 py-1 text-sm text-white hover:bg-white/10"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        {sortedCourses.length === 0 ? (
          <p className="rounded-xl bg-gray-900/60 p-6 text-center text-sm text-gray-400">
            No courses yet. Create one above or join via code.
          </p>
        ) : (
          sortedCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onActionComplete={() => void fetchCourses()}
              onDelete={handleDeleteCourse}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CoursesDemoPage;




