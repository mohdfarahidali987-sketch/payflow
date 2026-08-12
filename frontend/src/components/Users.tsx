import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { User } from "./User";

interface UserType {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
}

export const Users = () => {
  const [filter, setFilter] = useState("");
  const [users, setUsers] = useState<UserType[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await api.get(
          `/api/v1/user/bulk?filter=${filter}`
        );

        setUsers(response.data.user);
      } catch (err) {
        console.log(err);
      }
    }

    fetchUsers();
  }, [filter]);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-xl text-slate-900">
            Users
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Search for a user to send money
          </p>
        </div>

        <span className="text-sm text-slate-500">
          {users.length} {users.length === 1 ? "user" : "users"}
        </span>
      </div>

      <div className="mb-5">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          type="text"
          placeholder="Search by name or username..."
          className="w-full border border-slate-300 rounded-xl px-5 py-4 text-lg 
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 
                     focus:border-transparent transition"
        />
      </div>

      <div className="space-y-3">
        {users.length > 0 ? (
          users.map((user) => (
            <User key={user._id} user={user} />
          ))
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-3xl mb-2">🔍</div>

            <h2 className="text-lg font-semibold text-slate-600">
              No users found
            </h2>

            <p className="text-slate-500 mt-1">
              Try searching with another name or username.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};