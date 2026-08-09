import { useNavigate } from "react-router-dom"
import appLogo from "./applogo.png";
interface appbarprops{
    firstName:string
}
export const Appbar=(props:appbarprops)=>{
    const navigate=useNavigate();
    return <div className="bg-white shadow-md rounded-2xl px-8 py-5 flex justify-between items-center">
             <div className="flex items-center gap-3">

        <img
            src={appLogo}
            className="w-12 h-12"
            alt="logo"
        />

        <h1 className="text-4xl font-bold text-slate-900">
            Payflow
        </h1>

    </div>

            <div className="flex items-center gap-6">
                <div className="flex flex-col justify-center h-full mr-4">
                     
                </div>

                <div className="rounded-full h-12 w-12 bg-slate-200 flex justify-center mt-1 mr-2">
                    <div className="flex flex-col justify-center h-full text-xl">
                        {props.firstName[0]?.toUpperCase()}
                        
                    </div>
                    
                </div>

                <button

                       onClick={() => {
                                localStorage.removeItem("token");
                                navigate("/signin");
                             }}
                                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition duration-300 shadow-md pr-4"
        >
            Logout
      
                </button>
            </div>
        </div>
}