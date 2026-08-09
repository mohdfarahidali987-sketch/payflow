
import { Heading } from "../components/Heading"
import { SubHeading } from "../components/SubHeading"
import { Button } from "../components/Button"
import { InputBox } from "../components/InputBox"
import { BottomWarning } from "../components/BottomWarning"
import { useState } from "react"
import toast from "react-hot-toast"
import axios from "axios"
 
import { api } from "../lib/api"
import { useNavigate } from "react-router-dom"
 

export const Signin=()=>{

const [loading, setLoading]=useState(false)
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const navigate = useNavigate();

async function handleSignin() {
    setLoading(true)
     
    try {
          const response=    await api.post(
                 "/api/v1/user/signin",
               {
                 username,
                  password
          }
         );
         

        localStorage.setItem("token", response.data.token);

        navigate("/dashboard");

    } 
    catch (err) {
    if (axios.isAxiosError(err)) {
        toast.error(
            err.response?.data?.message || "Something went wrong"
        );
    } else {
        toast.error("Something went wrong");
    }
}

    finally{
        setLoading(false)
    }
}

    return <div className="bg-slate-300 h-screen flex justify-center pt-10">
        <div className="flex flex-cols justify-center">
            <div className="rounded-lg bg-white w-80 text-center p-2 h-max px-4">
                <Heading label="Sign In"/>
                <SubHeading label="Enter your credentials to log In your account"/>
               
              
                 <InputBox label="Username"
                placeholder="John@gamil.com"
                onChange={(e)=>{
                    setUsername(e.target.value)
                }}
                />
                 <InputBox label="password"
                placeholder="********"
                onChange={(e)=>{
                    setPassword(e.target.value)
                }}
                />
                <Button
                     label={loading ? "Signing In..." : "Sign In"}
                     onClick={handleSignin}
                     disabled={loading}
/>
                <BottomWarning
                    label="Don't have an account?"
                   buttonText="Sign Up"
                   to="/signup"
                       />
                



            </div>

        </div>
         
         
    </div>
}