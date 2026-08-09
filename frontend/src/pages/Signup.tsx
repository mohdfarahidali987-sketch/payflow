
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
 

export const Signup=()=>{
    const [loading, setLoading]=useState(false)
    const [firstName, setFisrtName]=useState("")
    const [lastName, setLastName] = useState("");
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const nevigate=useNavigate();
console.log({
    firstName,
    lastName,
    username,
    password
});
async function handleSignup(){
    setLoading(true);

    try{
        const response=await api.post("/api/v1/user/signup",{
            username, password, firstName, lastName
        });
        localStorage.setItem("token",response.data.token);
        nevigate("/dashboard")
        console.log(response.data)
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
                <Heading label="Sign Up"/>
                <SubHeading label="Enter your credentials to create an account"/>
                <InputBox label="First Name"
                placeholder="John"
                onChange={(e)=>{
                    setFisrtName(e.target.value)
                }}

                />
                  <InputBox label="Last Name"
                placeholder="John"
                onChange={(e)=>{
                    setLastName(e.target.value)
                }}
                
                />
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
    label={loading ? "Signing Up..." : "Sign Up"}
    onClick={handleSignup}
    disabled={loading}
/>
                <BottomWarning label="Already have an account"
                buttonText="Sign In"
                to="/signin"
                />
                



            </div>

        </div>
         
         
    </div>
}