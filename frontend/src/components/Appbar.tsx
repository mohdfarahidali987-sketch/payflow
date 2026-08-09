import { useNavigate } from "react-router-dom"
import appLogo from "./applogo.png";
interface appbarprops{
    firstName:string
}
export const Appbar=(props:appbarprops)=>{
    const navigate=useNavigate();
     return (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between px-4 md:px-8 py-4 border-b border-slate-200 bg-white shadow-sm gap-4">

    {/* Left Section */}
    <div className="flex items-center gap-3 justify-center md:justify-start">
      <img
        src={appLogo}
        className="w-10 h-10 md:w-12 md:h-12"
        alt="logo"
      />

      <h1 className="text-2xl md:text-4xl font-bold text-slate-900">
        PayFlow
      </h1>
    </div>

    {/* Right Section */}
    <div className="flex items-center justify-center md:justify-end gap-3">

      <div className="rounded-full h-10 w-10 md:h-12 md:w-12 bg-slate-200 flex items-center justify-center text-lg font-semibold">
        {props.firstName[0]?.toUpperCase()}
      </div>

      <button
        onClick={() => {
          localStorage.removeItem("token");
          navigate("/signin");
        }}
        className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition duration-300 shadow-md"
      >
        Logout
      </button>
    </div>
  </div>
);
}