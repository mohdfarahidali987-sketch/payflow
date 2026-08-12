import { useNavigate } from "react-router-dom";

interface userProps {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

export const User = (props: userProps) => {
  const navigate = useNavigate();

  const fullName = `${props.user.firstName} ${props.user.lastName}`;
  const initial = props.user.firstName?.[0]?.toUpperCase() || "?";

  return (
    <div
      className="
        group flex flex-col sm:flex-row sm:items-center sm:justify-between
        gap-4
        bg-white
        border border-slate-200
        rounded-2xl
        p-4 sm:p-5
        shadow-sm
        hover:shadow-md
        hover:border-indigo-200
        transition-all duration-200
      "
    >
      {/* User Information */}
      <div className="flex items-center min-w-0">
        {/* Avatar */}
        <div
          className="
            flex-shrink-0
            h-12 w-12 sm:h-14 sm:w-14
            rounded-full
            bg-gradient-to-br from-indigo-500 to-blue-600
            flex items-center justify-center
            text-white
            font-bold
            text-lg sm:text-xl
            shadow-sm
          "
        >
          {initial}
        </div>

        {/* Name + Username */}
        <div className="ml-4 min-w-0">
          <div className="font-semibold text-base sm:text-lg text-slate-900 truncate">
            {fullName}
          </div>

          <div className="text-sm text-slate-500 truncate mt-0.5">
            @{props.user.username}
          </div>
        </div>
      </div>

      {/* Send Money */}
      <button
        onClick={() => {
          navigate(
            "/send?id=" +
              props.user._id +
              "&name=" +
              props.user.firstName
          );
        }}
        className="
          w-full sm:w-auto
          bg-gradient-to-r from-indigo-600 to-blue-600
          hover:from-indigo-700 hover:to-blue-700
          active:scale-[0.98]
          text-white
          px-6 py-2.5
          rounded-xl
          font-semibold
          shadow-sm
          hover:shadow-md
          transition-all duration-200
        "
      >
        Send Money
      </button>
    </div>
  );
};