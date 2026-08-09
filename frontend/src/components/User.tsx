import { useNavigate } from "react-router-dom"
interface userProps{
    user:{
        _id:string,
        firstName:string,
        lastName:string
    };
}
export const User=(props:userProps)=>{
    const navigate=useNavigate();

    return <div className="flex justify-between items-center bg-white rounded-xl shadow-md p-4 mb-4 hover:shadow-lg transition-all duration-300">
            <div className="flex">
                <div className="rounded-full h-12 w-12 bg-indigo-500 flex justify-center items-center text-white font-bold text-lg">
                    <div className="flex flex-col justify-center h-full text-xl">
                        {props.user.firstName[0].toUpperCase()}
                    </div>
                </div>

                <div className="ml-3">
                  <div className="font-semibold text-lg">
                          {props.user.firstName} {props.user.lastName}
                   </div>
                 </div>
            </div>

            <div className="flex flex-col justify-center h-full">
                <button
                    onClick={() => {
                        navigate(
                            "/send?id=" +
                            props.user._id +
                            "&name=" +
                            props.user.firstName
                        );
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg transition-colors duration-200 font-medium"
                >
                    Send Money
                </button>
            </div>
        </div>
}